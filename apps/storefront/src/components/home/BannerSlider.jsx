import React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';

export default function BannerSlider({ slides = [], autoSlide = true }) {
  if (!slides || slides.length === 0) return null;

  return (
    <div className="w-full">
      <Swiper
        modules={[Autoplay, Pagination]}
        slidesPerView={1}
        loop={slides.length > 1}
        speed={700}
        autoplay={autoSlide ? { delay: 2000, disableOnInteraction: false } : false}
        pagination={{ clickable: true }}
        className="w-full !pb-11 banner-swiper"
      >
        {slides.map((slide, idx) => (
          <SwiperSlide key={idx}>
            <div className="relative w-full aspect-[3/1] md:aspect-[21/7] overflow-hidden bg-charcoal/5">
              <img
                src={slide.src}
                alt={slide.alt || `Banner ${idx + 1}`}
                loading={idx === 0 ? 'eager' : 'lazy'}
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover"
                style={{ objectPosition: slide.objectPosition || 'center' }}
              />

              {(slide.title || slide.subtitle) && (
                <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/15 to-transparent flex items-center">
                  <div className="px-6 sm:px-10 md:px-16 max-w-xl">
                    {slide.subtitle && (
                      <p className="text-[10px] sm:text-xs md:text-sm text-pink-100 font-sans font-medium tracking-[0.25em] uppercase mb-2">
                        {slide.subtitle}
                      </p>
                    )}
                    {slide.title && (
                      <h2 className="font-serif text-xl sm:text-3xl md:text-5xl text-white leading-tight mb-4">
                        {slide.title}
                      </h2>
                    )}
                    {slide.buttonText && (
                      <a
                        href={slide.buttonLink || '/products'}
                        className="inline-flex items-center justify-center px-5 sm:px-6 py-2 sm:py-2.5 bg-pink-primary text-white text-xs sm:text-sm font-medium rounded-full hover:bg-pink-dark hover:-translate-y-0.5 transition-all duration-300 shadow-md"
                      >
                        {slide.buttonText}
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      <style>{`
        .banner-swiper .swiper-pagination { bottom: 0 !important; }
        .banner-swiper .swiper-pagination-bullet {
          background: rgba(0,0,0,0.18);
          opacity: 1;
          width: 8px;
          height: 8px;
        }
        .banner-swiper .swiper-pagination-bullet-active {
          background: #EC4899;
          width: 26px;
          border-radius: 8px;
        }
      `}</style>
    </div>
  );
}