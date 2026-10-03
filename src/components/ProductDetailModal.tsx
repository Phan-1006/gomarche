import React, { useState } from 'react';
import { X, Star, ShoppingBag, Plus, Minus, ShieldCheck, Truck, RotateCcw, Share2, Tag } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const ProductDetailModal: React.FC = () => {
  const {
    selectedProduct,
    setSelectedProduct,
    activeView,
    setActiveView,
    formatPrice,
    convertUsdToCdf,
    currency,
    addToCart,
    siteConfig,
  } = useApp();

  const [quantity, setQuantity] = useState(1);

  if (activeView !== 'product_detail' || !selectedProduct) return null;

  const handleClose = () => {
    setActiveView('home');
    setSelectedProduct(null);
  };

  const discountedUsd = selectedProduct.discountPercent
    ? selectedProduct.priceUsd * (1 - selectedProduct.discountPercent / 100)
    : selectedProduct.priceUsd;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-gray-100 relative max-h-[92vh] flex flex-col">
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 overflow-y-auto">
          {/* Image side */}
          <div className="p-4 sm:p-6 bg-gray-50 flex items-center justify-center relative">
            <img
              src={selectedProduct.image}
              alt={selectedProduct.name}
              className="max-h-48 sm:max-h-72 object-contain"
            />
            {selectedProduct.discountPercent && (
              <span className="absolute top-3 left-3 sm:top-4 sm:left-4 bg-[#E2001A] text-white text-xs font-black px-2.5 py-1 rounded-lg">
                -{selectedProduct.discountPercent}%
              </span>
            )}
          </div>

          {/* Details side */}
          <div className="p-4 sm:p-8 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span className="font-bold uppercase tracking-wider text-red-600">
                  {selectedProduct.brand}
                </span>
                {selectedProduct.origin && (
                  <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full font-semibold text-[10px]">
                    Origine : {selectedProduct.origin}
                  </span>
                )}
              </div>

              <h2 className="text-lg sm:text-xl font-black text-gray-900 leading-snug">
                {selectedProduct.name}
              </h2>

              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center gap-1 text-amber-500 font-bold text-xs">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span>{selectedProduct.rating.toFixed(1)}</span>
                </div>
                <span className="text-gray-400 text-xs">({selectedProduct.reviewCount} avis clients)</span>
              </div>

              {/* Price */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-gray-900">
                    {formatPrice(discountedUsd)}
                  </span>
                  {selectedProduct.discountPercent && (
                    <span className="text-sm text-gray-400 line-through">
                      {formatPrice(selectedProduct.priceUsd)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  soit {currency === 'USD' ? `${convertUsdToCdf(discountedUsd).toLocaleString('fr-FR')} FC` : `$ ${discountedUsd.toFixed(2)}`} • {selectedProduct.unit}
                </p>
              </div>

              {/* Description */}
              <p className="text-xs text-gray-600 mt-4 leading-relaxed">
                {selectedProduct.description}
              </p>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-gray-100 space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center border border-gray-300 rounded-xl p-1">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-3 font-black text-sm text-gray-900">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    addToCart(selectedProduct, quantity);
                    handleClose();
                  }}
                  className="flex-1 py-3 px-4 rounded-xl text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-transform transform active:scale-95"
                  style={{ backgroundColor: siteConfig.primaryColor || '#E2001A' }}
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Ajouter au panier</span>
                </button>
              </div>

              <div className="flex items-center justify-between text-[10px] text-gray-500 pt-2">
                <span className="flex items-center gap-1">
                  <Truck className="w-3 h-3 text-emerald-600" />
                  Livraison express en 2h à Goma
                </span>
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-blue-600" />
                  Garantie Fraîcheur Supermarché
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
