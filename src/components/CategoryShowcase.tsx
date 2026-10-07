import React from 'react';
import { useApp } from '../context/AppContext';
import { homeTextsOf } from '../data/mockData';
import { ArrowRight, Sparkles, Flame, ChevronRight } from 'lucide-react';

export const CategoryShowcase: React.FC = () => {
  const {
    categories,
    products,
    selectedCategoryFilter,
    setSelectedCategoryFilter,
    setActiveView,
    siteConfig,
  } = useApp();
  const texts = homeTextsOf(siteConfig);

  return (
    <section className="page-width mx-auto px-3 sm:px-4 py-6 sm:py-8">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-4 sm:mb-6 gap-2">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#E2001A] mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{texts.categoriesKicker}</span>
          </div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
            {texts.categoriesTitle}
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1">
            {texts.categoriesSubtitle}
          </p>
        </div>

        {selectedCategoryFilter && (
          <button
            type="button"
            onClick={() => setSelectedCategoryFilter(null)}
            className="text-xs font-bold text-[#E2001A] hover:underline flex items-center gap-1 self-start sm:self-auto cursor-pointer"
          >
            <span>Afficher tous les rayons</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Grid of Visual Category Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-4">
        {categories.map((cat) => {
          const productCount = products.filter((p) => p.categoryId === cat.id).length;
          const isSelected = selectedCategoryFilter === cat.id;

          return (
            <div
              key={cat.id}
              onClick={() => {
                setSelectedCategoryFilter(cat.id);
                if (cat.isPromoCategory) {
                  setActiveView('promotions');
                } else {
                  setActiveView('home');
                }
              }}
              className={`group relative overflow-hidden rounded-2xl bg-white border cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 active:scale-98 ${
                isSelected
                  ? 'border-[#E2001A] ring-2 ring-red-500 shadow-md'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {/* Category Image */}
              <div className="relative h-28 sm:h-36 lg:h-auto lg:aspect-[7/5] overflow-hidden bg-gray-100">
                <img
                  src={cat.image}
                  alt={cat.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />

                {/* Badge if Promo */}
                {cat.isPromoCategory && (
                  <span className="absolute top-2 right-2 bg-[#E2001A] text-white text-[0.5625rem] sm:text-[0.625rem] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                    <Flame className="w-3 h-3 fill-white" />
                    Promo
                  </span>
                )}

                {/* Bottom title inside image on mobile, clean overlay */}
                <div className="absolute bottom-2 left-2 right-2 text-white">
                  <span className="text-[0.625rem] text-gray-300 font-semibold block">
                    {productCount} produit{productCount > 1 ? 's' : ''}
                  </span>
                  <h3 className="text-xs sm:text-sm font-black leading-tight line-clamp-2">
                    {cat.name}
                  </h3>
                </div>
              </div>

              {/* Bottom Card Footer: Clean exploration link (NO staff/agent names shown to customers) */}
              <div className="p-2 sm:p-2.5 bg-white flex items-center justify-between text-[0.6875rem] font-bold text-gray-700 group-hover:text-[#E2001A] transition-colors">
                <span className="truncate">Découvrir le rayon</span>
                <ChevronRight className="w-3.5 h-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
