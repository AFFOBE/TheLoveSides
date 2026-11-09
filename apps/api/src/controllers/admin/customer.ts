import type { Request, Response, NextFunction } from 'express';
import { User } from '../../models/User.js';
import { Order } from '../../models/Order.js';
import { sendSuccess, sendPaginated } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';

function escapeRegex(str: string): string {
  return str.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

/**
 * List customers (admin) with pagination and search.
 */
export async function listCustomers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 1000;
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = { deletedAt: null };

    if (req.query.search) {
      const tokens = String(req.query.search).trim().split(/\s+/).filter(Boolean);
      // Each token must match at least one field, so "gk thakur" finds the
      // customer whose firstName is "gk" and lastName is "thakur".
      query.$and = tokens.map((t) => {
        const regex = new RegExp(escapeRegex(t), 'i');
        return {
          $or: [
            { email: regex },
            { firstName: regex },
            { lastName: regex },
            { phone: regex },
          ],
        };
      });
    }

    if (req.query.isActive !== undefined) {
      query.isActive = req.query.isActive === 'true';
    }

    const [customers, total] = await Promise.all([
      User.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-__v')
        .lean(),
      User.countDocuments(query),
    ]);

    // Phone fallback: guest checkout users often have no phone on their
    // account — take it from their most recent order's shipping address.
    const userIds = customers.map((c) => c._id);
    if (userIds.length > 0) {
      const recentOrders = await Order.find({ userId: { $in: userIds } })
        .sort({ createdAt: -1 })
        .select('userId shippingAddress.phone')
        .lean();
      const phoneByUser = new Map<string, string>();
      for (const o of recentOrders) {
        const uid = String(o.userId);
        const phone = (o.shippingAddress as { phone?: string } | undefined)?.phone;
        if (!phoneByUser.has(uid) && phone) {
          phoneByUser.set(uid, phone);
        }
      }
      for (const c of customers) {
        if (!c.phone) {
          const fallback = phoneByUser.get(String(c._id));
          if (fallback) (c as { phone?: string }).phone = fallback;
        }
      }
    }

    sendPaginated(res, customers, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPreviousPage: page > 1,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get single customer detail (admin) with order summary.
 */
export async function getCustomerById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const customer = await User.findById(id).select('-__v').lean();
    if (!customer) {
      throw ApiError.notFound('Customer');
    }

    // Get order summary
    const [orderCount, totalSpent] = await Promise.all([
      Order.countDocuments({ userId: id, status: { $ne: 'CANCELLED' } }),
      Order.aggregate([
        { $match: { userId: customer._id, status: { $nin: ['CANCELLED', 'REFUNDED', 'PENDING_PAYMENT', 'PAYMENT_FAILED'] } } },
        { $group: { _id: null, total: { $sum: '$grandTotal' } } },
      ]),
    ]);

    sendSuccess({
      res,
      data: {
        ...customer,
        orderCount,
        totalSpent: totalSpent[0]?.total || 0,
      },
    });
  } catch (error) {
    next(error);
  }
}
