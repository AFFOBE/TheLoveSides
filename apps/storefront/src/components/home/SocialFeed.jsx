
import React, { useMemo, useEffect, useRef, useState } from 'react';
import RevealOnScroll from '../ui/RevealOnScroll';
import { useTheme } from '../../context/ThemeContext';

// Instagram Icon
const InstagramIcon = ({ className, strokeWidth = 1.5 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

// Normalize Instagram URL
function normalizeInstagramUrl(url) {
  if (!url) return null;

  try {
    const parsed = new URL(url.trim());

    if (!parsed.hostname.includes('instagram.com')) return null;

    const match = parsed.pathname.match(
      /\/(p|reel|tv)\/([a-zA-Z0-9_-]+)/
    );

    if (!match) return null;

    return `https://www.instagram.com/${match[1]}/${match[2]}/`;
  } catch {
    return null;
  }
}

// Instagram Embed
function embedFrameSrc(permalink) {
  const match = permalink.match(
    /\/(p|reel|tv)\/([a-zA-Z0-9_-]+)\/?$/
  );

  if (!match) return null;

  return `https://www.instagram.com/${match[1]}/${match[2]}/embed/`;
}

// Lazy Loaded Instagram Reel
const ReelVideo = ({ permalink }) => {
  const src = embedFrameSrc(permalink);

  const containerRef = useRef(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const element = containerRef.current;

    if (!element) return;

    if (!('IntersectionObserver' in window)) {
      setShouldLoad(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some(entry => entry.isIntersecting)) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      {
        // Start fetching the reel a bit before it reaches the viewport so the
        // video is already buffered by the time the user scrolls to it.
        rootMargin: '900px 250px',
        threshold: 0
      }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  if (!src) return null;

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-[9/16] overflow-hidden bg-black"
    >
      {shouldLoad ? (
        <iframe
          src={src}
          title="Instagram reel"
          className="absolute left-0 w-full pointer-events-none"
          style={{
            top: '-55px',
            height: 'calc(100% + 83px)'
          }}
          frameBorder="0"
          scrolling="no"
          allowTransparency="true"
          allow="autoplay; encrypted-media; picture-in-picture"
          loading="lazy"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 via-neutral-900 to-black flex flex-col items-center justify-center gap-2">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-pink-500/30 blur-xl animate-pulse" />
            <InstagramIcon className="relative w-8 h-8 text-white/60" />
          </div>
          <span className="text-[10px] font-sans text-white/40 tracking-wide">
            Loading reel…
          </span>
        </div>
      )}

      <div className="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-black/20 to-transparent pointer-events-none" />

      <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
    </div>
  );
};

export default function SocialFeed() {
  const { socialFeed = [], socialLinks = [] } = useTheme();
  const [isPaused, setIsPaused] = useState(false);

  const instagramLinkObj = socialLinks.find(
    link => link.platform?.toLowerCase() === 'instagram'
  );

  const instagramUrl =
    instagramLinkObj?.url ||
    'https://www.instagram.com/thelovesides/';

  const instagramUsername =
    instagramUrl.replace(/\/$/, '').split('/').pop() ||
    'thelovesides';

  // Filter valid feed items
  const items = useMemo(() => {
    return (socialFeed || []).filter(item => {
      if (!item) return false;

      const type =
        item.type || (item.embedUrl ? 'instagram' : 'media');

      if (type === 'instagram') {
        return !!normalizeInstagramUrl(
          item.embedUrl || item.link
        );
      }

      return !!(item.mediaUrl || item.image);
    });
  }, [socialFeed]);

  if (items.length === 0) return null;

  // Instagram Button
  const visitButton = (href) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 mb-2 mx-2 inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 text-white text-xs font-medium py-2 hover:opacity-90 transition"
    >
      <InstagramIcon
        className="w-3.5 h-3.5"
        strokeWidth={2}
      />
      <span>Visit on Instagram</span>
    </a>
  );

  // Render Card
  const renderCard = (item, idx, isClone = false) => {
    const type =
      item.type || (item.embedUrl ? 'instagram' : 'media');

    let card;

    if (type === 'instagram') {
      const rawUrl = item.embedUrl || item.link;
      const permalink = normalizeInstagramUrl(rawUrl);

      if (!permalink) return null;

      card = (
        <div className="w-full bg-white rounded-xl overflow-hidden shadow-sm flex flex-col">
          <ReelVideo permalink={permalink} />
          {visitButton(permalink)}
        </div>
      );
    } else {
      const mediaUrl = item.mediaUrl || item.image;
      const postLink = item.link || instagramUrl;

      const isVideo =
        /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(mediaUrl);

      card = (
        <div className="w-full bg-white rounded-xl overflow-hidden shadow-sm flex flex-col">
          <a
            href={postLink}
            target="_blank"
            rel="noopener noreferrer"
            className="relative block w-full aspect-[9/16] overflow-hidden group bg-black"
          >
            {isVideo ? (
              <video
                src={mediaUrl}
                className="absolute inset-0 w-full h-full object-cover"
                autoPlay
                loop
                muted
                playsInline
                preload="none"
              />
            ) : (
              <img
                src={mediaUrl}
                alt={`Social post ${idx + 1}`}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
            )}
          </a>

          {visitButton(postLink)}
        </div>
      );
    }

    return (
      <div
        key={`${item._id || idx}-${isClone ? 'clone' : 'original'}`}
        className="social-feed-card"
      >
        {card}
      </div>
    );
  };

  const gridClass =
    items.length === 1
      ? 'grid-cols-1 max-w-sm mx-auto'
      : items.length === 2
        ? 'grid-cols-1 sm:grid-cols-2 max-w-3xl mx-auto'
        : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5';

  // Slider speed
  const sliderDuration = Math.max(24, items.length * 7);

  return (
    <section
      className="py-16 md:py-24 bg-cream/20 relative overflow-hidden"
      id="social-feed"
    >

      {/* Slider CSS */}
      <style>{`

        /* Desktop */
        .social-feed-mobile {
          display: none;
        }

        /* Seamless Slider Animation */
        @keyframes socialFeedInfinite {
          from {
            transform: translate3d(0, 0, 0);
          }

          to {
            transform: translate3d(-50%, 0, 0);
          }
        }

        @media (max-width: 767px) {

          .social-feed-desktop {
            display: none !important;
          }

          .social-feed-mobile {
            display: block;
            width: 100%;
            overflow: hidden;
            position: relative;
          }

          .social-feed-track {
            display: flex;
            flex-wrap: nowrap;
            width: max-content;
            gap: 0;
            animation: socialFeedInfinite var(--slider-duration) linear infinite;
            will-change: transform;
            transform: translate3d(0, 0, 0);
            backface-visibility: hidden;
          }

          .social-feed-track-group {
            display: flex;
            flex: 0 0 auto;
            flex-wrap: nowrap;
            gap: 12px;
            padding-right: 12px;
          }

          .social-feed-track-group .social-feed-card {
            flex: 0 0 min(64vw, 260px);
            width: min(64vw, 260px);
            min-width: 0;
            box-sizing: border-box;
          }

          .social-feed-track-group .social-feed-card > * {
            width: 100%;
          }

          .social-feed-card {
            align-self: flex-start;
          }

          .social-feed-mobile:hover .social-feed-track {
            animation-play-state: paused;
          }

          .social-feed-mobile:active .social-feed-track {
            animation-play-state: paused;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .social-feed-track {
            animation: none !important;
          }
        }

      `}</style>

      {/* Background Decorations */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-ivory/50 rounded-full blur-3xl opacity-60" />

        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-ivory/50 rounded-full blur-3xl opacity-60" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-10">

        {/* Heading */}
        <RevealOnScroll>
          <div className="flex flex-col items-center justify-center text-center mb-10 md:mb-14">

            <h2 className="text-sm font-sans tracking-[0.2em] md:tracking-[0.3em] text-gray-400 uppercase mb-3">
              Join Our Community
            </h2>

            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 text-charcoal hover:text-pink-primary transition-all duration-300 transform hover:scale-105 group"
            >
              <div className="bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 p-[2px] rounded-full">
                <div className="bg-white p-2 rounded-full">
                  <InstagramIcon
                    className="w-5 h-5 md:w-6 md:h-6 text-charcoal"
                    strokeWidth={1.5}
                  />
                </div>
              </div>

              <span className="font-serif text-3xl md:text-4xl lg:text-5xl tracking-wide">
                @{instagramUsername}
              </span>
            </a>
          </div>
        </RevealOnScroll>

        {/* DESKTOP GRID */}
        <RevealOnScroll delay={0.1}>
          <div className="w-full social-feed-desktop">
            <div
              className={`grid gap-3 md:gap-4 justify-center items-start ${gridClass}`}
            >
              {items.map((item, idx) =>
                renderCard(item, idx)
              )}
            </div>
          </div>
        </RevealOnScroll>

        {/* MOBILE INFINITE SLIDER */}
        <RevealOnScroll delay={0.1}>
          <div className="social-feed-mobile">

            <div
              className="social-feed-track"
              style={{
                '--slider-duration': `${sliderDuration}s`
              }}
            >

              {/* First Set */}
              <div className="social-feed-track-group">
                {items.map((item, idx) =>
                  renderCard(item, idx)
                )}
              </div>

              {/* Duplicate Set - Seamless Loop */}
              <div
                className="social-feed-track-group"
                aria-hidden="true"
              >
                {items.map((item, idx) =>
                  renderCard(item, idx, true)
                )}
              </div>

            </div>
          </div>
        </RevealOnScroll>

        {/* Follow Us */}
        <RevealOnScroll delay={0.2}>
          <div className="mt-12 flex justify-center">
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2 px-8 py-3.5 bg-charcoal text-white rounded-full font-medium hover:bg-black transition-all duration-300 shadow-md hover:shadow-xl hover:-translate-y-1"
            >
              <span>Follow Us</span>

              <InstagramIcon className="w-4 h-4 group-hover:rotate-12 transition-transform duration-300" />
            </a>
          </div>
        </RevealOnScroll>

      </div>
    </section>
  );
}
