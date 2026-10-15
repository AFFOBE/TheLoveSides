import type { Request, Response, NextFunction } from 'express';
import { Cart } from '../../models/Cart.js';
import { sendSuccess } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';
import { previewCoupon } from '../../services/pricing.service.js';

/**
 * Validates a coupon code against the current cart and returns the discount preview.
 *
 * The actual discount is always recalculated server-side at order creation
 * (see order.service -> calculateCartPricing); this endpoint only powers the
 * live preview shown on the checkout page.
 */
export async function validateCoupon(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { couponCode } = req.body;

    const ownerQuery = req.cartOwner.type === 'user'
      ? { userId: req.cartOwner.id }
      : { guestId: req.cartOwner.id };

    const cart = await Cart.findOne(ownerQuery).lean();
    const items = cart?.items || [];

    if (items.length === 0) {
      throw ApiError.badRequest('Your cart is empty', 'EMPTY_CART');
    }

    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const result = await previewCoupon(couponCode, subtotal, req.user?.id);

    sendSuccess({ res, data: result, message: 'Coupon applied' });
  } catch (error) {
    next(error);
  }
}
