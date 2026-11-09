import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getActiveRequests } from '../../lib/api';

export default function InitialLoader({ children }) {
  const { loading: themeLoading } = useTheme();
  const { isLoading: authLoading } = useAuth();
  const [networkIdle, setNetworkIdle] = useState(getActiveRequests() === 0);
  // The splash should only run on the very first visit, never again on
  // in-app (client side) page changes.
  const [hasBooted, setHasBooted] = useState(false);
  
  useEffect(() => {
    const handleStart = () => setNetworkIdle(false);
    const handleIdle = () => setNetworkIdle(true);
    
    window.addEventListener('api:start', handleStart);
    window.addEventListener('api:idle', handleIdle);
    
    // Safety fallback: don't show the loader for more than 8 seconds max
    // to ensure the user gets into the site even if a request hangs
    const timer = setTimeout(() => {
      setNetworkIdle(true);
    }, 8000);
    
    return () => {
      window.removeEventListener('api:start', handleStart);
      window.removeEventListener('api:idle', handleIdle);
      clearTimeout(timer);
    };
  }, []);
  
  // Wait for both theme, auth, AND network idle
  const isReady = !themeLoading && !authLoading && networkIdle;

  // Once the site has finished its first load, lock the splash away for good.
  useEffect(() => {
    if (!hasBooted && isReady) setHasBooted(true);
  }, [hasBooted, isReady]);

  const isInitializing = !hasBooted && !isReady;

  return (
    <>
      <div 
        className={`fixed inset-0 z-[9999] bg-[#fdecf4] flex flex-col items-center justify-center transition-all duration-1000 ${
          isInitializing ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'
        }`}
      >
        <div className="flex flex-col items-center animate-[pulse_3s_cubic-bezier(0.4,0,0.6,1)_infinite]">
          {/* Brand Logo / Name */}
          <h1 className="text-3xl md:text-4xl font-serif text-charcoal tracking-[0.25em] uppercase text-center font-medium">
            The Love Sides
          </h1>
        </div>
      </div>
      {/* Always render children so they can mount and trigger API requests */}
      {children}
    </>
  );
}
