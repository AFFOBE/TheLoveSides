import mongoose from 'mongoose';
import { Order, type OrderStatus, type IOrderTimeline } from '../models/Order.js';
import { Cart } from '../models/Cart.js';
import { CouponUsage } from '../models/Coupon.js';
import { Coupon } from '../models/Coupon.js';
import { generateOrderNumber } from '../utils/orderNumber.js';
import { calculateCartPricing, validateCartInventory, type CartPricing, type PricedItem } from './pricing.service.js';
import { reserveInventory, releaseReservation, confirmReservation } from './inventory.service.js';
import {
  sendShippedEmail,
  sendOutForDeliveryEmail,
  sendDeliveredEmail,
  sendOrderCancelledEmail,
  sendRtoEmail,
} from './notification.service.js';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';

/**
 * Valid order status transitions. Prevents invalid state changes.
 */
const VALID_TRANSITIONS: Record<string, OrderStatus[]> = {
  PENDING_PAYMENT: ['PAID', 'PAYMENT_FAILED', 'CANCELLED'],
  PAYMENT_FAILED: ['PENDING_PAYMENT', 'CANCELLED'],
  PAID: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['READY_TO_SHIP', 'CANCELLED'],
  READY_TO_SHIP: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['OUT_FOR_DELIVERY', 'RTO'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'RTO'],
  DELIVERED: ['RETURN_REQUESTED'],
  RETURN_REQUESTED: ['RETURNED', 'DELIVERED'],
  RETURNED: ['REFUNDED'],
  CANCELLED: [],
  REFUNDED: [],
  RTO: [],
};

/**
 * Normalizes a phone number to its last 10 digits so that differently
 * formatted numbers (spaces, +91, dashes) can be compared reliably.
 */
function normalizePhone(phone?: string): string {
  return (phone || '').replace(/\D/g, '').slice(-10);
}

/**
 * Builds a stable signature for a set of cart/order items so two carts can be
 * compared. Order-independent (sorted) and only considers variant + quantity.
 */
function itemsSignature(
  items: Array<{ variantId: string; quantity: number }>,
): string {
  return items
    .map((item) => `${item.variantId}:${item.quantity}`)
    .sort()
    .join('|');
}

/**
 * Builds an order address snapshot with the correct field names from the
 * checkout payload.
 */
function buildOrderAddress(addr: any) {
  return {
    fullName: `${addr.firstName} ${addr.lastName}`.trim(),
    phone: addr.phone,
    addressLine1: addr.addressLine1,
    addressLine2: addr.addressLine2,
    city: addr.city,
    state: addr.state,
    pincode: addr.postalCode || addr.pincode,
    country: addr.country || 'India',
    landmark: addr.landmark,
  };
}

/**
 * Finds an existing unpaid (PENDING_PAYMENT) order belonging to the same
 * customer (userId, derived from email) and phone number whose items exactly
 * match the current cart. Used to resume an abandoned order instead of
 * creating a duplicate. Returns null when there is no match.
 */
async function findReusablePendingOrder(
  userId: string,
  normalizedPhone: string,
  pricedItems: PricedItem[],
) {
  const pendingOrders = await Order.find({
    userId,
    status: { $in: ['PENDING_PAYMENT', 'PAYMENT_FAILED'] },
  });

  if (pendingOrders.length === 0) return null;

  const targetSignature = itemsSignature(
    pricedItems.map((item) => ({ variantId: item.variantId, quantity: item.quantity })),
  );

  return (
    pendingOrders.find((order) => {
      if (normalizePhone(order.shippingAddress?.phone) !== normalizedPhone) {
        return false;
      }

      const signature = itemsSignature(
        order.items.map((item) => ({
          variantId: item.variantId.toString(),
          quantity: item.quantity,
        })),
      );

      return signature === targetSignature;
    }) || null
  );
}

interface CreateOrderInput {
  userId: string;
  cartOwner: { type: 'user' | 'guest'; id: string };
  shippingAddress: any;
  billingAddress?: any;
  couponCode?: string;
  customerNotes?: string;
  idempotencyKey?: string;
  shippingMethod?: {
    courierId: number;
    courierName: string;
    rate: number;
  };
}

/**
 * Creates an order from the user's cart with full inventory reservation.
 *
 * Flow:
 * 1. Fetch & validate cart
 * 2. Calculate server-side pricing
 * 3. Validate inventory
 * 4. Generate order number
 * 5. Create order with PENDING_PAYMENT status
 * 6. Reserve inventory atomically
 * 7. Record coupon usage
 *
 * Returns the created order.
 */
