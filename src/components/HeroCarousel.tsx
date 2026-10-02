import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight, ShieldCheck, Zap, Truck, Tag } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const HeroCarousel: React.FC = () => {
  const { siteConfig, setActiveView, setSelectedCategoryFilter, categories, formatPrice } = useApp();
  const [currentSlide, setCurrentSlide] = useState(0);

  const banners = siteConfig.heroBanners || [];

  // Auto-advance slides every 6s
  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % banners.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [banners.length]);

  if (banners.length === 0) return null;

  const slide = banners[currentSlide];

  return (
    <section className="relative overflow-hidden bg-gray-900 text-white rounded-2xl md:rounded-3xl shadow-xl mx-3 my-3 sm:mx-4 sm:my-4 max-w-7xl md:mx-auto">
      {/* Background Image with Gradient Overlay */}
      <div className="relative min-h-[300px] sm:min-h-[420px] md:min-h-[480px] flex items-center">
        <div className="absolute inset-0 z-0">
          <img
            src={slide.image}
            alt={slide.title}
            className="w-full h-full object-cover object-center transform scale-105 transition-all duration-1000 ease-out"
          />
          {/* Gradient overlay: dark vignette on left for clear typography */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent" />
        </div>

        {/* Content Container */}
        <div className="relative z-10 max-w-2xl px-4 sm:px-12 py-6 sm:py-10">
          {/* Badge Tag */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-black tracking-wide uppercase shadow-md mb-2 sm:mb-4"
            style={{ backgroundColor: slide.badgeBg || siteConfig.primaryColor || '#E2001A' }}>
            <Tag className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>{slide.tag || 'Offre Spéciale Supermarché'}</span>
          </div>

          {/* Headline */}
          <h1 className="text-xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight text-white mb-2 sm:mb-3">
            {slide.title}
          </h1>

          {/* Subtitle */}
          <p className="text-xs sm:text-base md:text-lg text-gray-200 mb-4 sm:mb-6 font-normal max-w-xl leading-relaxed line-clamp-2 sm:line-clamp-none">
            {slide.subtitle}
          </p>

          {/* CTA & Trust badges */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => {
                if (slide.categoryId) {
                  setSelectedCategoryFilter(slide.categoryId);
                }
                setActiveView('home');
              }}
              className="px-4 sm:px-8 py-2.5 sm:py-3.5 rounded-full font-black text-xs sm:text-base text-white shadow-lg transition-transform transform active:scale-95 hover:shadow-xl flex items-center gap-1.5 sm:gap-2 cursor-pointer"
              style={{ backgroundColor: siteConfig.primaryColor || '#E2001A' }}
            >
              <span>{slide.ctaText || 'Faire mes courses'}</span>
              <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            <button
              type="button"
              onClick={() => setActiveView('promotions')}
              className="px-3.5 sm:px-5 py-2.5 sm:py-3.5 rounded-full font-bold text-xs sm:text-sm bg-white/20 hover:bg-white/30 backdrop-blur-md text-white border border-white/30 transition-colors cursor-pointer"
            >
              Promos (-40%)
            </button>
          </div>

          {/* Value props in hero */}
          <div className="mt-5 sm:mt-8 pt-4 sm:pt-6 border-t border-white/20 grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 text-[11px] sm:text-xs text-gray-300">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0" />
              <span className="truncate sm:overflow-visible">Paiement Mobile Money</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Truck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" />
              <span className="truncate sm:overflow-visible">Livraison express Goma</span>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
              <span>Garantie Fraîcheur & Prix Bas</span>
            </div>
          </div>
        </div>

        {/* Carousel Prev/Next Buttons */}
        {banners.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => setCurrentSlide((prev) => (prev === 0 ? banners.length - 1 : prev - 1))}
              className="absolute left-4 z-20 w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-xs transition-colors"
              aria-label="Bannière précédente"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <button
              type="button"
              onClick={() => setCurrentSlide((prev) => (prev + 1) % banners.length)}
              className="absolute right-4 z-20 w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-xs transition-colors"
              aria-label="Bannière suivante"
            >
              <ChevronRight className="w-6 h-6" />
            </button>

            {/* Pagination Dots */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
              {banners.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentSlide(idx)}
                  className={`h-2 rounded-full transition-all ${
                    currentSlide === idx ? 'w-8 bg-white' : 'w-2 bg-white/50 hover:bg-white/80'
                  }`}
                  aria-label={`Aller au slide ${idx + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
};
