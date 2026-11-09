import { Router } from 'express';
import { authenticateAdmin } from '../../middleware/auth.js';
import { uploadService, mediaUploadService } from '../../services/storage.service.js';
import { uploadSingle, uploadBulk } from '../../controllers/admin/upload.js';

const router = Router();

// All upload routes require admin privileges
router.use(authenticateAdmin);

// Single file upload (field name: 'file')
router.post('/single', uploadService.single('file'), uploadSingle);

// Video upload (field name: 'file') - allows up to MAX_VIDEO_FILE_SIZE
router.post('/video', mediaUploadService.single('file'), uploadSingle);

// Bulk file upload (field name: 'files', max 10 files at once)
router.post('/bulk', uploadService.array('files', 10), uploadBulk);

export default router;
