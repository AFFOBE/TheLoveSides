import { useState, useEffect } from 'react';

export function useScrollDirection() {
  const [scrollY, setScrollY] = useState(0);
  // The promo ribbon is part of the fixed header now, so it stays visible
  // at every scroll position (it no longer collapses while scrolling).
  const showRibbon = true;

  useEffect(() => {
    let ticking = false;

    const updateScrollDir = () => {
      setScrollY(window.pageYOffset);
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateScrollDir);
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });

    // Initial check
    updateScrollDir();

    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return { scrollY, showRibbon };
}
