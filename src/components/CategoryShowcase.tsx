import React from 'react';
import { useApp } from '../context/AppContext';
import { ArrowRight, Sparkles, UserCheck, Flame } from 'lucide-react';

export const CategoryShowcase: React.FC = () => {
  const {
    categories,
    products,
    selectedCategoryFilter,
    setSelectedCategoryFilter,
    setActiveView,
    siteConfig,
  } = useApp();

  return (
    <section className="max-w-7xl mx-auto px-4 py-8">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-2">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#E2001A] mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Tous nos univers</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            Acheter par catégorie
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Chaque rayon est géré en direct par son agent dédié pour vous garantir fraîcheur et meilleurs prix.
          </p>
        </div>

        {selectedCategoryFilter && (
          <button
            type="button"
            onClick={() => setSelectedCategoryFilter(null)}
            className="text-xs font-bold text-[#E2001A] hover:underline flex items-center gap-1 self-start sm:self-auto"
          >
            <span>Afficher tous les rayons</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Grid of Large Visual Category Cards (as requested: "large visual category cards") */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
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
              className={`group relative overflow-hidden rounded-2xl bg-white border cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                isSelected
                  ? 'border-[#E2001A] ring-2 ring-red-500 shadow-md'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {/* Category Image */}
              <div className="relative h-28 sm:h-36 overflow-hidden bg-gray-100">
                <img
                  src={cat.image}
                  alt={cat.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                {/* Badge if Promo */}
                {cat.isPromoCategory && (
                  <span className="absolute top-2 right-2 bg-[#E2001A] text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                    <Flame className="w-3 h-3 fill-white" />
                    Promo
                  </span>
                )}

                {/* Bottom title inside image on mobile, clean overlay */}
                <div className="absolute bottom-2 left-2 right-2 text-white">
                  <span className="text-[10px] text-gray-300 font-semibold block">
                    {productCount} produit{productCount > 1 ? 's' : ''}
                  </span>
                  <h3 className="text-xs sm:text-sm font-black leading-tight line-clamp-2">
                    {cat.name}
                  </h3>
                </div>
              </div>

              {/* Bottom Card Footer: Assigned Agent details */}
              <div className="p-2 sm:p-2.5 bg-white flex flex-col justify-between">
                <div className="flex items-center gap-1.5 text-[10px] text-gray-600">
                  <UserCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span className="truncate font-medium">
                    {cat.assignedAgentName ? cat.assignedAgentName.split(' ')[0] : 'Agent Gomarché'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
