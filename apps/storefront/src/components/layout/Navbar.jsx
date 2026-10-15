import React, { useState, useEffect, useRef } from 'react';
import { Menu, ShoppingBag, Search, User, Heart, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useScrollDirection } from '../../hooks/useScrollDirection';
import { useCart } from '../../context/CartContext';
import { useFlyToCart } from '../../context/FlyToCartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useTheme } from '../../context/ThemeContext';
import MobileMenu from './MobileMenu';
import NavbarRibbon from './NavbarRibbon';
import clsx from 'clsx';
import Badge from '../ui/Badge';
import CartDrawer from '../cart/CartDrawer';
import { useAuth } from '../../context/AuthContext';
import AuthModal from '../auth/AuthModal';
import { useNavigate } from 'react-router-dom';
import LogoImage from '../../assets/images/LogoProcessed.png';
import { api } from '../../lib/api';

export default function Navbar() {
  const { navbarLinks } = useTheme();
  const { scrollY, showRibbon } = useScrollDirection();
  const { state } = useCart();
  const { state: wishlistState } = useWishlist();
  const { cartIconRef } = useFlyToCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isBouncing, setIsBouncing] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const [openDropdown, setOpenDropdown] = useState(null);
  const dropdownTimerRef = useRef(null);

  useEffect(() => {
    if (state.totalCount > 0) {
      setIsBouncing(true);
      const timer = setTimeout(() => setIsBouncing(false), 300);
      return () => clearTimeout(timer);
    }
  }, [state.totalCount]);

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    } else if (!isSearchOpen) {
      setSearchQuery('');
      setSearchResults([]);
    }
  }, [isSearchOpen]);

  useEffect(() => {
    return () => {
      if (dropdownTimerRef.current) clearTimeout(dropdownTimerRef.current);
    };
  }, []);

  const openNavDropdown = (key) => {
    if (dropdownTimerRef.current) clearTimeout(dropdownTimerRef.current);
    setOpenDropdown(key);
  };

  const closeNavDropdown = () => {
    if (dropdownTimerRef.current) clearTimeout(dropdownTimerRef.current);
    dropdownTimerRef.current = setTimeout(() => setOpenDropdown(null), 200);
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (value.trim()) {
      setIsSearching(true);
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const { data } = await api.get('/catalog/products/search', { params: { q: value } });
          setSearchResults(data || []);
        } catch (error) {
          console.error("Failed to search products", error);
        } finally {
          setIsSearching(false);
        }
      }, 300);
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      navigate(`/products?q=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchOpen(false);
    }
  };

  const highlightMatch = (text, query) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) =>
      part.toLowerCase() === query.toLowerCase() ?
        <strong key={index} className="text-pink-primary">{part}</strong> : part
    );
  };

  return (
    <>
      <header className={clsx(
        'fixed top-0 left-0 right-0 z-50 flex flex-col bg-cream transition-transform duration-300 ease-in-out w-full',
        scrollY > 20 && 'shadow-md'
      )}>
        {/* ROW 1: Ribbon */}
        <NavbarRibbon isVisible={showRibbon} />

        {/* ROW 2: Main Header */}
        <div className="w-full py-4 lg:py-2 border-b border-charcoal/10 relative">
          <div className="max-w-7xl mx-auto px-6 md:px-10 flex items-center justify-between">
            {/* LEFT: Search / Mobile Menu */}
            <div className="flex items-center gap-2 sm:gap-4">
              <button
                className="md:hidden p-1 -ml-1 text-charcoal hover:text-pink-primary transition-colors focus:outline-none"
                onClick={() => setIsMobileMenuOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="w-6 h-6" />
              </button>

              <div className="flex items-center">
                <button
                  onClick={() => setIsSearchOpen(!isSearchOpen)}
                  className="p-1 text-charcoal hover:text-pink-primary transition-colors focus:outline-none"
                  aria-label="Search"
                >
                  <Search className="w-5 h-5 md:w-6 md:h-6 lg:w-5 lg:h-5" />
                </button>
                <div
                  className={clsx(
                    "transition-all duration-300 ease-in-out flex items-center relative",
                    isSearchOpen ? "w-48 sm:w-64 md:w-80 lg:w-96 ml-2 opacity-100" : "w-0 opacity-0 overflow-hidden"
                  )}
                >
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Search for products..."
                    className="w-full bg-transparent border-b border-charcoal/30 pb-1 text-sm text-charcoal focus:outline-none focus:border-pink-primary transition-colors placeholder:text-charcoal/40 pr-6"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSearchResults([]);
                        searchInputRef.current?.focus();
                      }}
                      className="absolute right-0 top-0 p-1 text-charcoal/40 hover:text-charcoal transition-colors focus:outline-none"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  {/* Live Search Results Dropdown */}
                  {isSearchOpen && (
                    <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-white rounded-lg shadow-2xl border border-charcoal/10 overflow-hidden z-[100] max-h-[70vh] flex flex-col transform origin-top transition-all duration-200">
                      {isSearching ? (
                        <div className="p-4 space-y-3">
                          {[1, 2, 3].map(i => (
                            <div key={i} className="flex items-center gap-3 animate-pulse">
                              <div className="w-12 h-12 bg-charcoal/5 rounded-md"></div>
                              <div className="flex-1 space-y-2">
                                <div className="h-3 bg-charcoal/5 rounded w-3/4"></div>
                                <div className="h-2 bg-charcoal/5 rounded w-1/4"></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : searchQuery.trim() && searchResults.length > 0 ? (
                        <>
                          <div className="overflow-y-auto p-2">
                            {searchResults.map(product => (
                              <Link
                                key={product._id}
                                to={`/product/${product.slug}`}
                                onClick={() => setIsSearchOpen(false)}
                                className="flex items-center gap-3 p-2 hover:bg-cream rounded-md transition-colors group"
                              >
                                <img
                                  src={product.images?.[0] || product.variants?.[0]?.images?.[0] || 'https://via.placeholder.com/100x100'}
                                  alt={product.name}
                                  className="w-12 h-12 object-cover rounded-md group-hover:scale-105 transition-transform duration-300"
                                />
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-sm font-serif text-charcoal truncate">
                                    {highlightMatch(product.name, searchQuery)}
                                  </h4>
                                  <p className="text-xs text-charcoal/60 font-sans mt-0.5">₹{Number(product.price || product.variants?.[0]?.price || 0).toLocaleString('en-IN')}</p>
                                </div>
                              </Link>
                            ))}
                          </div>
                          <div className="p-3 border-t border-charcoal/10 bg-cream/50 text-center">
                            <Link
                              to={`/products?q=${encodeURIComponent(searchQuery.trim())}`}
                              onClick={() => setIsSearchOpen(false)}
                              className="text-xs font-medium text-pink-primary hover:text-pink-primary/80 uppercase tracking-wider"
                            >
                              View all {searchResults.length} results &rarr;
                            </Link>
                          </div>
                        </>
                      ) : searchQuery.trim() ? (
                        <div className="p-8 flex flex-col items-center justify-center text-center">
                          <Search className="w-8 h-8 text-charcoal/20 mb-3" />
                          <p className="text-charcoal font-medium text-sm mb-1">No results found</p>
                          <p className="text-charcoal/60 text-xs">We couldn't find anything for "{searchQuery}"</p>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* CENTER: Brand Wordmark */}
            <Link
              to="/"
              className={clsx(
                "absolute left-1/2 -translate-x-1/2 flex items-center justify-center gap-1 sm:gap-3 transition-opacity duration-300",
                isSearchOpen ? "opacity-0 sm:opacity-100 pointer-events-none sm:pointer-events-auto" : "opacity-100"
              )}
            >
              <img
                src={LogoImage}
                alt="Logo"
                className="h-5 sm:h-10 md:h-12 lg:h-10 object-contain"
              />
              <span className="font-serif text-xs sm:text-2xl md:text-3xl lg:text-2xl tracking-widest sm:tracking-[0.2em] text-charcoal uppercase text-center whitespace-nowrap inline-block">
                THELOVESIDES
              </span>
            </Link>

            {/* RIGHT: User & Wishlist & Cart */}
            <div className="flex items-center gap-2 sm:gap-3 md:gap-5">
              <button
                onClick={() => isAuthenticated ? navigate('/profile') : setIsAuthOpen(true)}
                className="p-1 text-charcoal hover:text-pink-primary transition-colors focus:outline-none"
                aria-label="Account"
              >
                <User className="w-5 h-5 md:w-6 md:h-6 lg:w-5 lg:h-5" />
              </button>

              <button
                onClick={() => isAuthenticated ? navigate('/wishlist') : setIsAuthOpen(true)}
                className="relative p-1 text-charcoal hover:text-pink-primary transition-colors focus:outline-none"
                aria-label="Wishlist"
              >
                <Heart className="w-5 h-5 md:w-6 md:h-6 lg:w-5 lg:h-5" />
                {wishlistState.items.length > 0 && (
                  <Badge>
                    {wishlistState.items.length}
                  </Badge>
                )}
              </button>

              <button
                ref={cartIconRef}
                onClick={() => setIsCartOpen(true)}
                className="relative p-1 text-charcoal hover:text-pink-primary transition-colors focus:outline-none"
                aria-label="View Cart"
              >
                <ShoppingBag className="w-5 h-5 md:w-6 md:h-6 lg:w-5 lg:h-5" />
                {state.totalCount > 0 && (
                  <Badge className={clsx(isBouncing && 'animate-bounce')}>
                    {state.totalCount}
                  </Badge>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ROW 3: Categories (Desktop Only) */}
        <div className="hidden md:flex w-full md:py-3 lg:py-2 border-b border-charcoal/10 bg-cream relative">
          <nav className="max-w-7xl mx-auto px-4 md:px-6 lg:px-10 flex flex-wrap justify-start xl:justify-center gap-6 lg:gap-8 xl:gap-10 w-full overflow-visible">
            {(navbarLinks || []).map((link) => {
              const viewAllHref =
                link.href && link.href !== '#'
                  ? link.href
                  : `/products?q=${encodeURIComponent(link.title)}`;
              const isOpen = openDropdown === link.title;

              return (
                <div
                  key={link.title}
                  className="py-2"
                  onMouseEnter={() => openNavDropdown(link.title)}
                  onMouseLeave={closeNavDropdown}
                >
                  <Link
                    to={viewAllHref}
                    onClick={() => setOpenDropdown(null)}
                    className="text-xs lg:text-sm font-medium tracking-wider uppercase text-charcoal hover:text-pink-primary relative after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-0 after:h-[2px] after:bg-pink-primary hover:after:w-full after:transition-all after:duration-300 whitespace-nowrap shrink-0 inline-block"
                  >
                    {link.title}
                  </Link>
                  {link.subLinks && link.subLinks.length > 0 && (
                    <div
                      className={clsx(
                        'absolute top-full left-0 w-full pt-1 transition-all duration-300 z-[60]',
                        isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
                      )}
                    >
                      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-10 pb-4">
                        <div
                          className={clsx(
                            'bg-white/95 backdrop-blur-md shadow-2xl shadow-charcoal/5 border border-charcoal/10 rounded-2xl p-8 flex transform origin-top transition-transform duration-300',
                            isOpen ? 'translate-y-0' : '-translate-y-2'
                          )}
                        >
                          <div className="w-1/4 pr-8 border-r border-charcoal/10 flex flex-col justify-center">
                            <h3 className="text-xl font-serif text-charcoal mb-3">{link.title}</h3>
                            <p className="text-sm text-charcoal/60 leading-relaxed">
                              Explore our curated selection of {link.title.toLowerCase()}.
                            </p>
                            <Link
                              to={viewAllHref}
                              onClick={() => setOpenDropdown(null)}
                              className="mt-4 text-sm font-medium text-pink-primary hover:text-pink-primary/80 transition-colors uppercase tracking-wider"
                            >
                              View All &rarr;
                            </Link>
                          </div>
                          <div className="w-3/4 pl-8 columns-1 sm:columns-2 lg:columns-3 gap-8">
                            {link.subLinks.map(subLink => (
                              <Link
                                key={subLink.name}
                                to={subLink.href}
                                onClick={() => setOpenDropdown(null)}
                                className="text-sm font-medium text-charcoal/80 hover:text-pink-primary transition-colors flex items-center gap-2 group/link break-inside-avoid mb-4"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-pink-primary/0 group-hover/link:bg-pink-primary transition-colors"></span>
                                {subLink.name}
                              </Link>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>
      </header>

      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        onAuthClick={() => setIsAuthOpen(true)}
      />
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </>
  );
}
