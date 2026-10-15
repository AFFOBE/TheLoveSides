import { type ICartItem } from '../models/Cart.js';
import { ProductVariant } from '../models/ProductVariant.js';
import { Inventory } from '../models/Inventory.js';
import { Coupon, CouponUsage, type CouponType } from '../models/Coupon.js';
import { Order } from '../models/Order.js';
import { Setting } from '../models/Setting.js';
import { ApiError } from '../utils/ApiError.js';
import mongoose from 'mongoose';

export interface PricedItem {
  variantId: string;
  productId: string;
  name: string;
  sku: string;
  image?: string;
  attributes: { name: string; value: string }[];
  unitPrice: number;
  quantity: number;
  tax: number;
  discount: number;
  total: number;
}

export interface CartPricing {
  items: PricedItem[];
  subtotal: number;
  discountAmount: number;
  couponCode?: string;
  taxAmount: number;
  shippingAmount: number;
  grandTotal: number;
}

/**
 * Calculates server-authoritative pricing for a cart.
 * Fetches live prices from the database — never trusts client-side prices.
 */
export async function calculateCartPricing(
  cartItems: ICartItem[],
  couponCode?: string,
  userId?: string,
  shippingMethod?: { rate: number },
  country: string = 'India'
): Promise<CartPricing> {
  if (!cartItems || cartItems.length === 0) {
    return {
      items: [],
      subtotal: 0,
      discountAmount: 0,
      couponCode: undefined,
      taxAmount: 0,
      shippingAmount: 0,
      grandTotal: 0,
    };
  }

  // 1. Fetch live variant data (prices may have changed since cart was created)
  const variantIds = cartItems.map((item) => item.variantId.toString());
  const variants = await ProductVariant.find({
    _id: { $in: variantIds },
    isActive: true,
    $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }]
  }).lean();

  const variantMap = new Map(
    variants.map((v) => [v._id.toString(), v]),
  );

  // 2. Build priced items with live prices
  const pricedItems: PricedItem[] = [];
  let subtotal = 0;

  for (const cartItem of cartItems) {
    const variant = variantMap.get(cartItem.variantId.toString());
    if (!variant) {
      throw ApiError.badRequest(
        `Variant ${cartItem.variantId} is no longer available`,
        'VARIANT_UNAVAILABLE',
      );
    }

    // Use sale price if active, otherwise regular price
    const unitPrice = variant.salePrice ?? variant.price;
    const itemTotal = unitPrice * cartItem.quantity;
    subtotal += itemTotal;

    pricedItems.push({
      variantId: variant._id.toString(),
      productId: cartItem.productId.toString(),
      name: cartItem.name,
      sku: variant.sku,
      image: variant.images?.[0] || cartItem.image,
      attributes: variant.attributes.map((a) => ({
        name: a.name,
        value: a.value,
      })),
      unitPrice,
      quantity: cartItem.quantity,
      tax: 0,     // Calculated below
      discount: 0, // Calculated below
      total: itemTotal,
    });
  }

  // 3. Apply coupon if provided
  let discountAmount = 0;

  if (couponCode) {
    discountAmount = await calculateCouponDiscount(
      couponCode,
      subtotal,
      userId,
    );
  }

  // 4. Calculate tax (placeholder — configurable per product/settings in future)
  // For now, prices are tax-inclusive (Indian e-commerce standard)
  const taxAmount = 0;

  // 5. Calculate shipping
  let shippingAmount = 0;
  
  if (country !== 'India') {
    // Flat international shipping rate or use frontend rate if provided securely
    // But backend should enforce a minimum or flat rate for international
    shippingAmount = 2000;
  } else {
    // Fetch shipping settings
    const settings = await Setting.find({ key: { $in: ['sitewideFreeShipping', 'freeShippingThreshold'] } }).lean();
    let sitewideFreeShipping = false;
    let freeShippingThreshold = 2000; // default
    
    settings.forEach(s => {
      if (s.key === 'sitewideFreeShipping') sitewideFreeShipping = s.value === 'true';
      if (s.key === 'freeShippingThreshold') freeShippingThreshold = Number(s.value) || 2000;
    });

    if (sitewideFreeShipping || subtotal >= freeShippingThreshold) {
      shippingAmount = 0;
    } else if (shippingMethod && typeof shippingMethod.rate === 'number') {
      shippingAmount = shippingMethod.rate;
    } else {
      const FLAT_SHIPPING_RATE = 99; // Default flat rate
      shippingAmount = FLAT_SHIPPING_RATE;
    }
  }

  // 6. Grand total
  const grandTotal = Math.max(0, subtotal - discountAmount + taxAmount + shippingAmount);

  return {
    items: pricedItems,
    subtotal,
    discountAmount,
    couponCode: discountAmount > 0 ? couponCode : undefined,
    taxAmount,
    shippingAmount,
    grandTotal,
  };
}

