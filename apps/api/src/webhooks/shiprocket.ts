import type { Request, Response, NextFunction } from 'express';
import { WebhookEvent } from '../models/WebhookEvent.js';
import { Shipment, type ShipmentStatus } from '../models/Shipment.js';
import { transitionOrderStatus } from '../services/order.service.js';
import { sendOrderCancelledEmail } from '../services/notification.service.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * Map Shiprocket's tracking status codes to our internal ShipmentStatus.
 *
 * Shiprocket status_id reference:
 *   1  = AWB Assigned
 *   2  = Label Generated
 *   3  = Pickup Scheduled/Generated
 *   4  = Pickup Queued
 *   5  = Manifest Generated
 *   6  = Shipped / Picked Up
 *   7  = Delivered
 *   8  = Cancelled
 *   9  = RTO Initiated
 *   10 = RTO Delivered
 *   12 = Lost
 *   13 = Pickup Error
 *   14 = RTO Acknowledged
 *   15 = Pickup Rescheduled
 *   16 = Cancellation Requested
 *   17 = Out for Delivery
 *   18 = In Transit
 *   19 = Out for Pickup
 *   20 = Pickup Exception
 *   21 = Undelivered
 *   22 = Delayed
 *   23 = Partially Delivered
 *   24 = Destroyed
 *   25 = Damaged
 *   26 = Fulfilled
 *   38 = Reached at Destination Hub
 *   39 = Misrouted
 *   40 = RTO_NDR
 *   41 = RTO_OFD
 *   42 = Pickup Up
 *   43 = Return Pending
 *   44 = Return Received
 */
function mapShiprocketStatus(statusId: number): ShipmentStatus {
  switch (statusId) {
    case 1:
    case 2:
      return 'AWB_ASSIGNED';
    case 3:
    case 4:
    case 5:
    case 15:
    case 19:
    case 20:
      return 'SHIPMENT_CREATED';
    case 6:
    case 42:
      return 'PICKED_UP';
    case 18:
    case 22:
    case 38:
    case 39:
      return 'IN_TRANSIT';
    case 17:
      return 'OUT_FOR_DELIVERY';
    case 7:
    case 23:
    case 26:
      return 'DELIVERED';
    case 21:
      return 'UNDELIVERED';
    case 8:
    case 16:
      return 'CANCELLED';
    case 9:
    case 10:
    case 14:
    case 40:
    case 41:
      return 'RTO';
    case 12:
      return 'LOST';
    case 24:
    case 25:
      return 'DAMAGED';
    default:
      return 'IN_TRANSIT';
  }
}

/**
 * Maps Shiprocket shipment status to our Order status for automatic transitions.
 * Returns null if no order status transition should happen.
 */
function getOrderStatusFromShipmentStatus(shipmentStatus: ShipmentStatus): string | null {
  switch (shipmentStatus) {
    case 'PICKED_UP':
    case 'IN_TRANSIT':
      return 'SHIPPED';
    case 'OUT_FOR_DELIVERY':
      return 'OUT_FOR_DELIVERY';
    case 'DELIVERED':
      return 'DELIVERED';
    case 'RTO':
      return 'RTO';
    default:
      return null;
  }
}

/**
 * Handles incoming Shiprocket webhooks for tracking/status updates.
 *
 * Shiprocket sends a POST request with tracking data whenever a shipment's
 * status changes. We use a query-string token for basic authentication since
 * Shiprocket doesn't support HMAC signatures.
 *
 * Configure in Shiprocket dashboard:
 *   URL: https://api.thelovesides.com/api/v1/webhooks/shiprocket?token=YOUR_TOKEN
 */
