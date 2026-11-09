import type { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
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
      status: 'approved', // Publish immediately so ratings/reviews go live for customers
    });

    sendSuccess({ res, data: review, message: 'Review submitted successfully', statusCode: 201 });
  } catch (error) {
    next(error);
  }
}

export async function getProductRatingStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productId as string)) {
      throw ApiError.badRequest('Invalid product id');
    }

    const stats = await Review.aggregate([
      { $match: { productId: new mongoose.Types.ObjectId(productId as string), status: 'approved' } },
      {
        $group: {
          _id: '$productId',
          average: { $avg: '$rating' },
          count: { $sum: 1 },
          ratings: { $push: '$rating' },
        },
      },
    ]);

    const breakdown: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
    const stat = stats[0];

    if (stat) {
      (stat.ratings as number[]).forEach((rating) => {
        const key = String(Math.round(rating));
        breakdown[key] = (breakdown[key] || 0) + 1;
      });
    }

    sendSuccess({
      res,
      data: {
        averageRating: stat ? Math.round(stat.average * 10) / 10 : 0,
        reviewsCount: stat ? stat.count : 0,
        breakdown,
      },
    });
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
