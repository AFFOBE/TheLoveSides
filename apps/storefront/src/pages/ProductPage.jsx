import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Check, ChevronDown, Info, Ruler, Truck, Shield, RefreshCw, Calendar, Star, Award, Sparkles, Heart, Film } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useFlyToCart } from '../context/FlyToCartContext';
import { useTheme } from '../context/ThemeContext';
import { useProduct, useProducts } from '../hooks/useProducts';
import { api } from '../lib/api';
import Button from '../components/ui/Button';
import StarRating from '../components/ui/StarRating';
import ProductCard from '../components/ui/ProductCard';
import ProductReviews from '../components/product/ProductReviews';
import ImageZoomViewer from '../components/ui/ImageZoomViewer';
import { motion, AnimatePresence } from 'framer-motion';

export default function ProductPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { triggerFlyToCart } = useFlyToCart();
  const { shipping } = useTheme();
  const mainImageRef = React.useRef(null);
  const { product, loading } = useProduct(slug);
  const { products: relatedProductsArray } = useProducts({ limit: 4 });
  
  const [selectedOptions, setSelectedOptions] = useState({});
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [activeTab, setActiveTab] = useState('description');
  const [openDropdown, setOpenDropdown] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);

  // Max 6 videos per product, always in upload order.
  const productVideos = (product?.videos || []).slice(0, 6);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.custom-dropdown')) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Pincode state
  const [pincode, setPincode] = useState('');
  const [checkingPincode, setCheckingPincode] = useState(false);
  const [serviceability, setServiceability] = useState(null);
  const [pincodeError, setPincodeError] = useState('');

  // Mock related products (excluding current product)
  const relatedProducts = relatedProductsArray.filter(p => p.slug !== slug).slice(0, 3);

  useEffect(() => {
    // Scroll to top when loading a new product page
    window.scrollTo(0, 0);
  }, [slug]);

  // Initialize selected options when product loads
  useEffect(() => {
    if (product?.attributes?.length > 0) {
      const initialOptions = {};
      product.attributes.forEach(attr => {
        if (attr.values?.length > 0) {
          initialOptions[attr.name] = attr.values[0];
        }
      });
      setSelectedOptions(initialOptions);
    }
  }, [product]);

  // Update selected variant when options change
  useEffect(() => {
    if (product?.variants?.length > 0 && Object.keys(selectedOptions).length > 0) {
      const match = product.variants.find(v => {
        return v.attributes?.every(a => selectedOptions[a.name] === a.value);
      });
      setSelectedVariant(match || null);
    } else if (product?.variants?.length > 0 && (!product.attributes || product.attributes.length === 0)) {
      // Base product with no attributes
      setSelectedVariant(product.variants[0]);
    }
  }, [selectedOptions, product]);

  if (loading) {
    return (
      <div className="pt-32 pb-20 px-6 text-center min-h-[60vh] flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-primary mb-4"></div>
        <p className="text-gray-500">Loading product...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="pt-32 pb-20 px-6 text-center min-h-[60vh] flex flex-col items-center justify-center">
        <h1 className="text-3xl font-serif text-charcoal mb-4">Product Not Found</h1>
        <p className="text-gray-500 mb-8">We couldn't find the product you're looking for.</p>
        <Button onClick={() => navigate('/')}>Return Home</Button>
      </div>
    );
  }

  const handleOptionSelect = (attrName, value) => {
    setSelectedOptions(prev => ({ ...prev, [attrName]: value }));
  };

  const currentPrice = selectedVariant?.price || product.price;
  const currentComparePrice = selectedVariant?.compareAtPrice || product.compareAtPrice;
  const inStock = selectedVariant ? selectedVariant.isPurchasable : true;
  const isWishlisted = isInWishlist(product?.id || product?._id);
  const isFreeShipping = shipping?.sitewideFreeShipping || (shipping?.freeShippingThreshold > 0 && currentPrice >= shipping.freeShippingThreshold);

  const handleAddToCart = async (e) => {
    e.preventDefault();
    try {
      await addToCart(product, quantity, selectedVariant?._id || selectedVariant?.id);
      if (mainImageRef.current) {
        triggerFlyToCart(mainImageRef.current.getBoundingClientRect(), product.image);
      }
      setAdded(true);
      setTimeout(() => setAdded(false), 1500);
    } catch (error) {
      alert(error.response?.data?.error?.message || 'Failed to add to cart. Out of stock?');
    }
  };

  const handleCheckPincode = async () => {
    if (!/^\d{6}$/.test(pincode)) {
      setPincodeError('Please enter a valid 6-digit PIN code');
      setServiceability(null);
      return;
    }

    setCheckingPincode(true);
    setPincodeError('');
    setServiceability(null);

    try {
      const { data } = await api.get(`/shipping/check?pincode=${pincode}`);
      setServiceability(data);
    } catch (err) {
      setPincodeError(err.response?.data?.message || 'Failed to check pincode. Please try again.');
    } finally {
      setCheckingPincode(false);
    }
  };

  return (
    <div className="pt-28 md:pt-36 pb-32 md:pb-20 bg-cream min-h-screen">
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-20">
          
          {/* Left Column: Images (Sticky) */}
          <div ref={mainImageRef} className={`w-full lg:w-5/12 lg:sticky lg:top-32 self-start flex flex-col gap-4 relative ${isFullscreen ? 'z-[100000]' : 'z-40'}`}>
            <ImageZoomViewer images={product.images || [product.image]} onFullscreenChange={setIsFullscreen} />

            {productVideos.length > 0 && (
              <div className="w-full bg-white rounded-2xl border border-charcoal/5 p-3">
                <div className="flex items-center justify-between gap-2 px-2 pt-1 pb-3">
                  <div className="flex items-center gap-2">
                    <Film className="w-4 h-4 text-charcoal/60" />
                    <h3 className="text-sm font-semibold text-charcoal">Product Videos</h3>
                  </div>
                  <span className="text-[10px] font-sans text-charcoal/40">
                    {productVideos.length}/6
                  </span>
                </div>

                {/* Mobile: continuous right-to-left auto slider */}
                <div className="lg:hidden relative overflow-hidden -mx-1 px-1">
                  <div
                    className="flex gap-3 w-max animate-video-marquee will-change-transform"
                    style={{
                      animationDuration: `${Math.max(12, productVideos.length * 6)}s`,
                      animationPlayState: videoPlaying ? 'paused' : 'running',
                    }}
                  >
                    {[...productVideos, ...productVideos].map((video, idx) => (
                      <div key={`mobile-video-${idx}`} className="shrink-0 w-[78vw] max-w-[320px]">
                        <video
                          src={video}
                          controls
                          playsInline
                          preload="metadata"
                          onPlay={() => setVideoPlaying(true)}
                          onPause={() => setVideoPlaying(false)}
                          onEnded={() => setVideoPlaying(false)}
                          className="w-full h-52 rounded-xl bg-black object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Desktop: stacked list */}
                <div className="hidden lg:block space-y-3">
                  {productVideos.map((video, idx) => (
                    <video
                      key={`product-video-${idx}`}
                      src={video}
                      controls
                      playsInline
                      preload="metadata"
                      className="w-full rounded-xl bg-black max-h-[420px] object-contain"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Details (Scrollable) */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="w-full lg:w-7/12 flex flex-col pb-10 lg:pl-8 relative z-10"
          >
            <h1 className="text-3xl md:text-5xl font-serif text-charcoal mb-4 leading-tight">
              {product.name}
            </h1>
            
            <div className="flex items-center gap-4 mb-4">
              <span className="text-3xl font-sans font-medium text-red-700">
                ₹{Number(currentPrice).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </span>
              {currentComparePrice > currentPrice && (
                <span className="text-xl font-sans text-gray-400 line-through">
                  ₹{Number(currentComparePrice).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </span>
              )}
              <button
                type="button"
                onClick={() => document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className="flex items-center gap-2 border-l border-gray-300 pl-4 ml-2 hover:opacity-80 transition-opacity"
                aria-label="See customer reviews"
              >
                <span className="text-sm font-semibold text-charcoal">{(Number(product.rating) || 0).toFixed(1)}</span>
                <StarRating value={product.rating} />
                <span className="text-sm text-gray-500 font-medium">
                  ({product.reviewsCount || 0} {Number(product.reviewsCount) === 1 ? 'review' : 'reviews'})
                </span>
              </button>
            </div>

            <div className="flex items-center gap-2 mb-8">
              {inStock ? (
                <>
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                  </span>
                  <span className="text-sm font-sans font-medium text-green-700">
                    In Stock — Delivery in {shipping?.estimatedDeliveryMin || 9} - {shipping?.estimatedDeliveryMax || 10} days
                  </span>
                </>
              ) : (
                <>
                  <span className="relative flex h-3 w-3">
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                  <span className="text-sm font-sans font-medium text-red-700">Out of Stock</span>
                </>
              )}
            </div>

            <div className="h-px w-full bg-charcoal/10 mb-8"></div>

            {/* Options */}
            <div className="flex flex-col gap-6 mb-10">
              
              {/* Dynamic Options */}
              {product.attributes?.map((attr, idx) => {
                const isColor = attr.name.toLowerCase().includes('color');
                
                const getDisplayName = (val) => isColor ? val.replace(/\s*\(#[^\)]+\)\s*/g, '') : val;
                const getHex = (val) => {
                  const match = val.match(/\((#[^\)]+)\)/);
                  return match ? match[1] : (val.startsWith('#') || val.startsWith('rgb') ? val : val.toLowerCase().replace(/[^a-z]/g, '') || '#ccc');
                };

                return (
                  <div key={idx}>
                    <span className="font-sans font-semibold text-charcoal block mb-3">
                      {attr.name}: <span className="font-normal text-gray-600">{selectedOptions[attr.name] ? getDisplayName(selectedOptions[attr.name]) : ''}</span>
                    </span>
                    
                    {isColor ? (
                      <div className="flex flex-wrap gap-4">
                        {attr.values.map((val) => {
                          const isSelected = selectedOptions[attr.name] === val;
                          return (
                            <button 
                              key={val}
                              onClick={() => handleOptionSelect(attr.name, val)}
                              className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                                isSelected ? 'ring-2 ring-offset-2 ring-pink-primary' : 'ring-1 ring-gray-200 hover:ring-pink-primary/50'
                              }`}
                              title={getDisplayName(val)}
                            >
                              <span 
                                className="w-8 h-8 rounded-full shadow-inner border border-black/5" 
                                style={{ backgroundColor: getHex(val) }}
                              />
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="relative w-full sm:w-72 custom-dropdown">
                        <button
                          type="button"
                          onClick={() => setOpenDropdown(openDropdown === attr.name ? null : attr.name)}
                          className={`w-full bg-white border ${openDropdown === attr.name ? 'border-pink-primary ring-1 ring-pink-primary' : 'border-charcoal/20'} text-charcoal py-3.5 px-5 rounded-xl text-left text-sm font-medium transition-all shadow-sm hover:border-pink-primary flex items-center justify-between group`}
                        >
                          <span className={selectedOptions[attr.name] ? 'text-charcoal' : 'text-charcoal/50'}>
                            {selectedOptions[attr.name] || `Select ${attr.name}`}
                          </span>
                          <ChevronDown className={`w-5 h-5 text-charcoal/60 transition-transform duration-300 group-hover:text-pink-primary ${openDropdown === attr.name ? 'rotate-180 text-pink-primary' : ''}`} />
                        </button>
                        
                        <AnimatePresence>
                          {openDropdown === attr.name && (
                            <motion.div
                              initial={{ opacity: 0, y: -10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -10, scale: 0.95 }}
                              transition={{ duration: 0.15 }}
                              className="absolute z-50 w-full mt-2 bg-white border border-charcoal/10 rounded-xl shadow-xl overflow-hidden"
                            >
                              <ul className="max-h-60 overflow-y-auto py-1">
                                {attr.values.map((val) => {
                                  const isSelected = selectedOptions[attr.name] === val;
                                  return (
                                    <li key={val}>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          handleOptionSelect(attr.name, val);
                                          setOpenDropdown(null);
                                        }}
                                        className={`w-full text-left px-5 py-3 text-sm transition-colors flex items-center justify-between ${isSelected ? 'bg-pink-50 text-pink-primary font-semibold' : 'text-charcoal hover:bg-gray-50'}`}
                                      >
                                        {val}
                                        {isSelected && <Check className="w-4 h-4 text-pink-primary" />}
                                      </button>
                                    </li>
                                  );
                                })}
                              </ul>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Quantity */}
              <div>
                <span className="font-sans font-semibold text-charcoal block mb-3">Quantity</span>
                <div className="flex items-center border border-charcoal/20 rounded-xl w-32 bg-white">
                  <button 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-12 flex items-center justify-center text-charcoal hover:text-pink-primary transition-colors"
                  >
                    -
                  </button>
                  <span className="flex-grow text-center font-medium font-sans">{quantity}</span>
                  <button 
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-10 h-12 flex items-center justify-center text-charcoal hover:text-pink-primary transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

            </div>

            {/* Add to Cart & Wishlist Actions */}
            <div className="flex gap-4 mb-4">
              <Button 
                variant="dark" 
                className="flex-grow py-4 text-lg font-medium shadow-xl hover:-translate-y-1 relative overflow-hidden disabled:opacity-50 disabled:hover:-translate-y-0"
                onClick={handleAddToCart}
                disabled={added || !inStock}
              >
                <AnimatePresence mode="wait">
                  {added ? (
                    <motion.span
                      key="added"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      className="flex items-center justify-center gap-2 text-pink-primary-light"
                    >
                      <Check className="w-5 h-5" /> Added to Cart
                    </motion.span>
                  ) : !inStock ? (
                    <motion.span
                      key="outofstock"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      className="block"
                    >
                      Out of Stock
                    </motion.span>
                  ) : (
                    <motion.span
                      key="add"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      className="block"
                    >
                      Add to Cart - ₹{Number(currentPrice * quantity).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  toggleWishlist(product.id || product._id);
                }}
                className={`w-[72px] shrink-0 flex items-center justify-center rounded-xl border transition-all shadow-sm hover:shadow-md hover:-translate-y-1 ${isWishlisted ? 'bg-pink-50 border-pink-primary' : 'bg-white border-charcoal/20 hover:border-pink-primary'}`}
                aria-label="Toggle Wishlist"
              >
                <Heart className={`w-7 h-7 transition-colors ${isWishlisted ? 'fill-pink-primary text-pink-primary' : 'text-charcoal'}`} />
              </button>
            </div>
            
            {/* Delivery Estimate Box */}
            <div className="mb-6 p-5 rounded-2xl border border-charcoal/10 bg-white shadow-sm">
              <h3 className="text-sm font-sans font-semibold text-charcoal mb-3 flex items-center gap-2">
                <Truck className="w-4 h-4 text-pink-primary" /> Delivery Options
              </h3>
              
              <div className="flex gap-2 mb-3">
                <input 
                  type="text" 
                  placeholder="Enter PIN Code" 
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-charcoal/20 focus:outline-none focus:border-pink-primary font-sans text-sm bg-gray-50/50"
                  maxLength={6}
                />
                <Button 
                  variant="outline" 
                  className="px-6 py-2.5 !rounded-xl"
                  onClick={handleCheckPincode}
                  disabled={checkingPincode || pincode.length !== 6}
                >
                  {checkingPincode ? 'Checking...' : 'Check'}
                </Button>
              </div>

              {pincodeError && (
                <p className="text-xs text-red-500 font-sans mt-1">{pincodeError}</p>
              )}

              <AnimatePresence>
                {serviceability && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 pt-4 border-t border-charcoal/5"
                  >
                    {serviceability.serviceable ? (
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-charcoal">Delivery available to {pincode}</p>
                            <p className="text-xs text-gray-600 mt-0.5">
                              Usually delivers in {serviceability.estimatedDays || `${shipping?.estimatedDeliveryMin || 9} - ${shipping?.estimatedDeliveryMax || 10}`} days
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-3">
                        <Info className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        <p className="text-sm font-medium text-red-600">Sorry, delivery is currently not available for this PIN code.</p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {/* Guarantee Badges */}
            <div className="grid grid-cols-2 gap-2 mt-4 pt-6 border-t border-charcoal/10">
              <div className="flex flex-col items-center text-center gap-2 border-r border-charcoal/10">
                <Truck className="w-6 h-6 text-gray-400" />
                <span className="text-[10px] md:text-xs font-sans text-gray-500 uppercase tracking-wider">
                  {isFreeShipping ? 'Free Shipping' : `Free Shipping over ₹${shipping?.freeShippingThreshold || 0}`}
                </span>
              </div>
              <div className="flex flex-col items-center text-center gap-2">
                <Shield className="w-6 h-6 text-gray-400" />
                <span className="text-[10px] md:text-xs font-sans text-gray-500 uppercase tracking-wider">Secure Checkout</span>
              </div>
            </div>

            {/* Why You'll Love It — sirf tab dikhta hai jab product me highlights hon */}
            {product.highlights && product.highlights.length > 0 && (
              <div className="mt-8 bg-cream/50 p-6 rounded-2xl border border-charcoal/5">
                <h3 className="font-serif text-xl text-charcoal mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-pink-primary" /> Why You'll Love It
                </h3>
                <ul className="space-y-3">
                  {product.highlights.map((highlight, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                      <span className="text-sm font-sans text-gray-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: highlight }} />
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Accordion Tabs */}
            <div className="mt-8 border-t border-charcoal/10">
              {['description', 'specifications', 'shipping'].map((tab) => (
                <div key={tab} className="border-b border-charcoal/10">
                  <button 
                    onClick={() => setActiveTab(activeTab === tab ? '' : tab)}
                    className="w-full py-5 flex items-center justify-between font-serif text-lg text-charcoal focus:outline-none group"
                  >
                    <div className="flex items-center gap-3">
                      {tab === 'description' && <Info className="w-5 h-5 text-gray-400 group-hover:text-pink-primary transition-colors" />}
                      {tab === 'specifications' && <Ruler className="w-5 h-5 text-gray-400 group-hover:text-pink-primary transition-colors" />}
                      {tab === 'shipping' && <Truck className="w-5 h-5 text-gray-400 group-hover:text-pink-primary transition-colors" />}
                      <span className="capitalize">{tab}</span>
                    </div>
                    <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${activeTab === tab ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {activeTab === tab && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="pb-6 text-gray-600 font-sans text-sm leading-relaxed pl-8">
                          {tab === 'description' && (
                            <div dangerouslySetInnerHTML={{ __html: product.description || "Our signature curtains are woven with uncompromising attention to detail. Designed to drape beautifully from the moment they are hung, they offer the perfect balance of privacy and natural light." }} />
                          )}
                          {tab === 'specifications' && (
                            <div className="space-y-6">
                              <div dangerouslySetInnerHTML={{ __html: product.specifications || "Sold as single panels. 100% premium fabric. Dry clean only. Includes matching tie-back. Stainless steel grommets or rod pocket available upon request." }} />
                              
                              {product.specificationTable && product.specificationTable.length > 0 && (
                                <div className="mt-8">
                                  <div className="flex flex-col gap-1 sm:gap-2">
                                    {product.specificationTable.map((row, idx) => (
                                      <div key={idx} className="flex flex-row items-start gap-3 p-3 sm:p-5 rounded-2xl hover:bg-pink-50/40 transition-colors duration-300 group">
                                        <div className="w-1/3 shrink-0 font-semibold text-charcoal/80 text-xs sm:text-sm font-sans group-hover:text-charcoal transition-colors tracking-wide break-words">{row.name}</div>
                                        <div className="w-2/3 min-w-0 text-gray-600 text-xs sm:text-sm leading-relaxed font-sans group-hover:text-gray-900 transition-colors break-words">{row.value}</div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                          {tab === 'shipping' && (
                            <div>
                              {isFreeShipping 
                                ? `This product is eligible for FREE shipping! Standard delivery takes ${shipping?.estimatedDeliveryMin || 9} - ${shipping?.estimatedDeliveryMax || 10} business days.` 
                                : `Free standard shipping on all orders over ₹${shipping?.freeShippingThreshold || 200}. Standard delivery takes ${shipping?.estimatedDeliveryMin || 9} - ${shipping?.estimatedDeliveryMax || 10} business days.`}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>

          </motion.div>
        </div>
      </div>

      {/* Product Reviews */}
      <div id="reviews" className="max-w-7xl mx-auto px-6 md:px-10 scroll-mt-40">
        <ProductReviews productId={product.id} />
      </div>

      {/* Related Products Section */}
      <div className="max-w-7xl mx-auto px-6 md:px-10 mt-20 md:mt-32 border-t border-charcoal/10 pt-20">
        <div className="text-center mb-12">
          <span className="text-pink-primary font-sans font-semibold tracking-widest text-xs uppercase block mb-3">Complete The Look</span>
          <h2 className="text-3xl md:text-4xl font-serif text-charcoal">Related Products</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12 max-w-4xl mx-auto">
          {relatedProducts.map(related => (
            <ProductCard key={related.id} product={related} />
          ))}
        </div>
      </div>

      {/* Mobile Sticky Add to Cart Bar */}
      {!isFullscreen && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 px-6 z-50 md:hidden flex justify-between items-center shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
          <div>
          <p className="text-xs text-gray-500 font-sans uppercase font-medium line-clamp-1 max-w-[150px]">{product.name}</p>
          <p className="text-lg font-sans font-semibold text-charcoal">₹{Number(currentPrice * quantity).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.preventDefault();
              toggleWishlist(product.id || product._id);
            }}
            className={`w-12 h-12 flex items-center justify-center rounded-xl border transition-all ${isWishlisted ? 'bg-pink-50 border-pink-primary' : 'bg-gray-50 border-gray-200'}`}
          >
            <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-pink-primary text-pink-primary' : 'text-gray-500'}`} />
          </button>
          <Button 
            variant="dark" 
            className="px-6 py-3 relative overflow-hidden disabled:opacity-50 whitespace-nowrap"
            onClick={handleAddToCart}
            disabled={added || !inStock}
          >
          <AnimatePresence mode="wait">
            {added ? (
              <motion.span
                key="added"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="flex items-center justify-center gap-2 text-pink-primary-light"
              >
                <Check className="w-4 h-4" /> Added
              </motion.span>
            ) : !inStock ? (
              <motion.span
                key="outofstock"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="block whitespace-nowrap"
              >
                Out of Stock
              </motion.span>
            ) : (
              <motion.span
                key="add"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="block whitespace-nowrap"
              >
                Add to Cart
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
        </div>
      </div>
      )}
    </div>
  );
}
