import type { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Order, type OrderStatus } from '../../models/Order.js';
import { User } from '../../models/User.js';
import { Payment } from '../../models/Payment.js';
import { Shipment } from '../../models/Shipment.js';
import { Return } from '../../models/Return.js';
import { Refund } from '../../models/Refund.js';
import { transitionOrderStatus, cancelOrder } from '../../services/order.service.js';
import { generateInvoicePDF } from '../../services/invoice.service.js';
import { createAuditLog } from '../../services/audit.service.js';
import { sendSuccess, sendPaginated } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';
import { logger } from '../../utils/logger.js';

function escapeRegex(str: string): string {
  return str.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

// Statuses where the payment went through successfully. Used for all
// dashboard totals so unpaid/failed/refunded orders are never counted.
export const PAID_STATUSES = [
  'PAID', 'PROCESSING', 'READY_TO_SHIP', 'SHIPPED',
  'OUT_FOR_DELIVERY', 'DELIVERED', 'RETURN_REQUESTED', 'RETURNED', 'RTO',
] as const;

/**
 * List all orders (admin) with filters and pagination.
 */
export async function listOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 1000;
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};

    if (req.query.status) query.status = req.query.status;
    // Comma-separated list, e.g. statuses=PAID,PROCESSING,SHIPPED
    if (req.query.statuses) {
      const statuses = String(req.query.statuses).split(',').map(s => s.trim()).filter(Boolean);
      if (statuses.length > 0) query.status = { $in: statuses };
    }
    if (req.query.userId) query.userId = req.query.userId;
    if (req.query.orderNumber) query.orderNumber = { $regex: req.query.orderNumber, $options: 'i' };

    if (req.query.search) {
      const s = String(req.query.search).trim().replace(/^#/, '');
      if (s) {
        // Date search: YYYY-MM-DD or DD/MM/YYYY → orders created that day
        const isoDate = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
        const dmyDate = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
        const parsedDate = isoDate
          ? new Date(+isoDate[1], +isoDate[2] - 1, +isoDate[3])
          : dmyDate
            ? new Date(+dmyDate[3], +dmyDate[2] - 1, +dmyDate[1])
            : null;

        if (parsedDate && !isNaN(parsedDate.getTime())) {
          const dayEnd = new Date(parsedDate);
          dayEnd.setDate(dayEnd.getDate() + 1);
          query.createdAt = { $gte: parsedDate, $lt: dayEnd };
        } else if (mongoose.Types.ObjectId.isValid(s) && s.length === 24) {
          query._id = new mongoose.Types.ObjectId(s);
        } else {
          const tokens = s.split(/\s+/).filter(Boolean);
          // Every token must match the order number, the customer on the
          // shipping address, or the linked customer account.
          const perToken = await Promise.all(
            tokens.map(async (t) => {
              const regex = new RegExp(escapeRegex(t), 'i');
              const users = await User.find({
                $or: [{ email: regex }, { firstName: regex }, { lastName: regex }, { phone: regex }],
              })
                .select('_id')
                .lean();
              return {
                $or: [
                  { orderNumber: regex },
                  { 'shippingAddress.fullName': regex },
                  { 'shippingAddress.phone': regex },
                  { userId: { $in: users.map((u: any) => u._id) } },
                ],
              };
            }),
          );
          query.$and = perToken;
        }
      }
    }

    // Date range filters
    if (req.query.from || req.query.to) {
      query.createdAt = {};
      if (req.query.from) (query.createdAt as Record<string, unknown>)['$gte'] = new Date(req.query.from as string);
      if (req.query.to) (query.createdAt as Record<string, unknown>)['$lte'] = new Date(req.query.to as string);
    }

    const [orders, total] = await Promise.all([
      Order.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'email firstName lastName phone')
        .lean(),
      Order.countDocuments(query),
    ]);

    sendPaginated(res, orders, {
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
 * Get single order detail (admin) with payment, shipment, returns, refunds.
 */
export async function getOrderById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;

    const order = await Order.findById(id)
      .populate('userId', 'email firstName lastName phone')
      .select('+adminNotes')
      .lean();

    if (!order) {
      throw ApiError.notFound('Order');
    }

    // Fetch related records in parallel
    const [payments, shipments, returns, refunds] = await Promise.all([
      Payment.find({ orderId: id }).lean(),
      Shipment.find({ orderId: id }).lean(),
      Return.find({ orderId: id }).lean(),
      Refund.find({ orderId: id }).lean(),
    ]);

    sendSuccess({
      res,
      data: {
        ...order,
        payments,
        shipments,
        returns,
        refunds,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update order status (admin).
 */
export async function updateOrderStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    const { status, message } = req.body;

    await transitionOrderStatus(id, status as OrderStatus, (message as string) || `Status changed to ${status}`, req.user?.id);

    await createAuditLog({
      action: 'order.status_update',
      resource: 'Order',
      resourceId: id,
      details: { newStatus: status, message: message as string },
      req,
    });

    const updatedOrder = await Order.findById(id).lean();
    sendSuccess({ res, data: updatedOrder, message: `Order status updated to ${status}` });
  } catch (error) {
    next(error);
  }
}

/**
 * Cancel order (admin).
 */
export async function adminCancelOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    const { reason } = req.body;

    await cancelOrder(id, (reason as string) || 'Cancelled by admin', req.user?.id);

    await createAuditLog({
      action: 'order.cancel',
      resource: 'Order',
      resourceId: id,
      details: { reason: reason as string },
      req,
    });

    sendSuccess({ res, message: 'Order cancelled successfully' });
  } catch (error) {
    next(error);
  }
}

/**
 * Add admin note to order.
 */
export async function addOrderNote(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    const { note } = req.body;

    const order = await Order.findByIdAndUpdate(
      id,
      { adminNotes: note },
      { new: true },
    ).select('+adminNotes');

    if (!order) {
      throw ApiError.notFound('Order');
    }

    sendSuccess({ res, data: order, message: 'Note added' });
  } catch (error) {
    next(error);
  }
}

