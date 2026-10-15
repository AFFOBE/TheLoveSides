import React, { useState } from 'react';
import { api } from '../../lib/api';
import Button from '../ui/Button';
import { Star, X, Loader2, Video } from 'lucide-react';

export default function ReviewForm({ productId, onSubmitSuccess }) {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(5);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [images, setImages] = useState([]);
  const [videos, setVideos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    setUploading(true);
    setError('');

    try {
      const newImages = [];
      const newVideos = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        const res = await api.post('/reviews/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        if (res.data?.url) {
          const mimetype = res.data.mimetype || '';
          if (mimetype.startsWith('video/')) {
            newVideos.push(res.data.url);
          } else {
            newImages.push(res.data.url);
          }
        }
      }
      if (newImages.length) setImages(prev => [...prev, ...newImages]);
      if (newVideos.length) setVideos(prev => [...prev, ...newVideos]);
    } catch (err) {
      console.error('Media upload failed', err);
      setError('Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (indexToRemove) => {
    setImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const removeVideo = (indexToRemove) => {
    setVideos(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rating || !title || !content) {
      setError('Please fill in all required fields.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await api.post('/reviews', {
        productId,
        rating,
        title,
        content,
        images,
        videos
      });
      onSubmitSuccess();
    } catch (err) {
      console.error('Review submission failed', err);
      setError(err.response?.data?.error?.message || 'Failed to submit review. Please make sure you are logged in.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
          {error}
        </div>
      )}
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Overall Rating *</label>
        <div className="flex gap-1" onMouseLeave={() => setHoverRating(rating)}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              className="p-1 focus:outline-none"
            >
              <Star 
                className={`w-6 h-6 transition-colors ${
                  star <= hoverRating ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'
                }`} 
              />
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Review Title *</label>
        <input 
          type="text" 
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Summarize your experience"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-pink-primary focus:ring-1 focus:ring-pink-primary"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Review Content *</label>
        <textarea 
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Tell us what you liked or disliked about this product."
          rows={4}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-pink-primary focus:ring-1 focus:ring-pink-primary resize-y"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Attach Photos / Videos (Optional)</label>
        <div className="flex flex-wrap gap-3">
          {images.map((url, idx) => (
            <div key={`img-${idx}`} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 group">
              <img src={url} alt="Upload preview" className="w-full h-full object-cover" />
              <button 
                type="button" 
                onClick={() => removeImage(idx)}
                className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}

          {videos.map((url, idx) => (
            <div key={`vid-${idx}`} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 group bg-black">
              <video src={url} className="w-full h-full object-cover" muted playsInline />
              <button 
                type="button" 
                onClick={() => removeVideo(idx)}
                className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          
          <label className="w-20 h-20 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
            {uploading ? (
              <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
            ) : (
              <>
                <Video className="w-5 h-5 text-gray-400 mb-1" />
                <span className="text-[10px] text-gray-500 font-medium">Add Photo/Video</span>
              </>
            )}
            <input 
              type="file" 
              accept="image/*,video/mp4,video/webm,video/quicktime" 
              multiple 
              className="hidden" 
              onChange={handleImageUpload}
              disabled={uploading}
            />
          </label>
        </div>
      </div>

      <div className="pt-4 flex justify-end">
        <Button type="submit" variant="dark" disabled={submitting || uploading}>
          {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2 inline" /> : null}
          Submit Review
        </Button>
      </div>
    </form>
  );
}
