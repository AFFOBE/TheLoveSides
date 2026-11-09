import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import StarRating from './StarRating';
import Button from './Button';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useFlyToCart } from '../../context/FlyToCartContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function ProductCard({ product, layout = 'auto' }) {
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { triggerFlyToCart } = useFlyToCart();
  const [added, setAdded] = useState(false);
  const imageRef = React.useRef(null);
  
  const isWishlisted = isInWishlist(product.id || product._id);
  
  const baseImage = product.image || product.images?.[0] || product.variants?.[0]?.images?.[0] || 'https://via.placeholder.com/400x500';
  
  // Calculate responsive sources if following the new scalable image naming convention
  const isScalable = typeof baseImage === 'string' && baseImage.endsWith('-large.webp');
  const imageThumb = isScalable ? baseImage.replace('-large.webp', '-thumbnail.webp') : baseImage;
  const imageMedium = isScalable ? baseImage.replace('-large.webp', '-medium.webp') : baseImage;
  
  const inStock = product.variants?.length > 0 
    ? product.variants[0].isPurchasable !== false 
    : product.isPurchasable !== false;

  const handleAddToCart = async (e) => {
    e.preventDefault(); // In case it's inside a Link or prevents event bubbling
    try {
      await addToCart(product);
      if (imageRef.current) {
        triggerFlyToCart(imageRef.current.getBoundingClientRect(), imageThumb);
      }
      setAdded(true);
      setTimeout(() => {
        setAdded(false);
      }, 1200);
    } catch (error) {
      alert(error.response?.data?.error?.message || 'Failed to add to cart. Out of stock?');
    }
  };

  if (layout === 'vertical') {
    return (
      <div className="group rounded-xl bg-ivory shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl overflow-hidden flex flex-col h-full border border-charcoal/5">
        <div className="relative w-full shrink-0 aspect-square md:aspect-[4/5] block">
          <Link to={`/product/${product.slug}`} className="cursor-pointer block h-full w-full">
            <img 
              ref={imageRef}
              src={imageThumb} 
              srcSet={isScalable ? `${imageThumb} 400w, ${imageMedium} 800w, ${baseImage} 1200w` : undefined}
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 400px"
              alt={product.name} 
              loading="lazy"
              decoding="async"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </Link>
          <button
            onClick={(e) => {
              e.preventDefault();
              toggleWishlist(product.id || product._id);
            }}
            className="absolute top-2 right-2 p-2 rounded-full bg-white/80 backdrop-blur hover:bg-white transition-colors z-10"
            aria-label="Toggle Wishlist"
          >
            <Heart 
              className={`w-4 h-4 md:w-5 md:h-5 transition-colors ${isWishlisted ? 'fill-pink-primary text-pink-primary' : 'text-charcoal hover:text-pink-primary'}`} 
            />
          </button>
        </div>
        <div className="flex flex-col flex-grow p-3 md:p-4 justify-between">
          <div>
            <Link to={`/product/${product.slug}`} className="hover:text-pink-primary transition-colors block mb-1">
              <h3 className="font-serif text-sm md:text-lg text-charcoal line-clamp-1 leading-snug">{product.name}</h3>
            </Link>
            <div className="flex justify-between items-center mt-1 md:mt-2 gap-1">
              <span className="font-sans font-semibold text-sm md:text-lg text-charcoal shrink-0">₹{Number(product.price || product.variants?.[0]?.price || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              <div className="flex items-center gap-1 shrink-0">
                <div className="scale-[0.6] sm:scale-75 md:scale-100 origin-right">
                  <StarRating value={product.rating} />
                </div>
                <span className="text-[10px] md:text-xs font-sans text-charcoal/50 whitespace-nowrap">
                  {product.reviewsCount > 0 ? `(${product.reviewsCount})` : 'No reviews'}
                </span>
              </div>
            </div>
          </div>
          <div className="mt-3 md:mt-4">
            <Button 
              variant="dark" 
              className="w-full relative overflow-hidden text-xs md:text-sm py-2 md:py-3 px-1 md:px-4 shrink-0 disabled:opacity-50" 
              onClick={handleAddToCart}
              disabled={added || !inStock}
            >
              <AnimatePresence mode="wait">
                {added ? (
                  <motion.span
                    key="added"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="block text-pink-primary whitespace-nowrap"
                  >
                    <span className="hidden sm:inline">Added ✓</span>
                    <span className="sm:hidden">✓</span>
                  </motion.span>
                ) : !inStock ? (
                  <motion.span
                    key="outofstock"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="block whitespace-nowrap"
                  >
                    <span className="hidden sm:inline">Out of Stock</span>
                    <span className="sm:hidden">No Stock</span>
                  </motion.span>
                ) : (
                  <motion.span
                    key="add"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="block whitespace-nowrap"
                  >
                    <span className="hidden sm:inline">Add to Cart</span>
                    <span className="sm:hidden">Add</span>
                  </motion.span>
                )}
              </AnimatePresence>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Original layout ('auto')
  return (
    <div className="group rounded-2xl bg-ivory shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl overflow-hidden flex flex-row sm:flex-col h-full">
      <div className="relative w-1/2 sm:w-full shrink-0 sm:aspect-[4/3] overflow-hidden rounded-l-2xl sm:rounded-l-none sm:rounded-t-2xl min-h-[150px] block">
        <Link to={`/product/${product.slug}`} className="cursor-pointer block h-full w-full">
          <img 
            ref={imageRef}
            src={imageThumb} 
            srcSet={isScalable ? `${imageThumb} 400w, ${imageMedium} 800w, ${baseImage} 1200w` : undefined}
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 400px"
            alt={product.name} 
            loading="lazy"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </Link>
        <button
          onClick={(e) => {
            e.preventDefault();
            toggleWishlist(product.id || product._id);
          }}
          className="absolute top-2 right-2 sm:top-3 sm:right-3 p-2 rounded-full bg-white/80 backdrop-blur hover:bg-white transition-colors z-10"
          aria-label="Toggle Wishlist"
        >
          <Heart 
            className={`w-4 h-4 md:w-5 md:h-5 transition-colors ${isWishlisted ? 'fill-pink-primary text-pink-primary' : 'text-charcoal hover:text-pink-primary'}`} 
          />
        </button>
      </div>
      <div className="flex flex-col flex-grow w-1/2 sm:w-full p-4 sm:p-6 justify-between">
        <div>
          <Link to={`/product/${product.slug}`} className="hover:text-pink-primary transition-colors">
            <h3 className="font-serif text-base sm:text-lg md:text-xl text-charcoal mb-1 sm:mb-2 line-clamp-2 sm:line-clamp-1 leading-snug">{product.name}</h3>
          </Link>
          <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-3 sm:mb-6 gap-1 sm:gap-0">
            <span className="font-sans font-medium text-sm sm:text-lg text-charcoal">₹{Number(product.price || product.variants?.[0]?.price || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
            <div className="flex items-center gap-1.5">
              <div className="scale-[0.70] origin-left sm:scale-100 sm:origin-center">
                <StarRating value={product.rating} />
              </div>
              <span className="text-[10px] sm:text-xs font-sans text-charcoal/50 whitespace-nowrap">
                {product.reviewsCount > 0 ? `(${product.reviewsCount})` : 'No reviews'}
              </span>
            </div>
          </div>
        </div>
        <div className="mt-auto">
          <Button 
            variant="dark" 
            className="w-full relative overflow-hidden text-sm sm:text-base px-2 sm:px-6 disabled:opacity-50" 
            onClick={handleAddToCart}
            disabled={added || !inStock}
          >
            <AnimatePresence mode="wait">
              {added ? (
                <motion.span
                  key="added"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="block text-pink-primary"
                >
                  Added ✓
                </motion.span>
              ) : !inStock ? (
                <motion.span
                  key="outofstock"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="block"
                >
                  Out of Stock
                </motion.span>
              ) : (
                <motion.span
                  key="add"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="block"
                >
                  Add to Cart
                </motion.span>
              )}
            </AnimatePresence>
          </Button>
        </div>
      </div>
    </div>
  );
}
