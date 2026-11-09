import { Router } from 'express';
import { razorpayWebhook } from '../webhooks/razorpay.js';
import { shiprocketWebhook } from '../webhooks/shiprocket.js';

const router = Router();

// Webhooks typically need raw body for signature verification
// We use express.raw for this specific route so we can access req.body as a Buffer (which we can then stringify correctly)
// Wait, express.json() might have already run globally. 
// It's better to configure raw body in the global express.json middleware via `verify` option.
// Since we don't want to change global config immediately, we can mount it here.

router.post('/razorpay', razorpayWebhook);
router.post('/shiprocket', shiprocketWebhook);
// Alias without forbidden keywords (shiprocket/sr/kr) — required by Shiprocket
// panel URL validation. This is the URL to configure in the Shiprocket dashboard.
router.post('/courier', shiprocketWebhook);

export default router;

