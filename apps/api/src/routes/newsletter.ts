import { Router } from 'express';
import { subscribeNewsletter } from '../controllers/newsletter.js';

const router = Router();

router.post('/subscribe', subscribeNewsletter);

export default router;
