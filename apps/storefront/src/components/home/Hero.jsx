import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import Button from '../ui/Button';
import { useTheme } from '../../context/ThemeContext';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';

import HeroImageDesktop from '../../assets/hero1.PNG';
import HeroImageMobile from '../../assets/images/HeroImage2.jpeg';

export default function Hero() {
  const { hero } = useTheme();
  
  // Backward compatibility: wrap single hero into slides array
  const slides = hero?.slides && hero.slides.length > 0 
    ? hero.slides 
    : [
        {
          _id: 'default-1',
          title: hero?.title || 'Curtains & <br class="md:hidden" /> Quiet Luxury',
          subtitle: hero?.subtitle || 'Home, Styled with Love',
          description: hero?.description || 'Shop our exclusive collection of premium curtains and blinds. Discover high-quality fabrics, custom sizing, and effortless style to elevate any room.',
          button1Text: hero?.button1Text,
          button1Link: hero?.button1Link,
          button2Text: hero?.button2Text,
          button2Link: hero?.button2Link,
          desktopImageUrl: hero?.desktopImageUrl || HeroImageDesktop,
          mobileImageUrl: hero?.mobileImageUrl || HeroImageMobile,
        }
      ];

  const autoplayOptions = hero?.autoplay === false ? false : {
    delay: hero?.autoplaySpeed || 5000,
    disableOnInteraction: false,
  };

  return (
    <section className="relative mt-[85px] md:mt-[136px] lg:mt-[108px] min-h-[calc(100vh-85px)] md:min-h-[calc(100vh-136px)] lg:min-h-[calc(100vh-108px)] flex items-center bg-gray-50">
      <Swiper
        key={JSON.stringify(autoplayOptions)}
        modules={[Autoplay, Pagination]}
        effect="slide"
        direction="horizontal"
        speed={700}
        autoplay={autoplayOptions}
        pagination={{ clickable: true }}
        loop={slides.length > 1}
        className="w-full h-full absolute inset-0 z-0 !pb-0 hero-swiper"
      >
        {slides.map((slide, index) => (
          <SwiperSlide key={slide._id || index}>
            {({ isActive }) => (
              <div className="relative w-full h-full flex items-center min-h-[calc(100vh-85px)] md:min-h-[calc(100vh-136px)] lg:min-h-[calc(100vh-108px)]">
                {/* Background Images */}
                <div className="absolute inset-0 z-0">
                  <img
                    src={slide.mobileImageUrl || slide.desktopImageUrl || HeroImageMobile}
                    alt=""
                    loading={index === 0 ? "eager" : "lazy"}
                    fetchpriority={index === 0 ? "high" : "auto"}
                    decoding="async"
                    className="w-full h-full object-cover object-[85%_center] md:hidden"
                  />
                  <img
                    src={slide.desktopImageUrl || slide.mobileImageUrl || HeroImageDesktop}
                    alt=""
                    loading={index === 0 ? "eager" : "lazy"}
                    fetchpriority={index === 0 ? "high" : "auto"}
                    decoding="async"
                    className="w-full h-full object-cover object-center hidden md:block"
                  />
                  {/* Overlay gradients */}
                  <div className="absolute inset-0 bg-gradient-to-r from-hero-dark/90 via-hero-dark/50 to-transparent md:hidden"></div>
                  <div className="absolute inset-0 bg-black/20 hidden md:block"></div>
                </div>

                {/* Content Container */}
                <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-10 py-12 md:py-20">
                  <div className="max-w-xl">
                    <motion.h1
                      initial={{ opacity: 0, y: 30 }}
                      animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                      transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
                      className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-serif leading-[1.2] md:leading-[1.05] text-ivory md:text-white mb-4 md:mb-6"
                      dangerouslySetInnerHTML={{ __html: slide.title || '' }}
                    />

                    {slide.description && (
                      <motion.p
                        initial={{ opacity: 0, y: 30 }}
                        animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                        transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
                        className="hidden md:block text-lg md:text-xl text-white/90 font-sans mb-10 leading-relaxed"
                      >
                        {slide.description}
                      </motion.p>
                    )}

                    {slide.subtitle && (
                      <motion.p
                        initial={{ opacity: 0, y: 30 }}
                        animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                        transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
                        className="md:hidden text-base text-ivory/90 font-sans mb-8 leading-relaxed"
                      >
                        {slide.subtitle}
                      </motion.p>
                    )}

                    <motion.div
                      initial={{ opacity: 0, y: 30 }}
                      animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                      transition={{ duration: 0.8, ease: 'easeOut', delay: 0.5 }}
                      className="flex gap-4 flex-wrap"
                    >
                      {slide.button1Text && (
                        <Link to={slide.button1Link || '/products'}>
                          <Button className="!bg-pink-primary !text-white hover:!bg-pink-dark hover:shadow-lg px-8">
                            {slide.button1Text}
                          </Button>
                        </Link>
                      )}
                      {slide.button2Text && (
                        <Link to={slide.button2Link || '/contact'}>
                          <Button className="!bg-ivory/10 md:!bg-white/10 !border !border-ivory/40 md:!border-white/30 !text-ivory md:!text-white hover:!bg-ivory hover:!text-hero-dark md:hover:!bg-white md:hover:!text-black px-8">
                            {slide.button2Text}
                          </Button>
                        </Link>
                      )}
                    </motion.div>
                  </div>
                </div>
              </div>
            )}
          </SwiperSlide>
        ))}
      </Swiper>
      
      <style dangerouslySetInnerHTML={{ __html: `
        .hero-swiper .swiper-pagination-bullet {
          background: rgba(255, 255, 255, 0.5);
          opacity: 1;
        }
        .hero-swiper .swiper-pagination-bullet-active {
          background: #fff;
          width: 24px;
          border-radius: 4px;
        }
      `}} />
    </section>
  );
}
