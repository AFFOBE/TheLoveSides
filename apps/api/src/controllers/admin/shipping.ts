import type { Request, Response, NextFunction } from 'express';
import { Shipment } from '../../models/Shipment.js';
import { isShiprocketConfigured } from '../../integrations/shiprocket/client.js';
import {
  getShippingRates,
  checkPincodeServiceability,
  listCouriers,
  requestPickup,
  assignAwbSmart,
  cancelShiprocketOrder,
  trackAWB,
  trackByShipmentId,
  getShipmentDetails,
  getNdrShipments,
  submitNdrAction,
  getCodRemittance,
  listPickupLocations,
  addPickupLocation,
  addShiprocketProduct,
  getShiprocketProducts,
} from '../../integrations/shiprocket/shiprocket.service.js';
import { createAuditLog } from '../../services/audit.service.js';
import { sendSuccess } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';

/**
 * Ensures Shiprocket is configured before processing shipping requests.
 */
function assertShiprocketConfigured(): void {
  if (!isShiprocketConfigured) {
    throw ApiError.badRequest('Shiprocket is not configured. Set SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD in environment variables.');
  }
}

/**
 * GET /admin/shipping/rates
 * Get shipping rates for an order or custom route.
 */
export async function getShippingRatesHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    assertShiprocketConfigured();

    const { pickupPincode, deliveryPincode, weight, cod, length, breadth, height, declaredValue } = req.query;

    if (!pickupPincode || !deliveryPincode || !weight) {
      throw ApiError.badRequest('pickupPincode, deliveryPincode, and weight are required');
    }

    const data = await getShippingRates({
      pickupPincode: pickupPincode as string,
      deliveryPincode: deliveryPincode as string,
      weight: parseFloat(weight as string),
      cod: cod === 'true' || cod === '1',
      length: length ? parseFloat(length as string) : undefined,
      breadth: breadth ? parseFloat(breadth as string) : undefined,
      height: height ? parseFloat(height as string) : undefined,
      declaredValue: declaredValue ? parseFloat(declaredValue as string) : undefined,
    });

    sendSuccess({ res, data });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /admin/shipping/serviceability
 * Check pincode serviceability.
 */
export async function checkServiceabilityHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    assertShiprocketConfigured();

    const { pickupPincode, deliveryPincode, weight, cod } = req.query;

    if (!pickupPincode || !deliveryPincode) {
      throw ApiError.badRequest('pickupPincode and deliveryPincode are required');
    }

    const data = await checkPincodeServiceability({
      pickupPincode: pickupPincode as string,
      deliveryPincode: deliveryPincode as string,
      weight: parseFloat((weight as string) || '0.5'),
      cod: cod === 'true' || cod === '1',
    });

    sendSuccess({ res, data });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /admin/shipping/couriers
 * List available courier partners.
 */
