import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import Button from '../ui/Button';
import { Star, X, Loader2, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import StarRating from '../ui/StarRating';
import ReviewForm from './ReviewForm';

const EMPTY_BREAKDOWN = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };

export default function ProductReviews({ productId }) {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({ averageRating: 0, reviewsCount: 0, breakdown: EMPTY_BREAKDOWN });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (productId) {
      fetchReviews();
      fetchStats();
      if (isAuthenticated) {
        checkHasReviewed();
      }
    }
  }, [productId, isAuthenticated]);

  const checkHasReviewed = async () => {
    try {
      const res = await api.get(`/reviews/check/${productId}`);
      if (res.data) {
        setHasReviewed(res.data.hasReviewed);
        setCanReview(res.data.canReview);
      }
    } catch (error) {
      console.error('Failed to check review status', error);
    }
  };

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/reviews/${productId}`);
      setReviews(res.data || []);
    } catch (error) {
      console.error('Failed to fetch reviews', error);
    } finally {
      setLoading(false);
    }
  };

  // Real, aggregated rating data straight from approved customer reviews.
  const fetchStats = async () => {
    try {
      const res = await api.get(`/reviews/stats/${productId}`);
      setStats({
        averageRating: res.data?.averageRating || 0,
        reviewsCount: res.data?.reviewsCount || 0,
        breakdown: { ...EMPTY_BREAKDOWN, ...(res.data?.breakdown || {}) },
      });
    } catch (error) {
      console.error('Failed to fetch rating stats', error);
    }
  };

  const handleReviewSubmit = () => {
    setShowForm(false);
    setHasReviewed(true);
    fetchReviews();
    fetchStats();
  };

  const totalReviews = Number(stats.reviewsCount) || 0;

  return (
    <div className="mt-16 pt-12 border-t border-gray-200">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-serif text-charcoal">Customer Reviews</h2>
          <p className="text-sm font-sans text-charcoal/50 mt-1">
            {totalReviews > 0
              ? `${totalReviews} ${totalReviews === 1 ? 'review' : 'reviews'} from verified buyers`
              : 'No reviews yet — be the first to share your experience'}
          </p>
        </div>
        {!showForm && !hasReviewed && canReview && (
          <Button variant="outline" onClick={() => setShowForm(true)}>
            Write a Review
          </Button>
        )}
        {!showForm && hasReviewed && (
          <div className="flex items-center text-green-600 gap-2 bg-green-50 px-4 py-2 rounded-lg text-sm font-medium">
            <CheckCircle className="w-4 h-4" /> Thanks for your review!
          </div>
        )}
      </div>

      {/* Live rating summary */}
      {totalReviews > 0 && (
        <div className="grid md:grid-cols-[260px_1fr] gap-6 md:gap-10 bg-[#fdecf4]/60 rounded-2xl p-6 md:p-8 mb-10">
          <div className="flex flex-col items-center justify-center text-center md:border-r md:border-charcoal/10 md:pr-8">
            <span className="font-serif text-5xl text-charcoal leading-none">
              {Number(stats.averageRating).toFixed(1)}
            </span>
            <div className="my-3">
              <StarRating value={stats.averageRating} />
            </div>
            <span className="text-xs font-sans uppercase tracking-[0.15em] text-charcoal/50">
              Based on {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}
            </span>
          </div>

          <div className="space-y-2 self-center">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = Number(stats.breakdown?.[String(star)]) || 0;
              const percent = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
              return (
                <div key={star} className="flex items-center gap-3">
                  <span className="flex items-center gap-1 w-10 shrink-0 text-xs font-sans text-charcoal/60">
                    {star}
                    <Star className="w-3 h-3 fill-gold text-gold" />
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-charcoal/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-pink-primary transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className="w-10 text-right text-xs font-sans text-charcoal/50">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <AnimatePresence>
        {showForm && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-12"
          >
            <div className="bg-gray-50 p-6 rounded-2xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-serif font-semibold">Write your review</h3>
                <button onClick={() => setShowForm(false)} className="p-2 text-gray-500 hover:text-charcoal rounded-full hover:bg-gray-200 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <ReviewForm productId={productId} onSubmitSuccess={handleReviewSubmit} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-pink-primary" />
        </div>
      ) : reviews.length > 0 ? (
        <div className="space-y-8">
          {reviews.map((review) => (
            <ReviewItem key={review._id} review={review} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-2xl">
          <p className="text-gray-500 mb-4">No reviews yet for this product.</p>
          {!showForm && !hasReviewed && canReview && (
            <Button variant="dark" onClick={() => setShowForm(true)}>
              Be the first to review
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function ReviewItem({ review }) {
  return (
    <div className="border-b border-gray-100 pb-8 last:border-0 last:pb-0">
      <div className="flex items-center gap-2 mb-2">
        <div className="flex">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star 
              key={star} 
              className={`w-4 h-4 ${star <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'}`} 
            />
          ))}
        </div>
        <span className="text-sm font-semibold text-charcoal ml-2">
          {review.title}
        </span>
      </div>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="text-sm text-gray-500 font-medium">
          {review.userId?.firstName ? `${review.userId.firstName} ${review.userId.lastName}` : (review.customerName || 'Verified Buyer')}
        </span>
        {review.isVerifiedPurchase && (
          <span className="inline-flex items-center gap-1 text-[11px] font-sans text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
            <CheckCircle className="w-3 h-3" /> Verified
          </span>
        )}
        <span className="text-xs text-gray-400">
          {new Date(review.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
      </div>
      <p className="text-gray-600 text-sm leading-relaxed mb-4">
        {review.content}
      </p>
      
      {/* Review Videos */}
      {review.videos && review.videos.length > 0 && (
        <div className="flex flex-wrap gap-3 mt-4">
          {review.videos.map((video, idx) => (
            <video
              key={`video-${idx}`}
              src={video}
              controls
              playsInline
              className="w-40 h-40 rounded-lg border border-gray-200 bg-black object-cover"
            />
          ))}
        </div>
      )}

      {/* Review Images */}
      {review.images && review.images.length > 0 && (
        <div className="flex flex-wrap gap-3 mt-4">
          {review.images.map((img, idx) => (
            <a 
              key={idx} 
              href={img} 
              target="_blank" 
              rel="noopener noreferrer"
              className="block w-20 h-20 rounded-lg overflow-hidden border border-gray-200 hover:opacity-80 transition-opacity"
            >
              <img src={img} alt="Review attachment" className="w-full h-full object-cover" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