/**
 * Validates a coupon and calculates the discount amount.
 */
async function calculateCouponDiscount(
  code: string,
  subtotal: number,
  userId?: string,
): Promise<number> {
  const coupon = await Coupon.findOne({
    code: code.toUpperCase(),
    isActive: true,
  }).lean();

  if (!coupon) {
    throw ApiError.badRequest('Invalid coupon code', 'INVALID_COUPON');
  }

  const now = new Date();
  if (now < coupon.startDate || now > coupon.endDate) {
    throw ApiError.badRequest('Coupon has expired', 'COUPON_EXPIRED');
  }

  // Check usage limit
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    throw ApiError.badRequest('Coupon usage limit reached', 'COUPON_LIMIT_REACHED');
  }

  // Check per-user limit
  if (userId) {
    const userUsageCount = await CouponUsage.countDocuments({
      couponId: coupon._id,
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (userUsageCount >= coupon.perUserLimit) {
      throw ApiError.badRequest(
        'You have already used this coupon the maximum number of times',
        'COUPON_USER_LIMIT',
      );
    }

    // First order only
    if (coupon.isFirstOrderOnly) {
      const orderCount = await Order.countDocuments({
        userId: new mongoose.Types.ObjectId(userId),
        status: { $ne: 'CANCELLED' },
      });
      if (orderCount > 0) {
        throw ApiError.badRequest(
          'This coupon is valid for first orders only',
          'COUPON_FIRST_ORDER_ONLY',
        );
      }
    }
  }

  // Check minimum cart value
  if (coupon.minCartValue && subtotal < coupon.minCartValue) {
    throw ApiError.badRequest(
      `Minimum cart value of ₹${coupon.minCartValue} required for this coupon`,
      'COUPON_MIN_CART',
    );
  }

  // Check user-specific coupon
  if (coupon.applicableUserIds.length > 0 && userId) {
    const isApplicable = coupon.applicableUserIds.some(
      (id) => id.toString() === userId,
    );
    if (!isApplicable) {
      throw ApiError.badRequest('This coupon is not available for your account', 'COUPON_NOT_APPLICABLE');
    }
  }

  // Calculate discount
  let discount: number;

  if (coupon.type === 'fixed') {
    discount = coupon.value;
  } else {
    // percentage
    discount = (subtotal * coupon.value) / 100;
    if (coupon.maxDiscountAmount) {
      discount = Math.min(discount, coupon.maxDiscountAmount);
    }
  }

  // Never discount more than the subtotal
  return Math.min(discount, subtotal);
}

/**
 * Validates a coupon against a subtotal and returns a display-friendly preview.
 * Throws an ApiError if the coupon is invalid/expired/not applicable.
 */
export async function previewCoupon(
  code: string,
  subtotal: number,
  userId?: string,
): Promise<{ code: string; type: CouponType; value: number; discountAmount: number }> {
  const discountAmount = await calculateCouponDiscount(code, subtotal, userId);

  const coupon = await Coupon.findOne({
    code: code.toUpperCase(),
    isActive: true,
  }).lean();

  if (!coupon) {
    throw ApiError.badRequest('Invalid coupon code', 'INVALID_COUPON');
  }

  return {
    code: coupon.code,
    type: coupon.type,
    value: coupon.value,
    discountAmount,
  };
}

/**
 * Validates cart items against current inventory.
 * Throws if any item is out of stock.
 */
export async function validateCartInventory(
  cartItems: ICartItem[],
): Promise<void> {
  const variantIds = cartItems.map((item) => item.variantId.toString());
  const inventories = await Inventory.find({
    variantId: { $in: variantIds },
  }).lean();

  const inventoryMap = new Map(
    inventories.map((inv) => [inv.variantId.toString(), inv]),
  );

  for (const item of cartItems) {
    const inv = inventoryMap.get(item.variantId.toString());
    if (!inv) {
      throw ApiError.notFound(`Inventory for ${item.name}`);
    }

    if (inv.trackInventory && !inv.allowBackorder && inv.available < item.quantity) {
      throw ApiError.conflict(
        `Insufficient stock for "${item.name}". Only ${inv.available} available.`,
        'INSUFFICIENT_INVENTORY',
      );
    }
  }
}
