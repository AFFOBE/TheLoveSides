import { Router } from 'express';
import { authenticateAdmin } from '../../middleware/auth.js';
import {
  listSubscribers,
  updateSubscriberStatus,
  deleteSubscriber,
} from '../../controllers/admin/newsletter.js';

const router = Router();

// Protect all admin newsletter routes
router.use(authenticateAdmin);

router.get('/newsletter', listSubscribers);
router.patch('/newsletter/:id/status', updateSubscriberStatus);
router.delete('/newsletter/:id', deleteSubscriber);

export default router;
