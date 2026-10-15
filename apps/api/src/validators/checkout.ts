import { z } from 'zod';

const addressSchema = z.object({
  firstName: z.string().min(1, 'First name is required').trim(),
  lastName: z.string().min(1, 'Last name is required').trim(),
  phone: z.string().min(10, 'Valid phone number required').trim(),
  addressLine1: z.string().min(1, 'Address is required').trim(),
  addressLine2: z.string().optional(),
  city: z.string().min(1, 'City is required').trim(),
  state: z.string().min(1, 'State is required').trim(),
  postalCode: z.string().min(5, 'Valid postal code required').trim(),
  country: z.string().min(1).default('India'),
  landmark: z.string().optional(),
});

export const initiateCheckoutSchema = z.object({
  shippingAddress: addressSchema,
  billingAddress: addressSchema.nullable().optional(),
  couponCode: z.string().trim().toUpperCase().nullable().optional(),
  customerNotes: z.string().max(500).nullable().optional(),
  email: z.string().email('Invalid email').nullable().optional(),
  shippingMethod: z.object({
    courierId: z.union([z.number(), z.string()]),
    courierName: z.string(),
    rate: z.number()
  }).nullable().optional(),
});

export const validateCouponSchema = z.object({
  couponCode: z.string().trim().min(1, 'Coupon code is required').toUpperCase(),
});