export async function createOrderFromCart(input: CreateOrderInput) {
  // Idempotency check
  if (input.idempotencyKey) {
    const existing = await Order.findOne({ idempotencyKey: input.idempotencyKey }).lean();
    if (existing) {
      logger.info({ idempotencyKey: input.idempotencyKey }, 'Duplicate order creation prevented');
      return existing;
    }
  }

  try {
    // 1. Fetch cart
    const cartOwnerQuery = input.cartOwner.type === 'user' 
      ? { userId: input.cartOwner.id } 
      : { guestId: input.cartOwner.id };

    const cart = await Cart.findOne(cartOwnerQuery);
    if (!cart || !cart.items || cart.items.length === 0) {
      throw ApiError.badRequest('Cart is empty');
    }

    // 2. Validate inventory
    await validateCartInventory(cart.items);

    // 3. Calculate server-side pricing
    const pricing: CartPricing = await calculateCartPricing(
      cart.items,
      input.couponCode || cart.couponCode || undefined,
      input.userId,
      input.shippingMethod,
      input.shippingAddress?.country || 'India'
    );

    if (pricing.items.length === 0) {
      throw ApiError.badRequest('No purchasable items in cart');
    }

    // 4. Build address snapshots with correct field names
    const shippingAddress = buildOrderAddress(input.shippingAddress);

    const billingAddress = input.billingAddress
      ? buildOrderAddress(input.billingAddress)
      : shippingAddress;

    // 5. Reuse an existing unpaid (PENDING_PAYMENT) order when the same
    // customer (email/userId) + phone number returns with the exact same cart.
    // This resumes the abandoned order instead of creating a duplicate.
    const normalizedPhone = normalizePhone(input.shippingAddress?.phone);
    if (normalizedPhone) {
      const reusable = await findReusablePendingOrder(
        input.userId,
        normalizedPhone,
        pricing.items,
      );

      if (reusable) {
        reusable.status = 'PENDING_PAYMENT' as OrderStatus;
        reusable.shippingAddress = shippingAddress;
        reusable.billingAddress = billingAddress;
        reusable.subtotal = pricing.subtotal;
        reusable.discountAmount = pricing.discountAmount;
        reusable.couponCode = pricing.couponCode;
        reusable.taxAmount = pricing.taxAmount;
        reusable.shippingAmount = pricing.shippingAmount;
        reusable.grandTotal = pricing.grandTotal;
        if (input.customerNotes) reusable.customerNotes = input.customerNotes;
        reusable.timeline.push({
          status: 'PENDING_PAYMENT',
          message: 'Existing unpaid order resumed for payment',
          timestamp: new Date(),
        } as IOrderTimeline);

        await reusable.save();

        logger.info(
          { orderId: reusable._id, orderNumber: reusable.orderNumber, userId: input.userId },
          'Reused existing pending order for retry (same cart)',
        );

        return reusable;
      }
    }

    // 6. Generate order number
    const orderNumber = await generateOrderNumber();

    // 7. Build order item snapshots
    const orderItems = pricing.items.map((item) => ({
      productId: new mongoose.Types.ObjectId(item.variantId.split('').length ? item.productId : item.productId),
      variantId: new mongoose.Types.ObjectId(item.variantId),
      name: item.name,
      sku: item.sku,
      image: item.image,
      attributes: item.attributes,
      price: item.unitPrice,
      quantity: item.quantity,
      tax: item.tax,
      discount: item.discount,
      total: item.total,
    }));

    // 8. Create order
    const [order] = await Order.create([{
      orderNumber,
      userId: input.userId,
      items: orderItems,
      shippingAddress,
      billingAddress,
      subtotal: pricing.subtotal,
      discountAmount: pricing.discountAmount,
      couponCode: pricing.couponCode,
      taxAmount: pricing.taxAmount,
      shippingAmount: pricing.shippingAmount,
      grandTotal: pricing.grandTotal,
      currency: 'INR',
      status: 'PENDING_PAYMENT' as OrderStatus,
      timeline: [{
        status: 'PENDING_PAYMENT',
        message: 'Order created, awaiting payment',
        timestamp: new Date(),
      }],
      customerNotes: input.customerNotes,
      idempotencyKey: input.idempotencyKey,
    }]);

    // 8. Reserve inventory atomically
    const reservationItems = pricing.items.map((item) => ({
      variantId: item.variantId,
      quantity: item.quantity,
    }));

    await reserveInventory(reservationItems, order._id.toString());

    // 9. Record coupon usage
    if (pricing.couponCode) {
      await Coupon.findOneAndUpdate(
        { code: pricing.couponCode },
        { $inc: { usedCount: 1 } }
      );

      await CouponUsage.create([{
        couponId: (await Coupon.findOne({ code: pricing.couponCode }).lean())?._id,
        userId: input.userId,
        orderId: order._id,
      }]);
    }

    logger.info({
      orderId: order._id,
      orderNumber,
      userId: input.userId,
      grandTotal: pricing.grandTotal,
    }, 'Order created successfully');

    return order;
  } catch (error) {
    throw error;
  }
}

