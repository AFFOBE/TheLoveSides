import type { Request, Response, NextFunction } from 'express';
import { ApiError } from '../../utils/ApiError.js';
import { sendSuccess } from '../../utils/ApiResponse.js';
import { createOrderFromCart } from '../../services/order.service.js';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../../models/User.js';
import { Role } from '../../models/Role.js';

/**
 * Initiates checkout by converting a Cart to a pending Order.
 *
 * Flow:
 * 1. Validates cart has items
 * 2. Recalculates pricing server-side
 * 3. Validates inventory (atomic reservation)
 * 4. Creates order with PENDING_PAYMENT status
 * 5. Returns order ID for payment initiation
 *
 * The cart is NOT deleted at this point — only after payment succeeds.
 */
export async function initiateCheckout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, shippingAddress, billingAddress, couponCode, customerNotes, shippingMethod } = req.body;

    let userId = req.user?.id;

    if (!userId) {
      if (!email) {
        throw ApiError.badRequest('Email is required for guest checkout');
      }
      
      // Auto-create or find user for guest checkout
      let user = await User.findOne({ email });
      if (!user) {
        const customerRole = await Role.findOne({ name: 'Customer' });
        
        user = await User.create({
          email,
          firstName: shippingAddress?.firstName || 'Guest',
          lastName: shippingAddress?.lastName || 'User',
          phone: shippingAddress?.phone || undefined,
          role: customerRole?._id,
        });
      } else {
        // If user exists but is missing names or phone, update them
        if (!user.firstName && shippingAddress?.firstName) user.firstName = shippingAddress.firstName;
        if (!user.lastName && shippingAddress?.lastName) user.lastName = shippingAddress.lastName;
        if (!user.phone && shippingAddress?.phone) user.phone = shippingAddress.phone;
        await user.save();
      }
      userId = user.id;
    } else {
      // Authenticated user checkout
      const user = await User.findById(userId);
      if (user) {
        let updated = false;
        if (!user.firstName && shippingAddress?.firstName) {
          user.firstName = shippingAddress.firstName;
          updated = true;
        }
        if (!user.lastName && shippingAddress?.lastName) {
          user.lastName = shippingAddress.lastName;
          updated = true;
        }
        if (!user.phone && shippingAddress?.phone) {
          user.phone = shippingAddress.phone;
          updated = true;
        }
        if (updated) await user.save();
      }
    }

    // Generate idempotency key to prevent duplicate orders from double-clicks
    const idempotencyKey = req.headers['x-idempotency-key'] as string || uuidv4();

    const order = await createOrderFromCart({
      userId: userId as string,
      cartOwner: req.cartOwner,
      shippingAddress,
      billingAddress,
      couponCode,
      customerNotes,
      idempotencyKey,
      shippingMethod,
    });

    sendSuccess({
      res,
      statusCode: 201,
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        grandTotal: order.grandTotal,
        currency: order.currency,
      },
      message: 'Order created. Proceed to payment.',
    });
  } catch (error) {
    next(error);
  }
}
