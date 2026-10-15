import type { Request, Response, NextFunction } from 'express';
import { Return } from '../../models/Return.js';
import { Order } from '../../models/Order.js';
import { User } from '../../models/User.js';
import { ProductVariant } from '../../models/ProductVariant.js';
import { isShiprocketConfigured } from '../../integrations/shiprocket/client.js';
import { createReturnOrder } from '../../integrations/shiprocket/shiprocket.service.js';
import { sendSuccess, sendPaginated } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';
import { createAuditLog } from '../../services/audit.service.js';
import { sendReturnStatusEmail } from '../../services/notification.service.js';
import { logger } from '../../utils/logger.js';

export async function listReturns(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 1000;
    const skip = (page - 1) * limit;

    const query: any = {};
    if (req.query.status) query.status = req.query.status;

    const [returns, total] = await Promise.all([
      Return.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'email firstName lastName')
        .populate('orderId', 'orderNumber')
        .lean(),
      Return.countDocuments(query),
    ]);

    sendPaginated(res, returns, {
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

export async function getReturnById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    const returnRequest = await Return.findById(id)
      .populate('userId', 'email firstName lastName phone')
      .populate('orderId', 'orderNumber status')
      .populate('variantId')
      .lean();

    if (!returnRequest) {
      throw ApiError.notFound('Return not found');
    }

    sendSuccess({ res, data: returnRequest });
  } catch (error) {
    next(error);
  }
}

export async function updateReturnStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    const { status, adminNotes } = req.body;

    const returnRequest = await Return.findById(id);
    if (!returnRequest) {
      throw ApiError.notFound('Return not found');
    }

    returnRequest.status = status;
    if (adminNotes) {
      returnRequest.adminNotes = adminNotes;
    }

    if (['REFUNDED', 'REJECTED', 'CLOSED'].includes(status)) {
      returnRequest.resolvedAt = new Date();
    }

    await returnRequest.save();

    // Notify the customer about meaningful return/replacement status changes
    if (['APPROVED', 'REJECTED', 'REFUNDED'].includes(status)) {
      try {
        const order = await Order.findById(returnRequest.orderId).select('orderNumber').lean();
        const user = await User.findById(returnRequest.userId).select('email').lean();
        if (user?.email && order?.orderNumber) {
          await sendReturnStatusEmail({
            email: user.email,
            orderNumber: order.orderNumber,
            status,
            type: returnRequest.type,
          });
        }
      } catch (emailError) {
        logger.error({ err: emailError, returnId: id }, 'Return status email failed');
      }
    }

    // When approved, automatically create a return order in Shiprocket
    if (status === 'APPROVED' && isShiprocketConfigured) {
      try {
        const order = await Order.findById(returnRequest.orderId);
        const user = await User.findById(returnRequest.userId);
        const variant = await ProductVariant.findById(returnRequest.variantId);

        if (order && user && variant) {
          const [firstName, ...lastNameParts] = order.shippingAddress.fullName.split(' ');
          const lastName = lastNameParts.join(' ') || '-';

          const shiprocketReturn = await createReturnOrder({
            order_id: `${order.orderNumber}-RET-${Date.now()}`,
            order_date: new Date().toISOString().split('T')[0],
            // Pickup from customer (the person returning the product)
            pickup_customer_name: firstName,
            pickup_last_name: lastName,
            pickup_address: order.shippingAddress.addressLine1,
            pickup_address_2: order.shippingAddress.addressLine2 || '',
            pickup_city: order.shippingAddress.city,
            pickup_state: order.shippingAddress.state,
            pickup_country: order.shippingAddress.country,
            pickup_pincode: order.shippingAddress.pincode,
            pickup_email: user.email,
            pickup_phone: order.shippingAddress.phone,
            // Ship to warehouse
            shipping_customer_name: 'TheLoveSides',
            shipping_address: 'Primary Warehouse', // TODO: Use actual warehouse address
            shipping_city: 'Delhi',
            shipping_state: 'Delhi',
            shipping_country: 'India',
            shipping_pincode: '110001',
            shipping_email: 'returns@thelovesides.com',
            shipping_phone: '0000000000',
            order_items: [{
              name: variant.sku,
              sku: variant.sku,
              units: returnRequest.quantity,
              selling_price: variant.price,
              discount: 0,
              qc_enable: true,
            }],
            payment_method: 'Prepaid',
            sub_total: variant.price * returnRequest.quantity,
            length: variant.dimensions?.length || 10,
            breadth: variant.dimensions?.width || 10,
            height: variant.dimensions?.height || 10,
            weight: (variant.weight || 500) / 1000, // Convert grams to kg
          });

          returnRequest.shiprocketReturnId = shiprocketReturn.order_id?.toString();
          returnRequest.status = 'PICKUP_SCHEDULED';
          await returnRequest.save();

          logger.info(
            { returnId: id, shiprocketReturnId: shiprocketReturn.order_id },
            'Return order created in Shiprocket',
          );
        }
      } catch (shiprocketError) {
        // Don't fail the return approval if Shiprocket return creation fails
        logger.error(
          { err: shiprocketError, returnId: id },
          'Failed to create Shiprocket return order (return still approved)',
        );
      }
    }

    await createAuditLog({
      action: 'return.update_status',
      resource: 'Return',
      resourceId: id,
      details: { newStatus: status },
      req,
    });

    sendSuccess({ res, data: returnRequest, message: 'Return status updated successfully' });
  } catch (error) {
    next(error);
  }
}

