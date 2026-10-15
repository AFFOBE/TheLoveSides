import type { Request, Response, NextFunction } from 'express';
import { NewsletterSubscriber } from '../../models/NewsletterSubscriber.js';
import { sendSuccess, sendPaginated } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';

// Admin endpoint: Get all newsletter subscribers with pagination
export async function listSubscribers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;

    const query: any = {};
    if (status) query.status = status;
    if (search) query.email = { $regex: search, $options: 'i' };

    const [subscribers, total] = await Promise.all([
      NewsletterSubscriber.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      NewsletterSubscriber.countDocuments(query),
    ]);

    sendPaginated(res, subscribers, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPreviousPage: page > 1,
    });
  } catch (error) {
    next(error);
  }
}

// Admin endpoint: Update a subscriber's status
export async function updateSubscriberStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    const { status } = req.body;

    if (!['active', 'unsubscribed'].includes(status)) {
      throw ApiError.badRequest('Invalid status');
    }

    const subscriber = await NewsletterSubscriber.findByIdAndUpdate(id, { status }, { new: true });
    if (!subscriber) {
      throw ApiError.notFound('Subscriber');
    }

    sendSuccess({ res, data: subscriber, message: 'Subscriber status updated' });
  } catch (error) {
    next(error);
  }
}

// Admin endpoint: Delete a subscriber
export async function deleteSubscriber(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    const subscriber = await NewsletterSubscriber.findByIdAndDelete(id);
    if (!subscriber) {
      throw ApiError.notFound('Subscriber');
    }

    sendSuccess({ res, message: 'Subscriber deleted successfully' });
  } catch (error) {
    next(error);
  }
}
