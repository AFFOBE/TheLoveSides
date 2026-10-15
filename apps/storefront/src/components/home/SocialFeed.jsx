import React, { useMemo } from 'react';
import RevealOnScroll from '../ui/RevealOnScroll';
import { useTheme } from '../../context/ThemeContext';

// Custom SVG for Instagram since lucide-react removed brand icons
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
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
  </svg>
);

/**
 * Normalizes an Instagram URL to a clean permalink suitable for linking.
 * Strips query params and ensures a trailing slash.
 */
function normalizeInstagramUrl(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url.trim());
    if (!parsed.hostname.includes('instagram.com')) return null;

    const match = parsed.pathname.match(/\/(p|reel|tv)\/([a-zA-Z0-9_-]+)/);
    if (!match) return null;

    return `https://www.instagram.com/${match[1]}/${match[2]}/`;
  } catch {
    return null;
  }
}

// Approximate pixel heights of the chrome that the Instagram `/embed/` iframe
// renders above and below the video. We crop them so only the video is visible.
const EMBED_HEADER_PX = 55;
const EMBED_FOOTER_PX = 28;

// The `/embed/` endpoint renders the real muted autoplay reel video.
function embedFrameSrc(permalink) {
  const match = permalink.match(/\/(p|reel|tv)\/([a-zA-Z0-9_-]+)\/?$/);
  if (!match) return null;
  return `https://www.instagram.com/${match[1]}/${match[2]}/embed/`;
}

const ReelVideo = ({ permalink }) => {
  const src = embedFrameSrc(permalink);
  if (!src) return null;

  const cropTop = EMBED_HEADER_PX;
  const extraHeight = EMBED_HEADER_PX + EMBED_FOOTER_PX;

  return (
    <div className="relative w-full aspect-[9/16] overflow-hidden bg-black">
      <iframe
        src={src}
        title="Instagram reel"
        className="absolute left-0 w-full pointer-events-none"
        style={{
          top: `-${cropTop}px`,
          height: `calc(100% + ${extraHeight}px)`,
        }}
        frameBorder="0"
        scrolling="no"
        allowTransparency="true"
        allow="autoplay; encrypted-media; picture-in-picture"
        loading="lazy"
      />
      {/* Slight top/bottom dark fade so the crop blends with the card */}
      <div className="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-black/20 to-transparent pointer-events-none"></div>
      <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>
    </div>
  );
};

export default function SocialFeed() {
  const { socialFeed = [], socialLinks = [] } = useTheme();

  const instagramLinkObj = socialLinks.find(link => link.platform?.toLowerCase() === 'instagram');
  const instagramUrl = instagramLinkObj?.url || "https://www.instagram.com/thelovesides/";
  const instagramUsername = instagramUrl.replace(/\/$/, '').split('/').pop() || 'thelovesides';

  // Keep only items that actually have something to display (no empty placeholders)
  const items = useMemo(() => {
    return (socialFeed || []).filter(item => {
      if (!item) return false;
      const type = item.type || (item.embedUrl ? 'instagram' : 'media');
      if (type === 'instagram') {
        return !!normalizeInstagramUrl(item.embedUrl || item.link);
      }
      return !!(item.mediaUrl || item.image);
    });
  }, [socialFeed]);

  if (items.length === 0) return null;

  const visitButton = (href) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 mb-2 mx-2 inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 text-white text-xs font-medium py-2 hover:opacity-90 transition"
    >
      <InstagramIcon className="w-3.5 h-3.5" strokeWidth={2} />
      <span>Visit on Instagram</span>
    </a>
  );

  const renderCard = (item, idx) => {
    const type = item.type || (item.embedUrl ? 'instagram' : 'media');
    let card;

    if (type === 'instagram') {
      const rawUrl = item.embedUrl || item.link;
      const permalink = normalizeInstagramUrl(rawUrl);
      if (!permalink) return null;

      card = (
        <div className="w-full bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-shadow duration-300 flex flex-col">
          <ReelVideo permalink={permalink} />
          {visitButton(permalink)}
        </div>
      );
    } else {
      // Media (uploaded image or video)
      const mediaUrl = item.mediaUrl || item.image;
      const postLink = item.link || instagramUrl;
      const isVideo = /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(mediaUrl);

      card = (
        <div className="w-full bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-shadow duration-300 flex flex-col">
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
              />
            ) : (
              <img
                src={mediaUrl}
                alt={`Social post ${idx + 1}`}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
            )}
          </a>
          {visitButton(postLink)}
        </div>
      );
    }

    return <div key={item._id || idx} className="h-full">{card}</div>;
  };

  const cards = items.map(renderCard);

  const gridClass =
    items.length === 1
      ? 'grid-cols-1 max-w-sm mx-auto'
      : items.length === 2
        ? 'grid-cols-1 sm:grid-cols-2 max-w-3xl mx-auto'
        : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5';

  return (
    <section className="py-16 md:py-24 bg-cream/20 relative overflow-hidden" id="social-feed">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-ivory/50 rounded-full blur-3xl opacity-60"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-ivory/50 rounded-full blur-3xl opacity-60"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-10">

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
                  <InstagramIcon className="w-5 h-5 md:w-6 md:h-6 text-charcoal" strokeWidth={1.5} />
                </div>
              </div>
              <span className="font-serif text-3xl md:text-4xl lg:text-5xl tracking-wide">@{instagramUsername}</span>
            </a>
          </div>
        </RevealOnScroll>

        <RevealOnScroll delay={0.1}>
          <div className="w-full">
            <div className={`grid gap-3 md:gap-4 justify-center items-start ${gridClass}`}>
              {cards}
            </div>
          </div>
        </RevealOnScroll>

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