export async function listCouriersHandler(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    assertShiprocketConfigured();
    const data = await listCouriers();
    sendSuccess({ res, data });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /admin/shipping/pickup
 * Schedule a pickup for a shipment.
 */
export async function requestPickupHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    assertShiprocketConfigured();

    const { shipmentId } = req.body;
    if (!shipmentId) {
      throw ApiError.badRequest('shipmentId is required');
    }

    // Find our internal shipment to get Shiprocket shipment ID
    const shipment = await Shipment.findById(shipmentId);
    if (!shipment) {
      throw ApiError.notFound('Shipment');
    }

    if (!shipment.shiprocketShipmentId) {
      throw ApiError.badRequest('Shipment does not have a Shiprocket shipment ID');
    }

    const data = await requestPickup(parseInt(shipment.shiprocketShipmentId));

    shipment.pickupDate = new Date();
    await shipment.save();

    await createAuditLog({
      action: 'shipping.pickup_request',
      resource: 'Shipment',
      resourceId: shipmentId,
      details: { shiprocketShipmentId: shipment.shiprocketShipmentId },
      req,
    });

    sendSuccess({ res, data, message: 'Pickup scheduled successfully' });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /admin/shipping/awb
 * Generate/assign AWB for a shipment that doesn't have one yet.
 */
export async function generateAwbHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    assertShiprocketConfigured();

    const { shipmentId } = req.body;
    if (!shipmentId) {
      throw ApiError.badRequest('shipmentId is required');
    }

    const shipment = await Shipment.findById(shipmentId);
    if (!shipment) {
      throw ApiError.notFound('Shipment');
    }

    if (shipment.awbCode) {
      sendSuccess({ res, data: shipment, message: 'AWB already assigned' });
      return;
    }

    if (!shipment.shiprocketShipmentId) {
      throw ApiError.badRequest('Shipment has not been created in Shiprocket yet');
    }

    const data = await assignAwbSmart(
      parseInt(shipment.shiprocketOrderId || '0'),
      parseInt(shipment.shiprocketShipmentId)
    );
    const assignedAwb = data?.awb_code || data?.data?.awb_code;
    if (!assignedAwb) {
      throw ApiError.internal(data?.message || data?.data?.message || 'AWB assignment failed at courier');
    }

    shipment.awbCode = assignedAwb;
    const courierName = data?.courier_name || data?.data?.courier_name;
    if (courierName) {
      shipment.courierName = courierName;
    }
    const courierId = data?.courier_company_id || data?.data?.courier_company_id;
    if (courierId) {
      shipment.courierId = parseInt(String(courierId));
    }
    shipment.status = 'AWB_ASSIGNED';
    await shipment.save();

    await createAuditLog({
      action: 'shipping.awb_generate',
      resource: 'Shipment',
      resourceId: shipmentId,
      details: { awbCode: assignedAwb, courierName: shipment.courierName },
      req,
    });

    sendSuccess({ res, data: shipment, message: 'AWB generated successfully' });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /admin/shipping/cancel
 * Cancel a Shiprocket order.
 */
export async function cancelShipmentHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    assertShiprocketConfigured();

    const { shipmentId } = req.body;
    if (!shipmentId) {
      throw ApiError.badRequest('shipmentId is required');
    }

    const shipment = await Shipment.findById(shipmentId);
    if (!shipment) {
      throw ApiError.notFound('Shipment');
    }

    if (!shipment.shiprocketOrderId) {
      throw ApiError.badRequest('Shipment does not have a Shiprocket order ID');
    }

    const data = await cancelShiprocketOrder([parseInt(shipment.shiprocketOrderId)]);

    // Update our internal shipment status
    shipment.status = 'CANCELLED';
    await shipment.save();

    await createAuditLog({
      action: 'shipping.cancel',
      resource: 'Shipment',
      resourceId: shipmentId,
      details: { shiprocketOrderId: shipment.shiprocketOrderId },
      req,
    });

    sendSuccess({ res, data, message: 'Shipment cancelled successfully' });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /admin/shipping/track/:awb
 * Track a shipment by AWB code.
 */
export async function trackShipmentHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    assertShiprocketConfigured();

    const { awb } = req.params;
    if (!awb) {
      throw ApiError.badRequest('AWB code is required');
    }

    const data = await trackAWB(awb as string);
    sendSuccess({ res, data });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /admin/shipping/track/shipment/:shipmentId
 * Track a shipment by internal shipment ID.
 */
export async function trackByInternalIdHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    assertShiprocketConfigured();

    const shipment = await Shipment.findById(req.params.shipmentId);
    if (!shipment) {
      throw ApiError.notFound('Shipment');
    }

    let data;
    if (shipment.awbCode) {
      data = await trackAWB(shipment.awbCode);
    } else if (shipment.shiprocketShipmentId) {
      data = await trackByShipmentId(parseInt(shipment.shiprocketShipmentId));
    } else {
      throw ApiError.badRequest('Shipment has no AWB code or Shiprocket shipment ID for tracking');
    }

    sendSuccess({ res, data });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /admin/shipping/shipment/:shipmentId
 * Get shipment details from Shiprocket.
 */
export async function getShipmentDetailsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    assertShiprocketConfigured();

    const shipment = await Shipment.findById(req.params.shipmentId);
    if (!shipment) {
      throw ApiError.notFound('Shipment');
    }

    if (!shipment.shiprocketShipmentId) {
      throw ApiError.badRequest('Shipment does not have a Shiprocket shipment ID');
    }

    const data = await getShipmentDetails(parseInt(shipment.shiprocketShipmentId));
    sendSuccess({ res, data });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /admin/shipping/ndr
 * List NDR (Non-Delivery Report) shipments.
 */
export async function getNdrShipmentsHandler(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    assertShiprocketConfigured();
    const data = await getNdrShipments();
    sendSuccess({ res, data });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /admin/shipping/ndr/:awb/action
 * Submit an NDR action (re-attempt or return).
 */
export async function submitNdrActionHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    assertShiprocketConfigured();

    const { awb } = req.params;
    const { action, comments } = req.body;

    if (!awb) {
      throw ApiError.badRequest('AWB code is required');
    }

    if (!action || !['re-attempt', 'return'].includes(action)) {
      throw ApiError.badRequest('action must be "re-attempt" or "return"');
    }

    const data = await submitNdrAction(awb as string, action, comments);

    await createAuditLog({
      action: 'shipping.ndr_action',
      resource: 'Shipment',
      resourceId: awb as string,
      details: { action, comments },
      req,
    });

    sendSuccess({ res, data, message: `NDR action '${action}' submitted successfully` });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /admin/shipping/cod-remittance
 * Get COD remittance details.
 */
export async function getCodRemittanceHandler(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    assertShiprocketConfigured();
    const data = await getCodRemittance();
    sendSuccess({ res, data });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /admin/shipping/warehouses
 * List all pickup locations (warehouses).
 */
export async function listWarehousesHandler(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    assertShiprocketConfigured();
    const data = await listPickupLocations();
    sendSuccess({ res, data });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /admin/shipping/warehouses
 * Add a new pickup location (warehouse).
 */
export async function addWarehouseHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    assertShiprocketConfigured();

    const { pickup_location, name, email, phone, address, address_2, city, state, country, pin_code } = req.body;

    if (!pickup_location || !name || !email || !phone || !address || !city || !state || !pin_code) {
      throw ApiError.badRequest('Required fields: pickup_location, name, email, phone, address, city, state, pin_code');
    }

    const data = await addPickupLocation({
      pickup_location,
      name,
      email,
      phone,
      address,
      address_2: address_2 || '',
      city,
      state,
      country: country || 'India',
      pin_code,
    });

    await createAuditLog({
      action: 'shipping.warehouse_add',
      resource: 'Warehouse',
      resourceId: pickup_location,
      details: { name, city, state, pin_code },
      req,
    });

    sendSuccess({ res, data, message: 'Pickup location added successfully' });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /admin/shipping/products
 * Add a product to Shiprocket catalog.
 */
export async function addProductHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    assertShiprocketConfigured();

    const { name, sku, hsn, length, breadth, height, weight } = req.body;

    if (!name || !sku || !length || !breadth || !height || !weight) {
      throw ApiError.badRequest('Required fields: name, sku, length, breadth, height, weight');
    }

    const data = await addShiprocketProduct({ name, sku, hsn, length, breadth, height, weight });

    sendSuccess({ res, data, message: 'Product added to shipping catalog' });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /admin/shipping/products
 * List products from Shiprocket catalog.
 */
export async function listProductsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    assertShiprocketConfigured();
    const page = parseInt(req.query.page as string) || 1;
    const data = await getShiprocketProducts(page);
    sendSuccess({ res, data });
  } catch (error) {
    next(error);
  }
}