/**
 * Get dashboard stats (admin).
 * Order/revenue totals are ALL-TIME and only count payment-successful
 * orders. `period` only controls the daily revenue chart window
 * (default: all time).
 */
export async function getDashboardStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Chart window from query (does NOT affect totals)
    const period = (req.query.period as string) || 'all';
    let chartDateFilter: Record<string, unknown> = {};
    if (period === 'today') chartDateFilter = { createdAt: { $gte: todayStart } };
    else if (period === '7d') chartDateFilter = { createdAt: { $gte: sevenDaysAgo } };
    else if (period === '30d') chartDateFilter = { createdAt: { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } };
    else if (period === '90d') chartDateFilter = { createdAt: { $gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) } };

    const paidFilter = { status: { $in: [...PAID_STATUSES] } };

    const [
      totalOrders,
      pendingOrders,
      cancelledOrders,
      revenueResult,
      todayOrders,
      revenueByDayResult
    ] = await Promise.all([
      // All-time paid orders only
      Order.countDocuments(paidFilter),
      Order.countDocuments({ status: 'PENDING_PAYMENT' }),
      Order.countDocuments({ status: 'CANCELLED' }),
      // All-time revenue from payment-successful orders
      Order.aggregate([
        { $match: paidFilter },
        { $group: { _id: null, total: { $sum: '$grandTotal' }, count: { $sum: 1 } } },
      ]),
      Order.countDocuments({ createdAt: { $gte: todayStart } }),
      Order.aggregate([
        { $match: { ...paidFilter, ...chartDateFilter } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            revenue: { $sum: '$grandTotal' }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    const revenue = revenueResult[0]?.total || 0;
    const paidCount = revenueResult[0]?.count || 0;
    const aov = paidCount > 0 ? Math.round(revenue / paidCount) : 0;

    const revenueByDay = revenueByDayResult.map(item => ({
      date: item._id, // YYYY-MM-DD format
      revenue: item.revenue
    }));

    sendSuccess({
      res,
      data: {
        period,
        totalOrders,
        pendingOrders,
        cancelledOrders,
        revenue,
        averageOrderValue: aov,
        todayOrders,
        revenueByDay
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Manually trigger shipment creation in Shiprocket (Admin).
 */
export async function createShipment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    
    const order = await Order.findById(id);
    if (!order) {
      throw ApiError.notFound('Order');
    }

    if (order.status !== 'PAID' && order.status !== 'PROCESSING') {
      throw ApiError.badRequest('Order must be PAID or PROCESSING to create a shipment');
    }

    // Process shipment creation synchronously
    const { User } = await import('../../models/User.js');
    const { createShiprocketOrder } = await import('../../integrations/shiprocket/shiprocket.service.js');
    
    const user = await User.findById(order.userId);
    if (!user) {
      throw ApiError.notFound('User associated with order not found');
    }

    let defaultWeight = 0.5;
    try {
      const { Setting } = await import('../../models/Setting.js');
      const setting = await Setting.findOne({ key: 'shiprocket.default_weight' }).lean();
      if (setting && setting.value) {
        defaultWeight = parseFloat(String(setting.value)) || 0.5;
      }
    } catch (error) {
      // Ignore db error for settings
    }

    const shiprocketResponse = await createShiprocketOrder(order, user.email, defaultWeight);

    // Auto-assign AWB if Shiprocket didn't return one (AWB is required for pickup/label/track)
    let awbCode: string | null = shiprocketResponse.awb_code || null;
    let courierName: string | null = shiprocketResponse.courier_name || null;
    let courierId: number | undefined = shiprocketResponse.courier_company_id
      ? parseInt(shiprocketResponse.courier_company_id)
      : undefined;
    let shipmentStatus: 'CREATED' | 'AWB_ASSIGNED' = awbCode ? 'AWB_ASSIGNED' : 'CREATED';
    let awbErrorMessage: string | null = null;

    if (!awbCode) {
      try {
        const { assignAwbSmart } = await import('../../integrations/shiprocket/shiprocket.service.js');
        const awbResponse: any = await assignAwbSmart(shiprocketResponse.order_id, shiprocketResponse.shipment_id);
        const assignedAwb = awbResponse?.awb_code || awbResponse?.data?.awb_code || null;
        if (assignedAwb) {
          awbCode = assignedAwb;
          courierName = awbResponse?.courier_name || awbResponse?.data?.courier_name || courierName;
          const assignedCourierId = awbResponse?.courier_company_id || awbResponse?.data?.courier_company_id;
          if (assignedCourierId) {
            courierId = parseInt(String(assignedCourierId));
          }
          shipmentStatus = 'AWB_ASSIGNED';
        } else {
          awbErrorMessage = awbResponse?.message || 'AWB not assigned';
          logger.warn(
            { orderId: order.id, message: awbErrorMessage },
            'AWB not auto-assigned; can be retried from the order page'
          );
        }
      } catch (awbError) {
        awbErrorMessage = awbError instanceof Error ? awbError.message : 'AWB assignment failed';
        logger.error(
          { err: awbError, orderId: order.id },
          'Auto AWB assignment failed; can be retried from the order page'
        );
      }
    }

    // Save Shipment record
    await Shipment.create({
      orderId: order._id,
      shiprocketOrderId: shiprocketResponse.order_id.toString(),
      shiprocketShipmentId: shiprocketResponse.shipment_id.toString(),
      status: shipmentStatus,
      awbCode,
      courierName,
      courierId,
    });

    if (order.status === 'PAID') {
      await transitionOrderStatus(
        order.id,
        'PROCESSING',
        `Shipment created at Shiprocket (Order ID: ${shiprocketResponse.order_id})`,
        req.user?.id
      );
    }

    await createAuditLog({
      action: 'order.shipment_trigger',
      resource: 'Order',
      resourceId: id,
      details: { shiprocketOrderId: shiprocketResponse.order_id },
      req,
    });

    sendSuccess({
      res,
      data: { awbCode, awbError: awbErrorMessage },
      message: awbCode
        ? 'Shipment created and AWB assigned successfully'
        : `Shipment created, but AWB failed${awbErrorMessage ? `: ${awbErrorMessage}` : ' — use "Generate AWB"'}.`,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Admin downloads an order invoice.
 */
export async function downloadAdminInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    
    const order = await Order.findById(id).lean();
    if (!order) {
      throw ApiError.notFound('Order');
    }

    const pdfBuffer = await generateInvoicePDF(id);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Invoice-${order.orderNumber}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
}
