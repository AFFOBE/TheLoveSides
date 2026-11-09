import { Order } from '../models/Order.js';
import { sendPendingPaymentReminderEmail } from '../services/notification.service.js';
import { logger } from '../utils/logger.js';

/**
 * Pending-payment reminder job.
 *
 * Finds orders that are still PENDING_PAYMENT one hour after checkout and
 * sends the customer a single reminder email asking them to complete the
 * payment. Guests / old abandoned checkouts are handled too — the field
 * `paymentReminderSentAt` guarantees exactly one reminder per order.
 */

const CHECK_INTERVAL_MS = 30 * 60 * 1000; // every 30 minutes
const FIRST_REMINDER_DELAY_MS = 60 * 60 * 1000; // wait 1 hour after order
const BATCH_SIZE = 25; // max emails per run

let running = false;

export async function processPendingPaymentReminders(): Promise<void> {
  if (running) return;
  running = true;

  try {
    const cutoff = new Date(Date.now() - FIRST_REMINDER_DELAY_MS);

    const candidates = await Order.find({
      status: 'PENDING_PAYMENT',
      deletedAt: null,
      createdAt: { $lt: cutoff },
      paymentReminderSentAt: { $exists: false },
    })
      .select('_id grandTotal')
      .sort({ createdAt: 1 })
      .limit(BATCH_SIZE)
      .lean();

    if (candidates.length === 0) return;

    for (const order of candidates) {
      // Claim the order atomically so two API processes (or overlapping runs)
      // can never email the same customer twice.
      const claimed = await Order.findOneAndUpdate(
        {
          _id: order._id,
          status: 'PENDING_PAYMENT',
          paymentReminderSentAt: { $exists: false },
        },
        { $set: { paymentReminderSentAt: new Date() } },
        { new: true },
      ).lean();

      if (!claimed) continue;

      const sent = await sendPendingPaymentReminderEmail(
        String(order._id),
        (order as { grandTotal?: number }).grandTotal,
      );

      if (!sent) {
        // Release the claim so a future run retries (e.g. SMTP hiccup).
        await Order.updateOne(
          { _id: order._id },
          { $unset: { paymentReminderSentAt: 1 } },
        );
      }
    }
  } catch (error) {
    logger.error({ err: error }, 'Pending payment reminder job failed');
  } finally {
    running = false;
  }
}

export function startPaymentReminderJob(): void {
  // Run once shortly after boot so existing pending orders are covered,
  // then keep checking on a fixed interval.
  setTimeout(() => {
    void processPendingPaymentReminders();
  }, 60 * 1000).unref?.();

  const timer = setInterval(() => {
    void processPendingPaymentReminders();
  }, CHECK_INTERVAL_MS);
  timer.unref?.();

  logger.info('Pending payment reminder job started');
}
