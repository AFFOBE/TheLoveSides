import type { Request, Response, NextFunction } from 'express';
import { Coupon } from '../../models/Coupon.js';
import { sendSuccess, sendPaginated } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';
import { createAuditLog } from '../../services/audit.service.js';

function escapeRegex(str: string): string {
  return str.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

export async function listCoupons(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 1000;
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};
    if (req.query.search) {
      const s = String(req.query.search).trim();
      if (s) query.code = { $regex: escapeRegex(s), $options: 'i' };
    }

    const [coupons, total] = await Promise.all([
      Coupon.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Coupon.countDocuments(query),
    ]);

    sendPaginated(res, coupons, {
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

export async function createCoupon(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const coupon = await Coupon.create(req.body);

    await createAuditLog({
      action: 'coupon.create',
      resource: 'Coupon',
      resourceId: coupon.id,
      details: { code: coupon.code },
      req,
    });

    sendSuccess({ res, data: coupon, message: 'Coupon created successfully', statusCode: 201 });
  } catch (error) {
    next(error);
  }
}

export async function updateCoupon(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;

    const coupon = await Coupon.findByIdAndUpdate(id, req.body, { new: true });
    if (!coupon) {
      throw ApiError.notFound('Coupon not found');
    }

    await createAuditLog({
      action: 'coupon.update',
      resource: 'Coupon',
      resourceId: coupon.id,
      details: { updates: Object.keys(req.body) },
      req,
    });

    sendSuccess({ res, data: coupon, message: 'Coupon updated successfully' });
  } catch (error) {
    next(error);
  }
}

export async function deleteCoupon(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;

    const coupon = await Coupon.findByIdAndDelete(id);
    if (!coupon) {
      throw ApiError.notFound('Coupon not found');
    }

    await createAuditLog({
      action: 'coupon.delete',
      resource: 'Coupon',
      resourceId: id,
      details: { code: coupon.code },
      req,
    });

    sendSuccess({ res, message: 'Coupon deleted successfully' });
  } catch (error) {
    next(error);
  }
}
