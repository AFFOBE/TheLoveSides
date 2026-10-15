import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Check, X, Eye, Film } from 'lucide-react';

export default function ReviewsList() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      const { data } = await api.get('/admin/reviews');
      setReviews(data.data || []);
    } catch (error) {
      console.error('Failed to fetch reviews', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/admin/reviews/${id}/status`, { status });
      setReviews(reviews.map(r => r._id === id ? { ...r, status } : r));
    } catch (error) {
      alert('Failed to update review status');
    }
  };

  if (loading) return <div className="animate-pulse">Loading reviews...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-serif font-bold text-charcoal">Reviews</h1>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-charcoal/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-ivory text-sm text-charcoal/60 border-b border-charcoal/10">
                <th className="p-4 font-medium">Product</th>
                <th className="p-4 font-medium">User</th>
                <th className="p-4 font-medium">Rating</th>
                <th className="p-4 font-medium">Comment</th>
                <th className="p-4 font-medium">Media</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((review) => (
                <tr key={review._id} className="border-b border-charcoal/5 hover:bg-ivory/50">
                  <td className="p-4">
                    <p className="text-sm font-medium text-charcoal">{review.productId?.name}</p>
                  </td>
                  <td className="p-4">
                    <p className="text-sm text-charcoal">{review.userId?.firstName} {review.userId?.lastName}</p>
                    <p className="text-xs text-charcoal/60">{review.userId?.email}</p>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span key={i} className={`text-sm ${i < review.rating ? 'text-yellow-400' : 'text-gray-300'}`}>
                          ★
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-4">
                    <p className="text-sm font-medium text-charcoal">{review.title}</p>
                    <p className="text-sm text-charcoal/70 line-clamp-2">{review.content}</p>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {(review.images || []).slice(0, 3).map((src, i) => (
                        <a key={`img-${i}`} href={src} target="_blank" rel="noopener noreferrer" title="View image">
                          <img src={src} alt="review" className="w-10 h-10 object-cover rounded-md border border-charcoal/10" />
                        </a>
                      ))}
                      {(review.videos || []).slice(0, 1).map((src, i) => (
                        <a
                          key={`vid-${i}`}
                          href={src}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="View video"
                          className="w-10 h-10 flex items-center justify-center rounded-md border border-charcoal/10 bg-ivory text-charcoal/60 hover:text-charcoal transition-colors"
                        >
                          <Film className="w-4 h-4" />
                        </a>
                      ))}
                      {(!review.images?.length && !review.videos?.length) && (
                        <span className="text-xs text-charcoal/30">—</span>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                      ${review.status === 'approved' ? 'bg-green-100 text-green-800' : 
                        review.status === 'rejected' ? 'bg-red-100 text-red-800' : 
                        review.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-gray-100 text-gray-800'}`}>
                      {review.status.charAt(0).toUpperCase() + review.status.slice(1)}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {review.status !== 'approved' && (
                        <button 
                          onClick={() => updateStatus(review._id, 'approved')}
                          title="Approve"
                          className="p-2 text-green-600 hover:bg-green-50 rounded transition-colors"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      {review.status !== 'rejected' && (
                        <button 
                          onClick={() => updateStatus(review._id, 'rejected')}
                          title="Reject"
                          className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {reviews.length === 0 && (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-charcoal/50 text-sm">
                    No reviews found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
