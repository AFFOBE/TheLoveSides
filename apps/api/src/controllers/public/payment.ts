import type { Request, Response, NextFunction } from 'express';
import { Order } from '../../models/Order.js';
import { Payment } from '../../models/Payment.js';
import { Cart } from '../../models/Cart.js';
import { createPaymentOrder, verifyPaymentSignature } from '../../integrations/razorpay/razorpay.service.js';
import { transitionOrderStatus } from '../../services/order.service.js';
import { sendOrderConfirmationEmail } from '../../services/invoice.service.js';
import { User } from '../../models/User.js';
import { sendSuccess } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';
import { logger } from '../../utils/logger.js';
import { env } from '../../config/env.js';

/**
 * Creates a Razorpay Order ID for a pending order in our database.
 */
export async function createRazorpayOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { orderId } = req.params;

    // Verify ownership and status
    const query: any = { _id: orderId };
    if (req.user) query.userId = req.user.id;

    const order = await Order.findOne(query);

    if (!order) {
      throw ApiError.notFound('Order not found');
    }

    if (order.status !== 'PENDING_PAYMENT') {
      throw ApiError.badRequest('Order is not in pending state');
    }

    // Call Razorpay API
    const rpOrder = await createPaymentOrder({
      amount: order.grandTotal,
      receiptId: order.orderNumber,
      notes: { orderId: order.id, userId: order.userId.toString() },
    });

    // Update order with razorpayOrderId (we can store this in payment model later or just return it)
    sendSuccess({
      res,
      data: {
        id: rpOrder.id,
        amount: rpOrder.amount,
        currency: rpOrder.currency,
        keyId: env.RAZORPAY_KEY_ID, // Provide the public key to the frontend
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Verifies the payment signature returned by the frontend after a successful Razorpay checkout.
 */
export async function verifyPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { orderId } = req.params;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw ApiError.badRequest('Missing payment verification details');
    }

    // Verify ownership and status
    const query: any = { _id: orderId };
    if (req.user) query.userId = req.user.id;

    const order = await Order.findOne(query);

    if (!order) {
      throw ApiError.notFound('Order not found');
    }

    if (order.status !== 'PENDING_PAYMENT') {
      throw ApiError.badRequest('Order is not in pending state');
    }

    // Verify Signature
    const isValid = verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
    
    if (!isValid) {
      logger.warn({ orderId, razorpay_payment_id }, 'Invalid payment signature received');
      throw ApiError.badRequest('Invalid payment signature');
    }

    // Record Payment
    await Payment.create([{
      orderId: order._id,
      userId: order.userId,
      amount: order.grandTotal,
      currency: 'INR',
      provider: 'RAZORPAY',
      razorpayPaymentId: razorpay_payment_id,
      razorpayOrderId: razorpay_order_id,
      razorpaySignature: razorpay_signature,
      status: 'CAPTURED',
      method: 'ONLINE', // We can refine this via webhook later
    }]);

    await transitionOrderStatus(
      order.id,
      'PAID',
      'Payment successful, order confirmed',
      order.userId.toString()
    );

    // Send order confirmation email with invoice (non-blocking)
    try {
      const user = await User.findById(order.userId);
      if (user?.email) {
        await sendOrderConfirmationEmail(order.id, user.email);
      }
    } catch (err) {
      logger.error({ err, orderId: order.id }, 'Error sending order confirmation email');
    }

    // Clear the cart since checkout is successful
    if (req.cartOwner) {
      await Cart.findOneAndUpdate(
        { 
          $or: [
            { userId: order.userId },
            { guestId: req.cartOwner.id }
          ] 
        },
        { $set: { items: [], couponCode: null } }
      );
    }

    sendSuccess({ res, message: 'Payment verified and order confirmed' });
  } catch (error) {
    next(error);
  }
}
