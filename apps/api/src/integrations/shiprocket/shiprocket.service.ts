import { shiprocketFetch } from './client.js';
import { IOrder } from '../../models/Order.js';
import { ApiError } from '../../utils/ApiError.js';
import { logger } from '../../utils/logger.js';

// ============================================
// Type Definitions
// ============================================

export interface ShiprocketOrderResponse {
  order_id: number;
  shipment_id: number;
  status: string;
  status_code: number;
  onboarding_completed_now: number;
  awb_code: string;
  courier_company_id: string;
  courier_name: string;
}

export interface ShippingRateParams {
  pickupPincode: string;
  deliveryPincode: string;
  weight: number; // kg
  cod: boolean;
  length?: number; // cm
  breadth?: number; // cm
  height?: number; // cm
  declaredValue?: number; // INR
}

export interface PincodeServiceabilityParams {
  pickupPincode: string;
  deliveryPincode: string;
  weight: number; // kg
  cod: boolean;
}

export interface PickupLocationParams {
  pickup_location: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  address_2?: string;
  city: string;
  state: string;
  country: string;
  pin_code: string;
}

export interface ReturnOrderParams {
  order_id: string;
  order_date: string;
  pickup_customer_name: string;
  pickup_last_name?: string;
  pickup_address: string;
  pickup_address_2?: string;
  pickup_city: string;
  pickup_state: string;
  pickup_country: string;
  pickup_pincode: string;
  pickup_email: string;
  pickup_phone: string;
  shipping_customer_name: string;
  shipping_last_name?: string;
  shipping_address: string;
  shipping_address_2?: string;
  shipping_city: string;
  shipping_state: string;
  shipping_country: string;
  shipping_pincode: string;
  shipping_email: string;
  shipping_phone: string;
  order_items: {
    name: string;
    sku: string;
    units: number;
    selling_price: number;
    discount: number;
    qc_enable?: boolean;
  }[];
  payment_method: string;
  sub_total: number;
  length: number;
  breadth: number;
  height: number;
  weight: number;
}

export interface ShiprocketProductParams {
  name: string;
  sku: string;
  hsn?: string;
  length: number;
  breadth: number;
  height: number;
  weight: number;
}

// ============================================
// 1. Order API
// ============================================

/**
 * Pushes an order to Shiprocket for fulfillment.
 * Converts our internal Order model to Shiprocket's payload format.
 */
