import { Request, Response } from 'express';
import { NewsletterSubscriber } from '../models/NewsletterSubscriber.js';
import { sendNewsletterWelcomeEmail } from '../services/notification.service.js';
import { sendSuccess, sendError } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Public endpoint: Subscribe to the newsletter (footer "Join" form)
export const subscribeNewsletter = async (req: Request, res: Response) => {
  try {
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const source = req.body?.source ? String(req.body.source).trim().slice(0, 50) : 'footer';

    if (!email || !EMAIL_RE.test(email)) {
      throw ApiError.badRequest('Please enter a valid email address');
    }

    const existing = await NewsletterSubscriber.findOne({ email });

    if (existing) {
      if (existing.status !== 'active') {
        existing.status = 'active';
        await existing.save();
      }
      sendSuccess({ res, data: { email: existing.email }, message: 'You are subscribed!' });
      return;
    }

    await NewsletterSubscriber.create({ email, source });

    await sendNewsletterWelcomeEmail(email);

    sendSuccess({ res, statusCode: 201, data: { email }, message: 'You are subscribed!' });
  } catch (error: any) {
    const statusCode = error instanceof ApiError ? error.statusCode : 500;
    const code = error instanceof ApiError ? error.code : 'INTERNAL_SERVER_ERROR';
    sendError(res, statusCode, code, error.message || 'Server error');
  }
};
