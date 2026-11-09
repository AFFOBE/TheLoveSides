import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const isLocalHost = () =>
  typeof window !== 'undefined' &&
  ['localhost', '127.0.0.1', '0.0.0.0'].includes(window.location.hostname);

/**
 * Google Analytics 4 route tracking for a single-page app.
 *
 * The gtag.js snippet in index.html already sends the very first page view,
 * so we ignore the first render here and only send a page_view for every
 * client-side route change (product page, category, cart, checkout, etc.).
 */
export default function GoogleAnalytics() {
  const location = useLocation();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (isLocalHost() || typeof window.gtag !== 'function') return;

    window.gtag('event', 'page_view', {
      page_path: `${location.pathname}${location.search}`,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [location.pathname, location.search]);

  return null;
}
