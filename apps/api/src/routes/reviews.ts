import { Router } from 'express';
import { authenticateCustomer } from '../middleware/auth.js';
import { submitReview, getProductReviews, checkHasReviewed } from '../controllers/public/review.js';
import { reviewUploadService } from '../services/storage.service.js';
import { uploadSingle } from '../controllers/admin/upload.js';

const router = Router();

// Check if user has reviewed
router.get('/check/:productId', authenticateCustomer, checkHasReviewed);

// Publicly accessible for viewing reviews
router.get('/:productId', getProductReviews);

// Protected route for submitting reviews
router.post('/', authenticateCustomer, submitReview);

// Protected route for uploading review images
router.post('/upload', authenticateCustomer, reviewUploadService.single('file'), uploadSingle);

export default router;
