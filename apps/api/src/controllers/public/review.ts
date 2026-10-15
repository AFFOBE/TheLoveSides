import type { Request, Response, NextFunction } from 'express';
import { Review } from '../../models/Review.js';
import { Order } from '../../models/Order.js';
import { sendSuccess, sendPaginated } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';

export async function checkHasReviewed(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { productId } = req.params;
    if (!req.user) {
      sendSuccess({ res, data: { hasReviewed: false, canReview: false } });
      return;
    }
    
    const existingReview = await Review.findOne({ userId: req.user.id, productId });
    
    // Check if user has purchased the product
    const hasPurchased = await Order.exists({
      userId: req.user.id,
      status: { $in: ['DELIVERED', 'SHIPPED', 'PAID'] },
      'items.productId': productId,
    });

    sendSuccess({ res, data: { hasReviewed: !!existingReview, canReview: !!hasPurchased } });
  } catch (error) {
    next(error);
  }
}

export async function submitReview(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { productId, rating, title, content, images, videos } = req.body;

    // Validate that the user actually purchased the product
    const hasPurchased = await Order.exists({
      userId: req.user!.id,
      status: { $in: ['DELIVERED', 'SHIPPED', 'PAID'] },
      'items.productId': productId,
    });

    if (!hasPurchased) {
      throw ApiError.badRequest('Only verified buyers can review this product');
    }

    const isVerifiedPurchase = true;

    // Prevent multiple reviews for the same product by the same user
    const existingReview = await Review.findOne({ userId: req.user!.id, productId });
    if (existingReview) {
      throw ApiError.badRequest('You have already reviewed this product');
    }

    const review = await Review.create({
      productId,
      userId: req.user!.id,
      rating,
      title,
      content,
      images: images || [],
      videos: videos || [],
      isVerifiedPurchase,
      status: 'pending', // Needs admin approval to show up
    });

    sendSuccess({ res, data: review, message: 'Review submitted and is awaiting approval', statusCode: 201 });
  } catch (error) {
    next(error);
  }
}

export async function getProductReviews(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { productId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const skip = (page - 1) * limit;

    const query = { productId, status: 'approved' };

    const [reviews, total] = await Promise.all([
      Review.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'firstName lastName')
        .lean(),
      Review.countDocuments(query),
    ]);

    sendPaginated(res, reviews, {
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
