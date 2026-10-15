import React from 'react';
import { Link } from 'react-router-dom';
import SectionHeading from '../ui/SectionHeading';
import RevealOnScroll from '../ui/RevealOnScroll';
import { useCollections } from '../../hooks/useCollections';

export default function CollectionShowcase() {
  const { collections, loading } = useCollections();
  const activeCollections = collections || [];

  return (
    <section className="py-10 md:py-16 bg-cream">
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        <RevealOnScroll>
          <SectionHeading
            title="Explore Our Collection"
            subtitle="Curated styles for every space"
          />
        </RevealOnScroll>

        {loading ? (
          <div className="grid grid-cols-2 gap-4 md:gap-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="aspect-[16/10] rounded-xl md:rounded-2xl bg-charcoal/5 animate-pulse"></div>
            ))}
          </div>
        ) : activeCollections.length === 0 ? (
          <div className="text-center py-10 text-charcoal/60">No collections available yet.</div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:gap-8">
            {activeCollections.map((collection, idx) => (
              <RevealOnScroll key={collection._id} delay={idx * 0.1}>
                <Link
                  to={`/products?collection=${collection.slug}`}
                  className="group relative block aspect-[16/10] rounded-xl md:rounded-2xl overflow-hidden cursor-pointer shadow-sm hover:shadow-xl transition-all duration-300"
                >
                  {collection.image && !collection.image.endsWith('/undefined') ? (
                    <img
                      src={collection.image}
                      alt={collection.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full bg-charcoal/10 flex items-center justify-center transition-transform duration-700 md:group-hover:scale-110">
                      <span className="text-charcoal/40 text-sm">No Image</span>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                  <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 md:bottom-8 md:left-8 pr-3">
                    <h3 className="font-serif text-base sm:text-lg md:text-3xl text-white mb-1 md:mb-2">
                      {collection.name}
                    </h3>
                    <span className="text-[10px] sm:text-xs md:text-sm text-white/80 underline-offset-4 group-hover:underline transition-all block truncate">
                      Explore Collection
                    </span>
                  </div>
                </Link>
              </RevealOnScroll>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

