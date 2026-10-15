import type { Request, Response, NextFunction } from 'express';
import { verifyWebhookSignature } from '../integrations/razorpay/razorpay.service.js';
import { WebhookEvent } from '../models/WebhookEvent.js';
import { Order } from '../models/Order.js';
import { Payment } from '../models/Payment.js';
import { transitionOrderStatus } from '../services/order.service.js';
import { sendOrderConfirmationEmail } from '../services/invoice.service.js';
import { sendRefundProcessedEmail } from '../services/notification.service.js';
import { User } from '../models/User.js';
import { logger } from '../utils/logger.js';

export async function razorpayWebhook(req: Request, res: Response, _next: NextFunction): Promise<void> {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    
    // Express provides req.rawBody if configured (we will configure it in app.ts)
    // Otherwise we can fallback to JSON.stringify but it's less reliable for signatures
    const payload = (req as any).rawBody || JSON.stringify(req.body);

    if (!signature || !verifyWebhookSignature(payload, signature)) {
      logger.warn('Invalid Razorpay webhook signature');
      res.status(400).send('Invalid signature');
      return;
    }

    const event = req.body;
    const razorpayEventId = req.headers['x-razorpay-event-id'] as string;

    // Idempotency check
    const existingEvent = await WebhookEvent.findOne({
      provider: 'RAZORPAY',
      eventId: razorpayEventId || event.id,
    });

    if (existingEvent) {
      logger.info({ eventId: event.id }, 'Webhook event already processed');
      res.status(200).send('OK');
      return;
    }

    // Save event to DB for idempotency and audit
    await WebhookEvent.create({
      provider: 'RAZORPAY',
      eventId: razorpayEventId || event.id,
      eventType: event.event,
      payload: event,
      status: 'PENDING',
    });

    // Process immediately (for a true scalable system, push to BullMQ here)
    // For now, process synchronously
    await processRazorpayEvent(event);

    await WebhookEvent.updateOne(
      { provider: 'RAZORPAY', eventId: razorpayEventId || event.id },
      { status: 'PROCESSED' }
    );

    res.status(200).send('OK');
  } catch (error) {
    logger.error({ err: error }, 'Error processing Razorpay webhook');
    // Save failure state
    const eventId = req.headers['x-razorpay-event-id'] || req.body?.id;
    if (eventId) {
      await WebhookEvent.updateOne(
        { provider: 'RAZORPAY', eventId },
        { status: 'FAILED', error: error instanceof Error ? error.message : 'Unknown error' }
      ).catch(() => {});
    }
    
    res.status(500).send('Internal Error');
  }
}

async function processRazorpayEvent(event: any) {
  const { event: eventType, payload } = event;

  switch (eventType) {
    case 'payment.captured': {
      const paymentEntity = payload.payment.entity;
      const orderId = paymentEntity.notes?.orderId;
      if (!orderId) break;

      // Handle async capture if frontend missed it
      const order = await Order.findById(orderId);
      if (order && order.status === 'PENDING_PAYMENT') {
        const existingPayment = await Payment.findOne({ razorpayPaymentId: paymentEntity.id });
        if (!existingPayment) {
          await Payment.create({
            orderId: order._id,
            userId: order.userId,
            amount: paymentEntity.amount / 100, // convert back from paise
            currency: paymentEntity.currency,
            provider: 'RAZORPAY',
            razorpayPaymentId: paymentEntity.id,
            razorpayOrderId: paymentEntity.order_id,
            status: 'CAPTURED',
            method: paymentEntity.method,
          });

          await transitionOrderStatus(
            order.id,
            'PAID',
            'Payment verified via webhook'
          );

          try {
            const user = await User.findById(order.userId);
            if (user?.email) {
              await sendOrderConfirmationEmail(order.id, user.email);
            }
          } catch (err) {
            logger.error({ err, orderId: order.id }, 'Error sending invoice email');
          }
        }
      }
      break;
    }
    case 'payment.failed': {
      const paymentEntity = payload.payment.entity;
      const orderId = paymentEntity.notes?.orderId;
      if (!orderId) break;

      const order = await Order.findById(orderId);
      if (order && order.status === 'PENDING_PAYMENT') {
        await Payment.create({
          orderId: order._id,
          userId: order.userId,
          amount: paymentEntity.amount / 100,
          currency: paymentEntity.currency,
          provider: 'RAZORPAY',
          razorpayPaymentId: paymentEntity.id,
          razorpayOrderId: paymentEntity.order_id,
          status: 'FAILED',
          method: paymentEntity.method,
          failureReason: paymentEntity.error_description,
        });

        await transitionOrderStatus(
          order.id,
          'PAYMENT_FAILED',
          `Payment failed: ${paymentEntity.error_description}`
        );
      }
      break;
    }
    case 'refund.processed': {
      const refundEntity = payload.refund?.entity;
      if (!refundEntity) break;

      let orderId: string | undefined = refundEntity.notes?.orderId;
      if (!orderId && refundEntity.payment_id) {
        const payment = await Payment.findOne({ razorpayPaymentId: refundEntity.payment_id }).lean();
        orderId = payment?.orderId?.toString();
      }

      if (orderId) {
        const refundAmount = refundEntity.amount ? refundEntity.amount / 100 : undefined;
        await sendRefundProcessedEmail(orderId, refundAmount);
      } else {
        logger.warn({ refundId: refundEntity.id }, 'Refund webhook: could not resolve order');
      }
      break;
    }
    default:
      logger.info({ eventType }, 'Unhandled Razorpay event type');
  }
}
