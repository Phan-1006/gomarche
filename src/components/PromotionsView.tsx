import React from 'react';
import { Flame, ArrowLeft, Sparkles, Tag, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ProductCard } from './ProductCard';

export const PromotionsView: React.FC = () => {
  const { products, setActiveView, categories, siteConfig } = useApp();

  const promoProducts = products.filter((p) => p.isPromo || (p.discountPercent && p.discountPercent > 0));
  const promoCategory = categories.find((c) => c.isPromoCategory);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Banner */}
      <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white rounded-3xl p-6 sm:p-10 shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <button
            type="button"
            onClick={() => setActiveView('home')}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-red-100 hover:text-white mb-4 bg-white/10 px-3 py-1 rounded-full"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Retour à l'accueil</span>
          </button>

          <div className="inline-flex items-center gap-1.5 bg-amber-400 text-gray-950 font-black text-xs uppercase px-3 py-1 rounded-full shadow-sm mb-3">
            <Flame className="w-4 h-4 fill-current" />
            <span>Offres Spéciales Supermarché Goma</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
            Les Promotions & Prix Choc Gomarché
          </h1>

          <p className="text-sm sm:text-base text-red-100 mt-2">
            Profitez de réductions exceptionnelles jusqu’à -40% sur vos articles préférés avec livraison rapide partout à Goma.
          </p>
        </div>
      </div>

      {/* Grid of Promo Products */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black text-gray-900">
            {promoProducts.length} articles en promotion actuellement
          </h2>
          <span className="text-xs text-gray-500">
            Paiement Airtel, Orange, Mpesa, AfriMoney
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {promoProducts.map((prod) => (
            <ProductCard key={prod.id} product={prod} />
          ))}
        </div>
      </div>
    </div>
  );
};
