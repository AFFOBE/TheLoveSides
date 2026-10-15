import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { optionalAuth } from '../middleware/auth.js';
import { cartSession } from '../middleware/cartSession.js';
import { getCart, addToCart, updateCartItem, removeCartItem } from '../controllers/public/cart.js';
import { initiateCheckout } from '../controllers/public/checkout.js';
import { validateCoupon } from '../controllers/public/coupon.js';
import { addToCartSchema, updateCartItemSchema } from '../validators/cart.js';
import { initiateCheckoutSchema, validateCouponSchema } from '../validators/checkout.js';

const router = Router();

// Apply session logic to all cart/checkout routes
router.use(optionalAuth);
router.use(cartSession);

// Cart
router.get('/cart', getCart);
router.post('/cart/items', validate({ body: addToCartSchema }), addToCart);
router.patch('/cart/items/:itemId', validate({ body: updateCartItemSchema }), updateCartItem);
router.delete('/cart/items/:itemId', removeCartItem);

// Checkout
router.post('/checkout/initiate', validate({ body: initiateCheckoutSchema }), initiateCheckout);
router.post('/checkout/validate-coupon', validate({ body: validateCouponSchema }), validateCoupon);

export default router;
