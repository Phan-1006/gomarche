import React from 'react';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight, ShieldCheck, Sparkles, Truck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AirtelMoneyLogo, OrangeMoneyLogo, MpesaLogo, AfriMoneyLogo } from './MobileMoneyLogos';

export const CartDrawer: React.FC = () => {
  const {
    cart,
    isCartOpen,
    setIsCartOpen,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    cartTotalUsd,
    cartTotalCdf,
    formatPrice,
    siteConfig,
    setIsCheckoutOpen,
    currency,
  } = useApp();

  if (!isCartOpen) return null;

  const freeDeliveryThreshold = siteConfig.freeDeliveryThresholdUsd;
  const progressToFreeDelivery = Math.min(100, (cartTotalUsd / freeDeliveryThreshold) * 100);
  const remainingForFreeDelivery = Math.max(0, freeDeliveryThreshold - cartTotalUsd);

  const gateways = siteConfig.paymentGateways || {} as any;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between transform transition-transform duration-300">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            {siteConfig.customLogoUrl ? (
              <img
                src={siteConfig.customLogoUrl}
                alt="Logo"
                className="h-8 max-w-[80px] object-contain rounded-lg p-0.5"
              />
            ) : (
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                style={{ backgroundColor: siteConfig.primaryColor || '#E2001A' }}
              >
                <ShoppingBag className="w-4 h-4" />
              </div>
            )}
            <div>
              <h2 className="text-base font-black text-gray-900">
                Mon Panier <span translate="no" className="notranslate">Gomarché</span>
              </h2>
              <p className="text-xs text-gray-500">
                {cart.length} référence{cart.length > 1 ? 's' : ''} d'articles
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {cart.length > 0 && (
              <button
                type="button"
                onClick={clearCart}
                className="text-xs text-gray-400 hover:text-red-600 transition-colors"
                title="Vider le panier"
              >
                Vider
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsCartOpen(false)}
              className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Free Delivery Tracker */}
        <div className="bg-red-50/70 p-3.5 border-b border-red-100">
          <div className="flex items-center justify-between text-xs font-bold text-gray-800 mb-1.5">
            <span className="flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-[#E2001A]" />
              {remainingForFreeDelivery === 0 ? (
                <span className="text-emerald-700 font-extrabold">Livraison Gratuite débloquée ! 🎉</span>
              ) : (
                <span>
                  Plus que <span className="text-[#E2001A] font-extrabold">{formatPrice(remainingForFreeDelivery)}</span> pour la livraison offerte
                </span>
              )}
            </span>
            <span className="text-[10px] text-gray-500">
              Palier : {formatPrice(freeDeliveryThreshold)}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 bg-red-200/60 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-500 to-emerald-500 transition-all duration-300 rounded-full"
              style={{ width: `${progressToFreeDelivery}%` }}
            />
          </div>
        </div>

        {/* Cart Item List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 mb-3">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-gray-800">Votre panier est vide</h3>
              <p className="text-xs text-gray-500 max-w-xs mt-1 mb-4">
                Parcourez nos rayons et profitez des promotions exclusives <span translate="no" className="notranslate">Gomarché</span> Goma pour remplir votre panier !
              </p>
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                className="px-5 py-2.5 rounded-full text-white text-xs font-bold shadow-md"
                style={{ backgroundColor: siteConfig.primaryColor || '#E2001A' }}
              >
                Commencer mes courses
              </button>
            </div>
          ) : (
            cart.map((item) => {
              const discountedPrice = item.product.discountPercent
                ? item.product.priceUsd * (1 - item.product.discountPercent / 100)
                : item.product.priceUsd;

              const totalItemPriceUsd = discountedPrice * item.quantity;

              return (
                <div
                  key={item.product.id}
                  className="flex items-center gap-3 p-2.5 rounded-xl border border-gray-100 bg-white hover:border-gray-200 transition-all shadow-xs"
                >
                  <img
                    src={item.product.image}
                    alt={item.product.name}
                    className="w-16 h-16 object-contain rounded-lg bg-gray-50 p-1 border border-gray-100 shrink-0"
                  />

                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider truncate">
                      {item.product.brand}
                    </p>
                    <h4 className="text-xs font-bold text-gray-900 truncate">
                      {item.product.name}
                    </h4>
                    <p className="text-[11px] font-black text-[#E2001A] mt-0.5">
                      {formatPrice(discountedPrice)}
                      {item.product.discountPercent && (
                        <span className="text-[9px] text-gray-400 line-through ml-1 font-normal">
                          {formatPrice(item.product.priceUsd)}
                        </span>
                      )}
                    </p>

                    {/* Quantity controls */}
                    <div className="flex items-center justify-between mt-1.5">
                      <div className="flex items-center border border-gray-200 rounded-lg">
                        <button
                          type="button"
                          onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                          className="w-6 h-6 flex items-center justify-center text-gray-600 hover:bg-gray-100"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-black px-2 text-gray-900">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                          className="w-6 h-6 flex items-center justify-center text-gray-600 hover:bg-gray-100"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <span className="text-xs font-black text-gray-900">
                        {formatPrice(totalItemPriceUsd)}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeFromCart(item.product.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                    title="Supprimer l'article"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer with totals & Checkout Button */}
        {cart.length > 0 && (
          <div className="p-4 bg-gray-50 border-t border-gray-200 space-y-3">
            {/* Total in USD & CDF */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Sous-total articles:</span>
                <span className="font-semibold text-gray-900">{formatPrice(cartTotalUsd)}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Livraison:</span>
                <span className="font-semibold text-emerald-600">
                  {remainingForFreeDelivery === 0 ? 'Offerte (Gratuit)' : '$ 2.50 (7 125 FC)'}
                </span>
              </div>

              <div className="pt-2 border-t border-gray-200 flex items-baseline justify-between">
                <div>
                  <span className="text-sm font-black text-gray-900 block leading-tight">
                    Total TTC :
                  </span>
                  <span className="text-xs text-gray-500 font-medium">
                    soit {currency === 'USD' ? `${cartTotalCdf.toLocaleString('fr-FR')} FC` : `$ ${cartTotalUsd.toFixed(2)}`}
                  </span>
                </div>
                <div className="text-right">
                  <span
                    className="text-xl font-black"
                    style={{ color: siteConfig.primaryColor || '#E2001A' }}
                  >
                    {formatPrice(cartTotalUsd)}
                  </span>
                </div>
              </div>
            </div>

            {/* Mobile Money Notice */}
            <div className="bg-white p-2.5 rounded-xl border border-gray-200 flex items-center justify-between">
              <span className="text-[10px] text-gray-600 font-semibold">Paiement Mobile Money instantané :</span>
              <div className="flex items-center gap-1">
                <AirtelMoneyLogo size="sm" showText={false} customLogoUrl={gateways.airtel?.customLogoUrl} />
                <OrangeMoneyLogo size="sm" showText={false} customLogoUrl={gateways.orange?.customLogoUrl} />
                <MpesaLogo size="sm" showText={false} customLogoUrl={gateways.mpesa?.customLogoUrl} />
                <AfriMoneyLogo size="sm" showText={false} customLogoUrl={gateways.afrimoney?.customLogoUrl} />
              </div>
            </div>

            {/* Checkout Button */}
            <button
              type="button"
              onClick={() => {
                setIsCartOpen(false);
                setIsCheckoutOpen(true);
              }}
              className="w-full py-3.5 px-4 rounded-xl text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-transform transform active:scale-95"
              style={{ backgroundColor: siteConfig.primaryColor || '#E2001A' }}
            >
              <span>Valider ma commande</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
