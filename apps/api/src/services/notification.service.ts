import { Order } from '../models/Order.js';
import { User } from '../models/User.js';
import { Shipment } from '../models/Shipment.js';
import { emailService } from './email.service.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * Central place for all customer-facing transactional emails.
 * Every function is defensive: it never throws, so a failed email
 * can never break the underlying order/payment/return flow.
 */

function emailLayout(
  heading: string,
  lines: string[],
  cta?: { text: string; url: string },
): string {
  const ctaHtml = cta
    ? `<p style="margin:24px 0;">
         <a href="${cta.url}" style="background:#d81b60;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">${cta.text}</a>
       </p>`
    : '';
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      <h2 style="color: #d81b60;">${heading}</h2>
      ${lines.map((line) => `<p>${line}</p>`).join('')}
      ${ctaHtml}
      <br/>
      <p>Best Regards,</p>
      <p><strong>TheLoveSides Team</strong></p>
    </div>`;
}

function toPlainText(lines: string[]): string {
  return lines.join('\n').replace(/<[^>]+>/g, '');
}

async function sendSafe(params: {
  to: string;
  subject: string;
  lines: string[];
  heading: string;
  cta?: { text: string; url: string };
}): Promise<void> {
  try {
    await emailService.sendEmail({
      to: params.to,
      subject: params.subject,
      text: toPlainText(params.lines),
      html: emailLayout(params.heading, params.lines, params.cta),
    });
    logger.info({ to: params.to, subject: params.subject }, 'Notification email sent');
  } catch (error) {
    logger.error({ err: error, to: params.to, subject: params.subject }, 'Failed to send notification email');
  }
}

async function loadOrderContext(
  orderId: string,
): Promise<{ email: string; firstName?: string; orderNumber: string } | null> {
  try {
    const order = await Order.findById(orderId).select('userId orderNumber').lean();
    if (!order) return null;
    const user = await User.findById(order.userId).select('email firstName').lean();
    if (!user?.email) return null;
    return { email: user.email, firstName: user.firstName as string | undefined, orderNumber: order.orderNumber };
  } catch (error) {
    logger.error({ err: error, orderId }, 'Failed to load order context for notification');
    return null;
  }
}

async function sendOrderStatusEmail(params: {
  orderId: string;
  subject: string;
  heading: string;
  buildLines: (orderNumber: string) => string[];
  cta?: { text: string; url: string };
}): Promise<void> {
  const ctx = await loadOrderContext(params.orderId);
  if (!ctx) return;
  await sendSafe({
    to: ctx.email,
    subject: params.subject,
    heading: params.heading,
    lines: params.buildLines(ctx.orderNumber),
    cta: params.cta,
  });
}

/** Order shipped (admin manual status or Shiprocket webhook). */
export async function sendShippedEmail(orderId: string): Promise<void> {
  let awb: string | undefined;
  let courier: string | undefined;
  try {
    const shipment = await Shipment.findOne({ orderId }).select('awbCode courierName').lean();
    awb = shipment?.awbCode || undefined;
    courier = shipment?.courierName || undefined;
  } catch (error) {
    logger.error({ err: error, orderId }, 'Failed to load shipment for shipped email');
  }

  await sendOrderStatusEmail({
    orderId,
    subject: 'Your order has been shipped - TheLoveSides',
    heading: 'Your order is on the way',
    cta: awb ? { text: 'Track your order', url: `${env.STOREFRONT_URL}/track?awb=${awb}` } : undefined,
    buildLines: (orderNumber) => {
      const lines = [
        `Good news! Order <strong>${orderNumber}</strong> has been shipped and is on its way to you.`,
      ];
      if (courier) lines.push(`Courier: <strong>${courier}</strong>`);
      if (awb) lines.push(`Tracking (AWB) number: <strong>${awb}</strong>`);
      lines.push('You can also track it anytime from your account under Order History.');
      return lines;
    },
  });
}

/** Order out for delivery. */
export async function sendOutForDeliveryEmail(orderId: string): Promise<void> {
  await sendOrderStatusEmail({
    orderId,
    subject: 'Your order is out for delivery - TheLoveSides',
    heading: 'Out for delivery today',
    cta: { text: 'View order', url: `${env.STOREFRONT_URL}/order/${orderId}` },
    buildLines: (orderNumber) => [
      `Order <strong>${orderNumber}</strong> is out for delivery and expected to reach you today.`,
      'Please keep your phone handy so the delivery partner can reach you.',
    ],
  });
}

/** Order delivered. */
export async function sendDeliveredEmail(orderId: string): Promise<void> {
  await sendOrderStatusEmail({
    orderId,
    subject: 'Your order has been delivered - TheLoveSides',
    heading: 'Your order has been delivered',
    cta: { text: 'Write a review', url: `${env.STOREFRONT_URL}/order/${orderId}` },
    buildLines: (orderNumber) => [
      `Order <strong>${orderNumber}</strong> has been delivered. We hope you love it!`,
      'Would you mind sharing a quick review? It helps other buyers a lot.',
    ],
  });
}

/** Order cancelled (customer or admin). */
export async function sendOrderCancelledEmail(orderId: string, reason?: string): Promise<void> {
  await sendOrderStatusEmail({
    orderId,
    subject: 'Your order has been cancelled - TheLoveSides',
    heading: 'Your order has been cancelled',
    buildLines: (orderNumber) => {
      const lines = [`Order <strong>${orderNumber}</strong> has been cancelled.`];
      if (reason) lines.push(`Reason: ${reason}`);
      lines.push('If you had already paid, any applicable refund will be processed to your original payment method.');
      return lines;
    },
  });
}

/** Order returned to origin (RTO) by courier. */
export async function sendRtoEmail(orderId: string): Promise<void> {
  await sendOrderStatusEmail({
    orderId,
    subject: 'Update on your order - TheLoveSides',
    heading: 'Your order is being returned',
    buildLines: (orderNumber) => [
      `We could not deliver order <strong>${orderNumber}</strong> and it is being returned to us.`,
      'Our support team will reach out to help you with a re-delivery or refund.',
    ],
  });
}

/** Refund processed (Razorpay refund webhook or return refund). */
export async function sendRefundProcessedEmail(orderId: string, amount?: number): Promise<void> {
  await sendOrderStatusEmail({
    orderId,
    subject: 'Your refund has been processed - TheLoveSides',
    heading: 'Refund processed',
    buildLines: (orderNumber) => {
      const lines = [`A refund for order <strong>${orderNumber}</strong> has been processed.`];
      if (amount !== undefined) lines.push(`Refund amount: <strong>Rs. ${amount.toFixed(2)}</strong>`);
      lines.push('The amount will reflect in your original payment method within 5-7 business days.');
      return lines;
    },
  });
}

/** Return / replacement request status change. */
export async function sendReturnStatusEmail(params: {
  email: string;
  orderNumber: string;
  status: string;
  type: string;
}): Promise<void> {
  const label = params.type === 'REPLACEMENT' ? 'Replacement' : 'Return';
  const statusText = params.status
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  await sendSafe({
    to: params.email,
    subject: `${label} update - TheLoveSides`,
    heading: `${label} status: ${statusText}`,
    lines: [
      `Your ${label.toLowerCase()} request for order <strong>${params.orderNumber}</strong> is now: <strong>${statusText}</strong>.`,
    ],
  });
}

/** Welcome email when a brand new account is created (first OTP login). */
export async function sendWelcomeEmail(email: string, firstName?: string): Promise<void> {
  const name = firstName ? ` ${firstName}` : '';
  await sendSafe({
    to: email,
    subject: 'Welcome to TheLoveSides',
    heading: `Welcome${name}!`,
    lines: [
      'Thank you for joining TheLoveSides. Your account is ready.',
      'You can now track your orders, save your wishlist and check out faster.',
    ],
    cta: { text: 'Start shopping', url: `${env.STOREFRONT_URL}/products` },
  });
}

/** Welcome email after subscribing to the newsletter (footer form). */
export async function sendNewsletterWelcomeEmail(email: string): Promise<void> {
  await sendSafe({
    to: email,
    subject: 'Thanks for subscribing - TheLoveSides',
    heading: 'Thanks for subscribing',
    lines: [
      'You are now on our list. We will send you exclusive offers, new arrivals and design tips.',
      'Stay tuned for your first special offer.',
    ],
    cta: { text: 'Explore our collection', url: `${env.STOREFRONT_URL}/products` },
  });
}