/**
 * Transitions an order to a new status with validation.
 */
export async function transitionOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  message: string,
  performedBy?: string,
): Promise<void> {
  const order = await Order.findById(orderId);
  if (!order) {
    throw ApiError.notFound('Order');
  }

  const allowedTransitions = VALID_TRANSITIONS[order.status];
  if (!allowedTransitions || !allowedTransitions.includes(newStatus)) {
    throw ApiError.badRequest(
      `Cannot transition from ${order.status} to ${newStatus}`,
      'INVALID_STATUS_TRANSITION',
    );
  }

  const timelineEntry: IOrderTimeline = {
    status: newStatus,
    message,
    timestamp: new Date(),
    performedBy: performedBy ? new mongoose.Types.ObjectId(performedBy) : undefined,
  } as IOrderTimeline;

  const updateFields: Record<string, unknown> = {
    status: newStatus,
    $push: { timeline: timelineEntry },
  };

  // Set timestamp fields based on status
  if (newStatus === 'PAID') {
    updateFields.paidAt = new Date();
  }
  if (newStatus === 'SHIPPED') updateFields.shippedAt = new Date();
  if (newStatus === 'DELIVERED') updateFields.deliveredAt = new Date();
  if (newStatus === 'CANCELLED') {
    updateFields.cancelledAt = new Date();
  }

  await Order.findByIdAndUpdate(orderId, updateFields);

  // Side effects based on status change
  if (newStatus === 'PAID') {
    // Shipping is handled manually by admin — no auto-shipment creation
    logger.info({ orderId: order.id }, 'Order paid — awaiting manual shipment by admin');
  }

  // Side effects based on status change
  if (newStatus === 'CANCELLED') {
    // Release inventory reservation
    const items = order.items.map((item) => ({
      variantId: item.variantId.toString(),
      quantity: item.quantity,
    }));
    await releaseReservation(items, orderId);
  }

  if (newStatus === 'PAID') {
    // Confirm inventory (move reserved → committed)
    const items = order.items.map((item) => ({
      variantId: item.variantId.toString(),
      quantity: item.quantity,
    }));
    await confirmReservation(items, orderId);
  }

  // Customer email notifications for status changes
  try {
    if (newStatus === 'SHIPPED') await sendShippedEmail(orderId);
    if (newStatus === 'OUT_FOR_DELIVERY') await sendOutForDeliveryEmail(orderId);
    if (newStatus === 'DELIVERED') await sendDeliveredEmail(orderId);
    if (newStatus === 'CANCELLED') await sendOrderCancelledEmail(orderId, order.cancellationReason);
    if (newStatus === 'RTO') await sendRtoEmail(orderId);
  } catch (emailError) {
    logger.error({ err: emailError, orderId, newStatus }, 'Order status email failed');
  }

  logger.info({ orderId, from: order.status, to: newStatus }, 'Order status transitioned');
}

/**
 * Cancel an order. Only allowed before shipment.
 */
export async function cancelOrder(
  orderId: string,
  reason: string,
  performedBy?: string,
): Promise<void> {
  const order = await Order.findById(orderId);
  if (!order) {
    throw ApiError.notFound('Order');
  }

  const cancellableStatuses: OrderStatus[] = [
    'PENDING_PAYMENT', 'PAYMENT_FAILED', 'PAID', 'PROCESSING',
  ];

  if (!cancellableStatuses.includes(order.status)) {
    throw ApiError.badRequest(
      `Cannot cancel order in ${order.status} status`,
      'ORDER_NOT_CANCELLABLE',
    );
  }

  order.status = 'CANCELLED';
  order.cancelledAt = new Date();
  order.cancellationReason = reason;
  order.timeline.push({
    status: 'CANCELLED',
    message: `Order cancelled: ${reason}`,
    timestamp: new Date(),
    performedBy: performedBy ? new mongoose.Types.ObjectId(performedBy) : undefined,
  } as IOrderTimeline);

  await order.save();

  // Release inventory
  const items = order.items.map((item) => ({
    variantId: item.variantId.toString(),
    quantity: item.quantity,
  }));
  await releaseReservation(items, orderId);

  await sendOrderCancelledEmail(orderId, reason);

  logger.info({ orderId, reason }, 'Order cancelled');
}
