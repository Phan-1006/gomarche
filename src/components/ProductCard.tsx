import React from 'react';
import { Star, Plus, Minus, Check, Flame, ShoppingBag } from 'lucide-react';
import { Product } from '../types';
import { useApp } from '../context/AppContext';

interface ProductCardProps {
  product: Product;
  prominent?: boolean; // For "Deals of the moment" large cards
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, prominent = false }) => {
  const {
    currency,
    formatPrice,
    convertUsdToCdf,
    addToCart,
    updateCartQuantity,
    cart,
    siteConfig,
    setSelectedProduct,
    setActiveView,
  } = useApp();

  const cartItem = cart.find((item) => item.product.id === product.id);
  const qtyInCart = cartItem ? cartItem.quantity : 0;

  // Calculate discounted price
  const discountedUsd = product.discountPercent
    ? product.priceUsd * (1 - product.discountPercent / 100)
    : product.priceUsd;

  const originalUsd = product.priceUsd;

  // Secondary currency amount
  const secondaryDisplay =
    currency === 'USD'
      ? `${convertUsdToCdf(discountedUsd).toLocaleString('fr-FR')} FC`
      : `$ ${discountedUsd.toFixed(2)}`;

  return (
    <div
      className={`group relative flex flex-col justify-between bg-white rounded-2xl border border-gray-200 transition-all duration-300 hover:shadow-xl hover:border-gray-300 hover:-translate-y-0.5 overflow-hidden ${
        prominent ? 'p-3 sm:p-4' : 'p-2.5 sm:p-3.5'
      }`}
    >
      <div>
        {/* Top Badges (Discount, Origin, Promo) */}
        <div className="relative mb-1.5 sm:mb-2">
          {/* Image Container */}
          <div
            onClick={() => {
              setSelectedProduct(product);
              setActiveView('product_detail');
            }}
            className={`relative w-full rounded-xl overflow-hidden bg-gray-50 flex items-center justify-center cursor-pointer ${
              prominent ? 'h-40 sm:h-56' : 'h-32 sm:h-44'
            }`}
          >
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-contain p-2 transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />

            {/* Discount Badge */}
            {product.discountPercent && product.discountPercent > 0 && (
              <div
                className="absolute top-2 left-2 text-white font-black text-xs sm:text-sm px-2.5 py-1 rounded-lg shadow-md flex items-center gap-1"
                style={{ backgroundColor: siteConfig.primaryColor || '#E2001A' }}
              >
                <span>-{product.discountPercent}%</span>
              </div>
            )}

            {/* Origin Badge */}
            {product.origin && (
              <span className="absolute top-2 right-2 bg-white/90 backdrop-blur-xs text-gray-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-gray-200 shadow-xs">
                {product.origin}
              </span>
            )}

            {/* Stock alert */}
            {product.stockCount <= 10 && product.stockCount > 0 && (
              <span className="absolute bottom-2 left-2 bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-md">
                Plus que {product.stockCount} en stock
              </span>
            )}
          </div>
        </div>

        {/* Brand & Category Info */}
        <div className="mb-1 flex items-center justify-between text-[11px] text-gray-500">
          <span className="font-semibold text-gray-600 truncate uppercase tracking-wider">
            {product.brand}
          </span>
          {/* Rating */}
          <div className="flex items-center gap-1 text-amber-500 font-bold shrink-0">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>{product.rating.toFixed(1)}</span>
            <span className="text-gray-400 text-[10px]">({product.reviewCount})</span>
          </div>
        </div>

        {/* Product Name */}
        <h3
          onClick={() => {
            setSelectedProduct(product);
            setActiveView('product_detail');
          }}
          className="text-xs sm:text-sm font-bold text-gray-900 line-clamp-2 leading-snug cursor-pointer hover:text-[#E2001A] transition-colors mb-2 min-h-[2.5rem]"
          title={product.name}
        >
          {product.name}
        </h3>

        {/* Unit indication (e.g. "au kg", "bouteille 1.5L") */}
        {product.unit && (
          <p className="text-[11px] text-gray-500 mb-2 truncate">
            {product.unit}
          </p>
        )}
      </div>

      {/* Bottom: Pricing & Quick Add Action */}
      <div className="pt-2 border-t border-gray-100 mt-2">
        <div className="flex items-baseline justify-between mb-2">
          <div>
            {/* Primary Price */}
            <div className="flex items-baseline gap-1.5">
              <span
                className="text-lg sm:text-xl font-black tracking-tight"
                style={{ color: product.discountPercent ? siteConfig.primaryColor || '#E2001A' : '#111827' }}
              >
                {formatPrice(discountedUsd)}
              </span>

              {/* Strikethrough original price if discounted */}
              {product.discountPercent && product.discountPercent > 0 && (
                <span className="text-xs text-gray-400 line-through font-medium">
                  {formatPrice(originalUsd)}
                </span>
              )}
            </div>

            {/* Secondary currency preview */}
            <p className="text-[10px] text-gray-500 font-medium leading-none">
              soit {secondaryDisplay}
            </p>
          </div>
        </div>

        {/* Action Button: Quick Add to Cart with Quantity adjustment */}
        {qtyInCart > 0 ? (
          <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-xl p-1">
            <button
              type="button"
              onClick={() => updateCartQuantity(product.id, qtyInCart - 1)}
              className="w-8 h-8 rounded-lg bg-white text-gray-800 flex items-center justify-center font-bold hover:bg-gray-100 shadow-xs active:scale-95 transition-transform"
              aria-label="Diminuer la quantité"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="text-sm font-black text-[#E2001A] px-2">
              {qtyInCart}
            </span>
            <button
              type="button"
              onClick={() => updateCartQuantity(product.id, qtyInCart + 1)}
              className="w-8 h-8 rounded-lg bg-[#E2001A] text-white flex items-center justify-center font-bold hover:bg-red-700 shadow-xs active:scale-95 transition-transform"
              aria-label="Augmenter la quantité"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => addToCart(product, 1)}
            disabled={!product.inStock}
            className={`w-full py-2 sm:py-2.5 px-2 sm:px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all shadow-xs transform active:scale-95 cursor-pointer ${
              product.inStock
                ? 'bg-gray-900 hover:bg-[#E2001A] text-white'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">
              {product.inStock ? 'Ajouter' : 'Rupture'}
              <span className="hidden xs:inline">{product.inStock ? ' au panier' : ''}</span>
            </span>
          </button>
        )}
      </div>
    </div>
  );
};
