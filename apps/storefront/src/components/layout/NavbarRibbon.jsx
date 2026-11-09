import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import clsx from 'clsx';

export default function NavbarRibbon({ isVisible }) {
  const { promoOffers = [] } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!promoOffers || promoOffers.length === 0) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % promoOffers.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [promoOffers]);

  if (!promoOffers || promoOffers.length === 0) return null;

  return (
    <div 
      className={clsx(
        "w-full bg-[#fdecf4] text-charcoal flex items-center justify-center relative transition-all duration-300 ease-in-out",
        isVisible ? "opacity-100" : "opacity-0 overflow-hidden"
      )} 
      style={{ height: isVisible ? '40px' : '0px' }}
    >
      <div className="flex-grow flex justify-center items-center h-full max-w-[90%] mx-auto py-2">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-3 text-[10px] sm:text-xs font-sans font-bold uppercase tracking-[0.15em] sm:tracking-widest text-center"
          >
            <Gift className="w-3 h-3 md:w-4 md:h-4 text-pink-primary hidden sm:block flex-shrink-0" />
            <span className="line-clamp-1">{promoOffers[currentIndex]}</span>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
