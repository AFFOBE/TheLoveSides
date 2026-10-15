import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';
import { v4 as uuidv4 } from 'uuid';

// Ensure the upload directory exists
const uploadDir = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Set up local memory storage
const storage = multer.memoryStorage();

// File filter to allow images and videos
const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/webm', 'video/quicktime',
  ];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(ApiError.badRequest('Invalid file type. Only JPEG, PNG, WEBP, GIF images and MP4, WEBM, MOV videos are allowed.'));
  }
};

/**
 * Checks whether a multer file is a video based on its MIME type.
 */
export function isVideoFile(file: Express.Multer.File): boolean {
  return file.mimetype.startsWith('video/');
}

/**
 * Saves a video buffer directly to the uploads directory.
 * Returns the generated filename.
 */
export async function saveVideo(buffer: Buffer, originalName: string): Promise<string> {
  const ext = path.extname(originalName) || '.mp4';
  const filename = `${uuidv4()}-video${ext}`;
  const filepath = path.join(uploadDir, filename);
  await fs.promises.writeFile(filepath, buffer);
  return filename;
}

export const uploadService = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: env.MAX_FILE_SIZE,
  },
});

// Separate uploader for review media so photos/videos can go up to MAX_VIDEO_FILE_SIZE
// without raising the limit for other (product/theme) uploads.
export const reviewUploadService = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: env.MAX_VIDEO_FILE_SIZE,
  },
});

/**
 * Utility function to convert an uploaded file path to a public URL.
 */
export function getPublicUrl(filename: string): string {
  // In development, return the localhost URL
  // In production, this would be the S3 or CDN URL if configured
  return `${env.API_URL}/uploads/${filename}`;
}
