import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import path from 'path';
import { env } from './config/env.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import { errorHandler } from './middleware/errorHandler.js';
import { rateLimitGeneral } from './middleware/rateLimit/index.js';
import { sendSuccess } from './utils/ApiResponse.js';

// Import routers
import authRouter from './routes/auth.js';
import catalogRouter from './routes/catalog.js';
import cartRouter from './routes/cart.js';
import adminCatalogRouter from './routes/admin/catalog.js';
import adminInventoryRouter from './routes/admin/inventory.js';
import adminOrdersRouter from './routes/admin/orders.js';
import adminSystemRouter from './routes/admin/system.js';
import adminUploadRouter from './routes/admin/upload.js';
import adminReviewsRouter from './routes/admin/reviews.js';
import adminShippingRouter from './routes/admin/shipping.js';
import adminReturnsRouter from './routes/admin/returns.js';
import accountRouter from './routes/account.js';
import ordersRouter from './routes/orders.js';
import paymentRouter from './routes/payment.js';
import webhooksRouter from './routes/webhooks.js';
import wishlistRouter from './routes/wishlist.js';
import reviewsRouter from './routes/reviews.js';
import settingsRouter from './routes/settings.js';
import pagesRouter from './routes/pages.js';
import shippingRouter from './routes/shipping.js';
import contactRouter from './routes/contact.js';
import adminContactRouter from './routes/admin/contact.js';
import newsletterRouter from './routes/newsletter.js';
import adminNewsletterRouter from './routes/admin/newsletter.js';

export const app = express();

// Trust proxy if behind a load balancer (e.g. Nginx, Vercel)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({
  origin: [
    env.STOREFRONT_URL, 
    env.ADMIN_URL,
    'https://thelovesides.com',
    'https://www.thelovesides.com',
    'https://admin.thelovesides.com',
    'http://localhost:5173',
    'http://localhost:5174'
  ],
  credentials: true, // Allow cookies
}));
app.use(cookieParser());

// Request parsing with raw body support for webhooks
app.use(express.json({
  limit: '50mb',
  verify: (req: any, _res, buf) => {
    req.rawBody = buf.toString();
  }
}));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Compression
app.use(compression());

// Request tracing
app.use(requestIdMiddleware);

// Serve static uploaded files locally
app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads')));

// Global Rate Limiting
app.use(rateLimitGeneral);

// Health check (do not rate limit health check)
app.get('/health', (_req, res) => {
  sendSuccess({
    res,
    statusCode: 200,
    data: { status: 'healthy', timestamp: new Date().toISOString() },
  });
});

// Routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/catalog', catalogRouter);
app.use('/api/v1', cartRouter);
app.use('/api/v1/account', accountRouter);
app.use('/api/v1/orders', ordersRouter);
app.use('/api/v1/payments', paymentRouter);
app.use('/api/v1/webhooks', webhooksRouter);
app.use('/api/v1/wishlist', wishlistRouter);
app.use('/api/v1/reviews', reviewsRouter);
app.use('/api/v1/settings', settingsRouter);
app.use('/api/v1/pages', pagesRouter);
app.use('/api/v1/shipping', shippingRouter);
app.use('/api/v1/contact', contactRouter);
app.use('/api/v1/newsletter', newsletterRouter);
app.use('/api/v1/admin/catalog', adminCatalogRouter);
app.use('/api/v1/admin/inventory', adminInventoryRouter);
app.use('/api/v1/admin/upload', adminUploadRouter);
app.use('/api/v1/admin/reviews', adminReviewsRouter);
app.use('/api/v1/admin', adminSystemRouter);
app.use('/api/v1/admin', adminOrdersRouter);
app.use('/api/v1/admin/returns', adminReturnsRouter);
app.use('/api/v1/admin', adminShippingRouter);
app.use('/api/v1/admin', adminContactRouter);
app.use('/api/v1/admin', adminNewsletterRouter);

// Global Error Handler (must be last)
app.use(errorHandler);