export async function createShiprocketOrder(order: IOrder, userEmail: string, defaultWeight: number = 0.5): Promise<ShiprocketOrderResponse> {
  try {
    const [firstName, ...lastNameParts] = order.shippingAddress.fullName.split(' ');
    const lastName = lastNameParts.join(' ') || '-';

    const orderItems = order.items.map(item => ({
      name: item.name,
      sku: item.sku,
      units: item.quantity,
      selling_price: item.price,
      discount: item.discount,
      tax: item.tax,
      hsn: '', // Add HSN if available
    }));

    // In a real production system, you'd calculate this based on the sum of variant weights
    // For now, we provide safe defaults
    const payload = {
      order_id: order.orderNumber,
      order_date: order.createdAt.toISOString().split('T')[0],
      pickup_location: 'warehouse', // Needs to match Shiprocket dashboard configuration
      billing_customer_name: firstName,
      billing_last_name: lastName,
      billing_address: order.billingAddress?.addressLine1 || order.shippingAddress.addressLine1,
      billing_address_2: order.billingAddress?.addressLine2 || order.shippingAddress.addressLine2 || '',
      billing_city: order.billingAddress?.city || order.shippingAddress.city,
      billing_pincode: order.billingAddress?.pincode || order.shippingAddress.pincode,
      billing_state: order.billingAddress?.state || order.shippingAddress.state,
      billing_country: order.billingAddress?.country || order.shippingAddress.country,
      billing_email: userEmail,
      billing_phone: order.billingAddress?.phone || order.shippingAddress.phone,
      shipping_is_billing: !order.billingAddress ? 1 : 0,
      shipping_customer_name: firstName,
      shipping_last_name: lastName,
      shipping_address: order.shippingAddress.addressLine1,
      shipping_address_2: order.shippingAddress.addressLine2 || '',
      shipping_city: order.shippingAddress.city,
      shipping_pincode: order.shippingAddress.pincode,
      shipping_country: order.shippingAddress.country,
      shipping_state: order.shippingAddress.state,
      shipping_email: userEmail,
      shipping_phone: order.shippingAddress.phone,
      order_items: orderItems,
      payment_method: 'Prepaid', // Since we only ship after PAID status
      shipping_charges: order.shippingAmount,
      giftwrap_charges: 0,
      transaction_charges: 0,
      total_discount: order.discountAmount,
      sub_total: order.grandTotal,
      length: 10, // cm
      breadth: 10, // cm
      height: 10, // cm
      weight: defaultWeight, // kg
    };

    const response = await shiprocketFetch('/orders/create/adhoc', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const data = await response.json() as any;

    if (!response.ok) {
      logger.error({ status: response.status, data }, 'Failed to create Shiprocket order');
      throw new Error(`Shiprocket API Error: ${data.message || response.statusText}`);
    }

    return data as ShiprocketOrderResponse;
  } catch (error) {
    logger.error({ err: error, orderId: order._id }, 'Shiprocket order creation failed');
    throw ApiError.internal('Shipping gateway error');
  }
}

/**
 * Cancel an order in Shiprocket.
 */
export async function cancelShiprocketOrder(shiprocketOrderIds: number[]): Promise<any> {
  try {
    const response = await shiprocketFetch('/orders/cancel', {
      method: 'POST',
      body: JSON.stringify({ ids: shiprocketOrderIds }),
    });

    const data = await response.json() as any;

    if (!response.ok) {
      throw new Error(`Shiprocket API Error: ${data.message || response.statusText}`);
    }

    logger.info({ shiprocketOrderIds }, 'Shiprocket order(s) cancelled');
    return data;
  } catch (error) {
    logger.error({ err: error, shiprocketOrderIds }, 'Failed to cancel Shiprocket order');
    throw ApiError.internal('Failed to cancel order in shipping gateway');
  }
}

// ============================================
// 2. Shipping Rate API
// ============================================

/**
 * Get available shipping rates for a given route and package.
 */
export async function getShippingRates(params: ShippingRateParams): Promise<any> {
  try {
    const queryParams = new URLSearchParams({
      pickup_postcode: params.pickupPincode,
      delivery_postcode: params.deliveryPincode,
      weight: params.weight.toString(),
      cod: params.cod ? '1' : '0',
      ...(params.length && { length: params.length.toString() }),
      ...(params.breadth && { breadth: params.breadth.toString() }),
      ...(params.height && { height: params.height.toString() }),
      ...(params.declaredValue && { declared_value: params.declaredValue.toString() }),
    });

    const response = await shiprocketFetch(`/courier/serviceability/?${queryParams.toString()}`);
    const data = await response.json() as any;

    if (!response.ok) {
      throw new Error(`Shiprocket API Error: ${data.message || response.statusText}`);
    }

    return data;
  } catch (error) {
    logger.error({ err: error, params }, 'Failed to fetch shipping rates');
    throw ApiError.internal('Failed to fetch shipping rates');
  }
}

// ============================================
// 3. Pincode Serviceability API
// ============================================

/**
 * Check if delivery is serviceable between two pincodes.
 */
export async function checkPincodeServiceability(params: PincodeServiceabilityParams): Promise<any> {
  try {
    const queryParams = new URLSearchParams({
      pickup_postcode: params.pickupPincode,
      delivery_postcode: params.deliveryPincode,
      weight: params.weight.toString(),
      cod: params.cod ? '1' : '0',
    });

    const response = await shiprocketFetch(`/courier/serviceability/?${queryParams.toString()}`);
    const data = await response.json() as any;

    if (!response.ok) {
      throw new Error(`Shiprocket API Error: ${data.message || response.statusText}`);
    }

    // Determine serviceability from the response
    const couriers = data?.data?.available_courier_companies || [];
    return {
      serviceable: couriers.length > 0,
      courierCount: couriers.length,
      estimatedDays: couriers.length > 0
        ? Math.min(...couriers.map((c: any) => c.estimated_delivery_days || 999))
        : null,
      codAvailable: couriers.some((c: any) => c.cod === 1),
      couriers: couriers.map((c: any) => ({
        id: c.courier_company_id,
        name: c.courier_name,
        rate: c.rate,
        estimatedDays: c.estimated_delivery_days,
        cod: c.cod === 1,
      })),
    };
  } catch (error) {
    logger.error({ err: error, params }, 'Failed to check pincode serviceability');
    throw ApiError.internal('Failed to check delivery serviceability');
  }
}

// ============================================
// 4. Shipment API
// ============================================

/**
 * Get shipment details by Shiprocket shipment ID.
 */
export async function getShipmentDetails(shipmentId: number): Promise<any> {
  try {
    const response = await shiprocketFetch(`/shipments/${shipmentId}`);
    const data = await response.json() as any;

    if (!response.ok) {
      throw new Error(`Shiprocket API Error: ${data.message || response.statusText}`);
    }

    return data;
  } catch (error) {
    logger.error({ err: error, shipmentId }, 'Failed to get shipment details');
    throw ApiError.internal('Failed to fetch shipment details');
  }
}

// ============================================
// 5. Courier API
// ============================================

/**
 * List all available courier partners with shipment counts.
 */
export async function listCouriers(): Promise<any> {
  try {
    const response = await shiprocketFetch('/courier/courierListWithCounts');
    const data = await response.json() as any;

    if (!response.ok) {
      throw new Error(`Shiprocket API Error: ${data.message || response.statusText}`);
    }

    return data;
  } catch (error) {
    logger.error({ err: error }, 'Failed to list couriers');
    throw ApiError.internal('Failed to list courier partners');
  }
}

// ============================================
// 6. AWB API (extends existing)
// ============================================

/**
 * Generates an AWB for a shipment ID.
 */
export async function generateAWB(shipmentId: number, courierId?: string) {
  try {
    const payload: any = { shipment_id: shipmentId };
    if (courierId) {
      payload.courier_id = courierId;
    }

    const response = await shiprocketFetch('/courier/assign/awb', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const data = await response.json() as any;
    
    if (!response.ok) {
      throw new Error(`Shiprocket API Error: ${data.message || response.statusText}`);
    }
    
    return data;
  } catch (error) {
    logger.error({ err: error, shipmentId }, 'Failed to generate AWB');
    throw ApiError.internal('Shipping gateway error');
  }
}

// ============================================
// 7. Pickup API
// ============================================

/**
 * Schedule a pickup for a shipment.
 */
export async function requestPickup(shipmentId: number): Promise<any> {
  try {
    const response = await shiprocketFetch('/courier/generate/pickup', {
      method: 'POST',
      body: JSON.stringify({ shipment_id: [shipmentId] }),
    });

    const data = await response.json() as any;

    if (!response.ok) {
      throw new Error(`Shiprocket API Error: ${data.message || response.statusText}`);
    }

    logger.info({ shipmentId }, 'Pickup scheduled successfully');
    return data;
  } catch (error) {
    logger.error({ err: error, shipmentId }, 'Failed to schedule pickup');
    throw ApiError.internal('Failed to schedule pickup');
  }
}

// ============================================
// 8. Tracking API (extends existing)
// ============================================

/**
 * Tracks an AWB code.
 */
export async function trackAWB(awbCode: string) {
  try {
    const response = await shiprocketFetch(`/courier/track/awb/${awbCode}`);
    const data = await response.json() as any;
    
    if (!response.ok) {
      throw new Error(`Shiprocket API Error: ${data.message || response.statusText}`);
    }
    
    return data;
  } catch (error) {
    logger.error({ err: error, awbCode }, 'Failed to track AWB');
    throw ApiError.internal('Shipping gateway error');
  }
}

/**
 * Track a shipment by Shiprocket shipment ID.
 */
export async function trackByShipmentId(shipmentId: number): Promise<any> {
  try {
    const response = await shiprocketFetch(`/courier/track/shipment/${shipmentId}`);
    const data = await response.json() as any;

    if (!response.ok) {
      throw new Error(`Shiprocket API Error: ${data.message || response.statusText}`);
    }

    return data;
  } catch (error) {
    logger.error({ err: error, shipmentId }, 'Failed to track shipment');
    throw ApiError.internal('Failed to track shipment');
  }
}

// ============================================
// 9. Return API
// ============================================

/**
 * Create a return order in Shiprocket.
 */
export async function createReturnOrder(params: ReturnOrderParams): Promise<any> {
  try {
    const response = await shiprocketFetch('/orders/create/return', {
      method: 'POST',
      body: JSON.stringify(params),
    });

    const data = await response.json() as any;

    if (!response.ok) {
      throw new Error(`Shiprocket API Error: ${data.message || response.statusText}`);
    }

    logger.info({ orderId: params.order_id }, 'Return order created in Shiprocket');
    return data;
  } catch (error) {
    logger.error({ err: error, orderId: params.order_id }, 'Failed to create return order');
    throw ApiError.internal('Failed to create return order in shipping gateway');
  }
}

// ============================================
// 10. NDR (Non-Delivery Report) API
// ============================================

/**
 * Get list of NDR (Non-Delivery Report) shipments.
 */
export async function getNdrShipments(): Promise<any> {
  try {
    const response = await shiprocketFetch('/ndr');
    const data = await response.json() as any;

    if (!response.ok) {
      throw new Error(`Shiprocket API Error: ${data.message || response.statusText}`);
    }

    return data;
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch NDR shipments');
    throw ApiError.internal('Failed to fetch NDR shipments');
  }
}

/**
 * Submit an action for an NDR shipment.
 * @param awbCode - The AWB code of the shipment
 * @param action - 're-attempt' or 'return'
 * @param comments - Optional comments for the action
 */
export async function submitNdrAction(
  awbCode: string,
  action: 're-attempt' | 'return',
  comments?: string,
): Promise<any> {
  try {
    const response = await shiprocketFetch(`/ndr/${awbCode}/action`, {
      method: 'POST',
      body: JSON.stringify({ action, comments: comments || '' }),
    });

    const data = await response.json() as any;

    if (!response.ok) {
      throw new Error(`Shiprocket API Error: ${data.message || response.statusText}`);
    }

    logger.info({ awbCode, action }, 'NDR action submitted');
    return data;
  } catch (error) {
    logger.error({ err: error, awbCode, action }, 'Failed to submit NDR action');
    throw ApiError.internal('Failed to submit NDR action');
  }
}

// ============================================
// 11. COD (Cash on Delivery) API
// ============================================

/**
 * Get COD remittance details.
 */
export async function getCodRemittance(): Promise<any> {
  try {
    const response = await shiprocketFetch('/account/details/cod');
    const data = await response.json() as any;

    if (!response.ok) {
      throw new Error(`Shiprocket API Error: ${data.message || response.statusText}`);
    }

    return data;
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch COD remittance');
    throw ApiError.internal('Failed to fetch COD remittance details');
  }
}

// ============================================
// 12. Warehouse / Pickup Location API
// ============================================

/**
 * List all configured pickup locations (warehouses).
 */
export async function listPickupLocations(): Promise<any> {
  try {
    const response = await shiprocketFetch('/settings/company/pickup');
    const data = await response.json() as any;

    if (!response.ok) {
      throw new Error(`Shiprocket API Error: ${data.message || response.statusText}`);
    }

    return data;
  } catch (error) {
    logger.error({ err: error }, 'Failed to list pickup locations');
    throw ApiError.internal('Failed to list pickup locations');
  }
}

/**
 * Add a new pickup location (warehouse).
 */
export async function addPickupLocation(params: PickupLocationParams): Promise<any> {
  try {
    const response = await shiprocketFetch('/settings/company/addpickup', {
      method: 'POST',
      body: JSON.stringify(params),
    });

    const data = await response.json() as any;

    if (!response.ok) {
      throw new Error(`Shiprocket API Error: ${data.message || response.statusText}`);
    }

    logger.info({ pickupLocation: params.pickup_location }, 'Pickup location added');
    return data;
  } catch (error) {
    logger.error({ err: error, params }, 'Failed to add pickup location');
    throw ApiError.internal('Failed to add pickup location');
  }
}

// ============================================
// 13. Product / SKU API
// ============================================

/**
 * Add a product to Shiprocket catalog.
 */
export async function addShiprocketProduct(params: ShiprocketProductParams): Promise<any> {
  try {
    const response = await shiprocketFetch('/products', {
      method: 'POST',
      body: JSON.stringify(params),
    });

    const data = await response.json() as any;

    if (!response.ok) {
      throw new Error(`Shiprocket API Error: ${data.message || response.statusText}`);
    }

    logger.info({ sku: params.sku }, 'Product added to Shiprocket');
    return data;
  } catch (error) {
    logger.error({ err: error, sku: params.sku }, 'Failed to add product to Shiprocket');
    throw ApiError.internal('Failed to add product to shipping catalog');
  }
}

/**
 * Get products from Shiprocket catalog.
 */
export async function getShiprocketProducts(page = 1): Promise<any> {
  try {
    const response = await shiprocketFetch(`/products?page=${page}`);
    const data = await response.json() as any;

    if (!response.ok) {
      throw new Error(`Shiprocket API Error: ${data.message || response.statusText}`);
    }

    return data;
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch Shiprocket products');
    throw ApiError.internal('Failed to fetch products from shipping catalog');
  }
}
