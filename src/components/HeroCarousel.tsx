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
    <section className="relative overflow-hidden bg-gray-900 text-white rounded-2xl md:rounded-3xl shadow-xl mx-4 my-4 max-w-7xl md:mx-auto">
      {/* Background Image with Gradient Overlay */}
      <div className="relative min-h-[380px] sm:min-h-[440px] md:min-h-[480px] flex items-center">
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
        <div className="relative z-10 max-w-2xl px-6 sm:px-12 py-10">
          {/* Badge Tag */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-wide uppercase shadow-md mb-4"
            style={{ backgroundColor: slide.badgeBg || siteConfig.primaryColor || '#E2001A' }}>
            <Tag className="w-3.5 h-3.5" />
            <span>{slide.tag || 'Offre Spéciale Hypermarché'}</span>
          </div>

          {/* Headline (From JSON: "Everything you need, all in one place" / "Tout ce dont vous avez besoin, au même endroit") */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight text-white mb-3">
            {slide.title}
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-base md:text-lg text-gray-200 mb-6 font-normal max-w-xl leading-relaxed">
            {slide.subtitle}
          </p>

          {/* CTA & Trust badges */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (slide.categoryId) {
                  setSelectedCategoryFilter(slide.categoryId);
                }
                setActiveView('home');
              }}
              className="px-6 sm:px-8 py-3.5 rounded-full font-black text-sm sm:text-base text-white shadow-lg transition-transform transform active:scale-95 hover:shadow-xl flex items-center gap-2"
              style={{ backgroundColor: siteConfig.primaryColor || '#E2001A' }}
            >
              <span>{slide.ctaText || 'Faire mes courses'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setActiveView('promotions')}
              className="px-5 py-3.5 rounded-full font-bold text-sm bg-white/20 hover:bg-white/30 backdrop-blur-md text-white border border-white/30 transition-colors"
            >
              Voir les promos (-40%)
            </button>
          </div>

          {/* Value props in hero */}
          <div className="mt-8 pt-6 border-t border-white/20 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs text-gray-300">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Paiement Airtel, Orange, M-Pesa, AfriMoney</span>
            </div>
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Livraison express à domicile</span>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
              <span>Garantie Qualité & Prix Bas</span>
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
