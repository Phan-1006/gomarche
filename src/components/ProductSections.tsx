import React from 'react';
import { Flame, Sparkles, TrendingUp, ShoppingBasket, ArrowRight, ChevronRight, ChevronLeft } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ProductCard } from './ProductCard';

export const ProductSections: React.FC = () => {
  const { products, selectedCategoryFilter, searchQuery, setActiveView, setSelectedCategoryFilter, siteConfig } = useApp();

  // Filter products based on search or category
  const filteredProducts = products.filter((p) => {
    const matchesSearch = searchQuery
      ? p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase())
      : true;

    const matchesCategory = selectedCategoryFilter
      ? p.categoryId === selectedCategoryFilter
      : true;

    return matchesSearch && matchesCategory;
  });

  // If search or specific category filter is active, display the filtered grid
  if (searchQuery || selectedCategoryFilter) {
    return (
      <section className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-black text-gray-900">
              {searchQuery ? `Résultats pour "${searchQuery}"` : 'Produits du rayon'}
            </h2>
            <p className="text-sm text-gray-500">
              {filteredProducts.length} produit{filteredProducts.length > 1 ? 's' : ''} trouvé{filteredProducts.length > 1 ? 's' : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedCategoryFilter(null);
            }}
            className="text-xs font-bold text-[#E2001A] hover:underline"
          >
            Réinitialiser les filtres
          </button>
        </div>

        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-200">
            <ShoppingBasket className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-gray-800">Aucun produit ne correspond à votre recherche</h3>
            <p className="text-sm text-gray-500 mt-1">
              Essayez avec un autre mot-clé ou parcourez nos autres rayons.
            </p>
          </div>
        )}
      </section>
    );
  }

  // Otherwise, render the European hypermarket homepage sections as requested in JSON
  const dealsProducts = products.filter((p) => p.isPromo).slice(0, 4);
  const essentialsProducts = products.filter((p) => p.isFoodEssential || p.categoryId === 'cat-food');
  const popularProducts = products.filter((p) => p.isPopular).slice(0, 8);
  const newArrivalsProducts = products.filter((p) => p.isNewArrival || p.id === 'prod-6' || p.id === 'prod-9' || p.id === 'prod-15');

  return (
    <div className="space-y-12 pb-16">
      {/* 1. Deals of the moment (Section: "promotions", title: "Deals of the moment", style: "large promotional product cards") */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-2">
                <Flame className="w-4 h-4 fill-amber-300 text-amber-300" />
                <span>Les Prix Choc Gomarché</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                Deals of the moment • Bons plans Gomarché Goma
              </h2>
              <p className="text-red-100 text-sm mt-1">
                Jusqu'à -40% de remise immédiate sur vos marques préférées. Offres valables dans la limite des stocks !
              </p>
            </div>

            <button
              type="button"
              onClick={() => setActiveView('promotions')}
              className="bg-white text-red-600 hover:bg-red-50 font-black text-xs sm:text-sm px-5 py-2.5 rounded-full transition-all flex items-center gap-1.5 self-start sm:self-auto shadow-md"
            >
              <span>Voir tout le rayon promo</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Large promotional product cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {dealsProducts.map((product) => (
              <ProductCard key={product.id} product={product} prominent={true} />
            ))}
          </div>
        </div>
      </section>

      {/* 2. Food essentials (Section: "products", title: "Food essentials", style: "horizontal product carousel") */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">
              <ShoppingBasket className="w-4 h-4" />
              <span>Rayon Frais & Épicerie</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              Food essentials • Les Essentiels Alimentation
            </h2>
            <p className="text-sm text-gray-500">
              Riz, huile, lait, café, pâtes : les incontournables de la famille aux prix les plus bas
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setSelectedCategoryFilter('cat-food');
              setActiveView('home');
            }}
            className="text-xs sm:text-sm font-bold text-[#E2001A] hover:underline flex items-center gap-1"
          >
            <span>Tout le rayon épicerie</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Horizontal scroll container with scrollbar-hidden */}
        <div className="flex gap-4 overflow-x-auto pb-4 pt-1 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
          {essentialsProducts.map((product) => (
            <div key={product.id} className="w-56 sm:w-64 shrink-0">
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </section>

      {/* 3. Popular products (Section: "products", title: "Popular products", style: "responsive product grid") */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-600 mb-1">
              <TrendingUp className="w-4 h-4" />
              <span>Top Ventes RDC</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              Popular products • Les Plus Demandés
            </h2>
            <p className="text-sm text-gray-500">
              Les articles plébiscités par nos clients à Kinshasa, Goma et Lubumbashi
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3 sm:gap-4">
          {popularProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* 4. New arrivals (Section: "products", title: "New arrivals", style: "responsive product grid") */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-purple-600 mb-1">
              <Sparkles className="w-4 h-4" />
              <span>Nouveautés en rayon</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              New arrivals • Nouveaux Arrivages
            </h2>
            <p className="text-sm text-gray-500">
              Derniers arrivages de produits frais, high-tech et soins
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3 sm:gap-4">
          {newArrivalsProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </div>
  );
};
