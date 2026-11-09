import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import LogoImage from '../../assets/images/LogoProcessed.png';

export default function MobileMenu({ isOpen, onClose, onAuthClick }) {
  const { navbarLinks } = useTheme();
  const { isAuthenticated } = useAuth();
  const [openTitle, setOpenTitle] = useState(null);

  // Always start with every subcategory collapsed whenever the menu opens.
  React.useEffect(() => {
    if (isOpen) setOpenTitle(null);
  }, [isOpen]);
  
  // Prevent body scroll when menu is open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Handle escape key
  React.useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/40 z-[60]"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="fixed top-0 left-0 bottom-0 w-4/5 max-w-sm bg-cream z-[70] shadow-2xl flex flex-col p-6 border-r border-charcoal/10"
          >
            <div className="flex justify-between items-center mb-8 pb-4 border-b border-charcoal/10">
              <Link to="/" onClick={onClose} className="block">
                <img src={LogoImage} alt="The Love Sides" className="h-12 md:h-16 object-contain mix-blend-multiply" />
              </Link>
              <button 
                onClick={onClose} 
                className="p-2 -mr-2 text-charcoal hover:text-pink-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-primary rounded-md"
                aria-label="Close menu"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <nav className="flex-1 min-h-0 overflow-y-auto mobile-menu-scroll pr-2 flex flex-col gap-5 font-sans text-lg text-charcoal font-medium">
              {(navbarLinks || []).map((link) => {
                const hasSubLinks = link.subLinks && link.subLinks.length > 0;
                const isExpanded = openTitle === link.title;
                const viewAllHref =
                  link.href && link.href !== '#'
                    ? link.href
                    : `/products?q=${encodeURIComponent(link.title)}`;

                if (!hasSubLinks) {
                  return (
                    <Link
                      key={link.title}
                      to={viewAllHref}
                      className="hover:text-pink-primary transition-colors w-fit tracking-wide uppercase text-sm"
                      onClick={onClose}
                    >
                      {link.title}
                    </Link>
                  );
                }

                return (
                  <div key={link.title} className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => setOpenTitle((prev) => (prev === link.title ? null : link.title))}
                      className="flex items-center justify-between w-full text-left tracking-wide uppercase text-sm hover:text-pink-primary transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-primary py-0.5"
                      aria-expanded={isExpanded}
                    >
                      <span>{link.title}</span>
                      <ChevronDown
                        className={`w-4 h-4 shrink-0 text-charcoal/50 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-pink-primary' : ''}`}
                      />
                    </button>

                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: 'easeInOut' }}
                          className="overflow-hidden"
                        >
                          <div className="flex flex-col gap-3 pl-4 border-l-2 border-charcoal/10 ml-1 mt-3">
                            <Link
                              to={viewAllHref}
                              className="text-sm font-semibold text-pink-dark hover:text-pink-primary transition-colors w-fit"
                              onClick={onClose}
                            >
                              View All {link.title}
                            </Link>
                            {link.subLinks.map(sub => (
                              <Link
                                key={sub.name}
                                to={sub.href}
                                className="text-sm text-charcoal/70 hover:text-pink-primary transition-colors w-fit"
                                onClick={onClose}
                              >
                                {sub.name}
                              </Link>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </nav>

            <div className="mt-8 pt-8 border-t border-charcoal/10">
              {isAuthenticated ? (
                <Link
                  to="/profile"
                  onClick={onClose}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-charcoal text-cream rounded-xl font-medium justify-center uppercase tracking-wider text-sm"
                >
                  My Profile
                </Link>
              ) : (
                <button
                  onClick={() => {
                    onClose();
                    onAuthClick();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-charcoal text-cream rounded-xl font-medium justify-center uppercase tracking-wider text-sm"
                >
                  Sign In
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
