import mongoose, { Schema, type Document, type Types } from 'mongoose';

export type OrderStatus =
  | 'PENDING_PAYMENT' | 'PAYMENT_FAILED' | 'PAID' | 'PROCESSING'
  | 'READY_TO_SHIP' | 'SHIPPED' | 'OUT_FOR_DELIVERY' | 'DELIVERED'
  | 'CANCELLED' | 'RETURN_REQUESTED' | 'RETURNED' | 'REFUNDED' | 'RTO';

export interface IOrderItemSnapshot {
  productId: Types.ObjectId;
  variantId: Types.ObjectId;
  name: string;
  sku: string;
  image?: string;
  attributes: { name: string; value: string }[];
  price: number;
  quantity: number;
  tax: number;
  discount: number;
  total: number;
}

export interface IOrderAddress {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  landmark?: string;
}

export interface IOrderTimeline {
  status: string;
  message: string;
  timestamp: Date;
  performedBy?: Types.ObjectId;
}

export interface IOrder extends Document {
  _id: Types.ObjectId;
  orderNumber: string;
  userId: Types.ObjectId;
  items: IOrderItemSnapshot[];
  shippingAddress: IOrderAddress;
  billingAddress?: IOrderAddress;
  // Pricing (all server-calculated, immutable snapshot)
  subtotal: number;
  discountAmount: number;
  couponCode?: string;
  taxAmount: number;
  shippingAmount: number;
  grandTotal: number;
  currency: string;
  // Status
  status: OrderStatus;
  timeline: IOrderTimeline[];
  // Notes
  customerNotes?: string;
  adminNotes?: string;
  // Idempotency
  idempotencyKey?: string;
  // Timestamps
  paidAt?: Date;
  shippedAt?: Date;
  deliveredAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
  /** When the "your order is still pending" reminder email was sent. */
  paymentReminderSentAt?: Date;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const orderItemSnapshotSchema = new Schema<IOrderItemSnapshot>(
  {
    productId: { type: Schema.Types.ObjectId, required: true },
    variantId: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    sku: { type: String, required: true },
    image: { type: String },
    attributes: [{
      name: { type: String, required: true },
      value: { type: String, required: true },
      _id: false,
    }],
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    tax: { type: Number, required: true, default: 0 },
    discount: { type: Number, required: true, default: 0 },
    total: { type: Number, required: true },
  },
  { _id: false },
);

const orderAddressSchema = new Schema<IOrderAddress>(
  {
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    addressLine1: { type: String, required: true, trim: true },
    addressLine2: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true },
    country: { type: String, required: true, default: 'India' },
    landmark: { type: String, trim: true },
  },
  { _id: false },
);

const orderTimelineSchema = new Schema<IOrderTimeline>(
  {
    status: { type: String, required: true },
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    performedBy: { type: Schema.Types.ObjectId },
  },
  { _id: false },
);

const orderSchema = new Schema<IOrder>(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    items: { type: [orderItemSnapshotSchema], required: true },
    shippingAddress: { type: orderAddressSchema, required: true },
    billingAddress: { type: orderAddressSchema },
    subtotal: { type: Number, required: true },
    discountAmount: { type: Number, default: 0 },
    couponCode: { type: String },
    taxAmount: { type: Number, default: 0 },
    shippingAmount: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    status: {
      type: String,
      enum: [
        'PENDING_PAYMENT', 'PAYMENT_FAILED', 'PAID', 'PROCESSING',
        'READY_TO_SHIP', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED',
        'CANCELLED', 'RETURN_REQUESTED', 'RETURNED', 'REFUNDED', 'RTO',
      ],
      default: 'PENDING_PAYMENT',
      index: true,
    },
    timeline: [orderTimelineSchema],
    customerNotes: { type: String, trim: true },
    adminNotes: { type: String, trim: true, select: false },
    idempotencyKey: { type: String, sparse: true, unique: true },
    paidAt: { type: Date },
    shippedAt: { type: Date },
    deliveredAt: { type: Date },
    cancelledAt: { type: Date },
    cancellationReason: { type: String },
    paymentReminderSentAt: { type: Date },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ status: 1, paymentReminderSentAt: 1 });
orderSchema.index({ createdAt: -1 });

export const Order = mongoose.model<IOrder>('Order', orderSchema);