export async function shiprocketWebhook(req: Request, res: Response, _next: NextFunction): Promise<void> {
  try {
    // Verify webhook token (query-string based authentication)
    const token = req.query.token as string;
    if (env.SHIPROCKET_WEBHOOK_TOKEN && token !== env.SHIPROCKET_WEBHOOK_TOKEN) {
      logger.warn('Invalid Shiprocket webhook token');
      res.status(401).send('Unauthorized');
      return;
    }

    const payload = req.body;
    logger.info({ eventType: payload.current_status, awb: payload.awb }, 'Shiprocket webhook received');

    // Save event for audit / idempotency
    const eventKey = `${payload.awb}-${payload.current_status_id}-${payload.scans?.length || 0}`;
    const existingEvent = await WebhookEvent.findOne({
      provider: 'shiprocket',
      eventType: eventKey,
    });

    if (existingEvent) {
      logger.info({ eventKey }, 'Shiprocket webhook event already processed');
      res.status(200).send('OK');
      return;
    }

    await WebhookEvent.create({
      provider: 'shiprocket',
      eventType: eventKey,
      payload,
      status: 'received',
    });

    // Process the webhook
    await processShiprocketWebhook(payload);

    await WebhookEvent.updateOne(
      { provider: 'shiprocket', eventType: eventKey },
      { status: 'processed', processedAt: new Date() },
    );

    res.status(200).send('OK');
  } catch (error) {
    logger.error({ err: error }, 'Error processing Shiprocket webhook');
    // Still return 200 to prevent Shiprocket from retrying endlessly
    // The error is logged for investigation
    res.status(200).send('OK');
  }
}

/**
 * Process the Shiprocket webhook payload and update internal records.
 */
async function processShiprocketWebhook(payload: any): Promise<void> {
  const {
    awb,
    current_status,
    current_status_id,
    etd, // Estimated delivery date
    courier_name,
    scans,
    shipment_id: shiprocketShipmentId,
  } = payload;

  if (!awb) {
    logger.warn({ payload }, 'Shiprocket webhook missing AWB code');
    return;
  }

  // Find our Shipment record by AWB code
  let shipment = await Shipment.findOne({ awbCode: awb });

  // Try finding by Shiprocket shipment ID if AWB lookup fails
  if (!shipment && shiprocketShipmentId) {
    shipment = await Shipment.findOne({ shiprocketShipmentId: shiprocketShipmentId.toString() });
  }

  if (!shipment) {
    logger.warn({ awb, shiprocketShipmentId }, 'Shipment not found for webhook');
    return;
  }

  const newShipmentStatus = mapShiprocketStatus(current_status_id);

  // Update shipment record
  const updateData: Record<string, unknown> = {
    status: newShipmentStatus,
    courierName: courier_name || shipment.courierName,
  };

  if (etd) {
    updateData.estimatedDeliveryDate = new Date(etd);
  }

  if (newShipmentStatus === 'DELIVERED') {
    updateData.deliveredAt = new Date();
  }

  if (newShipmentStatus === 'PICKED_UP') {
    updateData.pickupDate = new Date();
  }

  // Build tracking history from scans
  if (scans && Array.isArray(scans)) {
    const trackingHistory = scans.map((scan: any) => ({
      status: scan.status || current_status,
      location: scan.location || scan.ScannedLocation || '',
      timestamp: new Date(scan.date || scan.ScanDateTime || Date.now()),
      description: scan.activity || scan.Instructions || '',
    }));
    updateData.trackingHistory = trackingHistory;
  } else {
    // Append to existing history
    updateData.$push = {
      trackingHistory: {
        status: current_status,
        location: '',
        timestamp: new Date(),
        description: `Status updated to ${current_status}`,
      },
    };
  }

  // Handle $push separately to avoid conflict with flat updates
  if (updateData.$push) {
    const pushData = updateData.$push;
    delete updateData.$push;
    await Shipment.findByIdAndUpdate(shipment._id, { ...updateData, $push: pushData });
  } else {
    await Shipment.findByIdAndUpdate(shipment._id, updateData);
  }

  // Notify the customer if the shipment was cancelled by the courier
  if (newShipmentStatus === 'CANCELLED') {
    await sendOrderCancelledEmail(shipment.orderId.toString(), 'Shipment cancelled by courier');
  }

  // Attempt to transition the order status
  const targetOrderStatus = getOrderStatusFromShipmentStatus(newShipmentStatus);
  if (targetOrderStatus) {
    try {
      await transitionOrderStatus(
        shipment.orderId.toString(),
        targetOrderStatus as any,
        `Shipping status: ${current_status} (via Shiprocket webhook)`,
      );
    } catch (transitionError) {
      // Don't fail the webhook if the order transition fails
      // (e.g., invalid transition from current state)
      logger.warn(
        { err: transitionError, orderId: shipment.orderId, targetOrderStatus },
        'Order status transition skipped (may already be in target state)',
      );
    }
  }

  logger.info(
    { awb, shipmentId: shipment._id, status: newShipmentStatus },
    'Shipment updated from Shiprocket webhook',
  );
}
