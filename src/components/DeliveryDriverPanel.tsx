import React, { useState } from 'react';
import {
  Truck,
  Phone,
  MapPin,
  Clock,
  CheckCircle2,
  Navigation,
  KeyRound,
  AlertCircle,
  Package,
  Layers,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Order } from '../types';
import { GomaDeliveryMap } from './GomaDeliveryMap';

export const DeliveryDriverPanel: React.FC = () => {
  const {
    currentUser,
    orders,
    siteConfig,
    updateOrderStatus,
    confirmOrderDeliveryWithCode,
    formatPrice,
    setActiveView,
    setIsAuthOpen,
  } = useApp();

  // Access check
  if (currentUser?.role !== 'delivery_driver' && currentUser?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 border border-blue-200 shadow-2xl max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
            <Truck className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-gray-900">Espace Livreur Goma Réservé</h2>
          <p className="text-xs text-gray-600 leading-relaxed">
            Cette interface de livraison avec suivi GPS et validation de code secret est strictement réservée aux coursiers et chauffeurs Gomarché.
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setIsAuthOpen(true)}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
            >
              Se connecter avec mes identifiants Livreur
            </button>
            <button
              type="button"
              onClick={() => setActiveView('home')}
              className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-colors"
            >
              Retour à la boutique
            </button>
          </div>
        </div>
      </div>
    );
  }

  const [selectedOrderTab, setSelectedOrderTab] = useState<'pending' | 'delivered'>('pending');
  const [selectedOrderForMap, setSelectedOrderForMap] = useState<Order | null>(null);

  // Handover confirmation modal
  const [orderToConfirm, setOrderToConfirm] = useState<Order | null>(null);
  const [handoverCodeInput, setHandoverCodeInput] = useState('');
  const [handoverError, setHandoverError] = useState('');
  const [handoverSuccess, setHandoverSuccess] = useState('');

  const pendingOrders = orders.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled');
  const deliveredOrders = orders.filter((o) => o.status === 'delivered');
  const displayedOrders = selectedOrderTab === 'pending' ? pendingOrders : deliveredOrders;

  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderToConfirm) return;

    setHandoverError('');
    setHandoverSuccess('');

    const res = confirmOrderDeliveryWithCode(orderToConfirm.id, handoverCodeInput);
    if (res.success) {
      setHandoverSuccess(res.message);
      setTimeout(() => {
        setOrderToConfirm(null);
        setHandoverCodeInput('');
        setHandoverSuccess('');
        setSelectedOrderForMap(null);
      }, 1500);
    } else {
      setHandoverError(res.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100/70 pb-20">
      {/* Driver Header */}
      <div className="bg-[#161A1D] text-white">
        <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {siteConfig.customLogoUrl ? (
              <img
                src={siteConfig.customLogoUrl}
                alt={siteConfig.siteName}
                className="h-12 max-w-[140px] object-contain rounded-2xl bg-white/10 p-1 border border-white/10 shadow-lg"
              />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg">
                <Truck className="w-6 h-6" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black">
                  Espace Livreur <span translate="no" className="notranslate">Gomarché</span> Goma Express
                </h1>
                <span className="bg-blue-500/20 text-blue-300 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-blue-500/30">
                  Zone Goma Exclusif
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Chauffeur : <span className="text-white font-bold">{currentUser?.name}</span> ({currentUser?.phone || '+243 998 777 888'})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedOrderTab('pending')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                selectedOrderTab === 'pending'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              Courses à livrer ({pendingOrders.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedOrderTab('delivered')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                selectedOrderTab === 'delivered'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              Livrées & Validées ({deliveredOrders.length})
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Selected Order Map view if open */}
        {selectedOrderForMap && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-gray-700 uppercase">
                Tracé GPS en temps réel vers {selectedOrderForMap.customer.quartierGoma}
              </span>
              <button
                type="button"
                onClick={() => setSelectedOrderForMap(null)}
                className="text-xs text-red-600 font-bold hover:underline"
              >
                Fermer la carte
              </button>
            </div>
            <GomaDeliveryMap
              order={selectedOrderForMap}
              isDriverView={true}
              onConfirmHandoverClick={() => {
                setOrderToConfirm(selectedOrderForMap);
                setHandoverCodeInput('');
                setHandoverError('');
              }}
            />
          </div>
        )}

        {displayedOrders.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-gray-200">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-gray-800">Toutes les livraisons à Goma sont à jour !</h3>
            <p className="text-xs text-gray-500 mt-1">
              Aucune course en attente pour le moment.
            </p>
          </div>
        ) : (
          displayedOrders.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-100 gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sm bg-gray-100 text-gray-800 px-3 py-1 rounded-xl">
                    {order.orderNumber}
                  </span>
                  <span className="text-xs text-gray-400">• {order.date}</span>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                    Payé Mobile Money ({order.paymentMethod.replace('_', ' ')})
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-black px-3 py-1 rounded-full ${
                      order.status === 'delivered'
                        ? 'bg-emerald-100 text-emerald-800'
                        : order.status === 'in_delivery'
                        ? 'bg-blue-100 text-blue-800 animate-pulse'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {order.status === 'paid' && 'Payé • En attente de départ'}
                    {order.status === 'preparing' && 'En préparation magasin'}
                    {order.status === 'in_delivery' && '🛵 En cours de route à Goma'}
                    {order.status === 'delivered' && '✅ Validé par Code Client'}
                  </span>
                </div>
              </div>

              {/* Client and Destination details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    Destinataire à Goma
                  </span>
                  <p className="text-sm font-black text-gray-900">{order.customer.name}</p>
                  <a
                    href={`tel:${order.customer.phone}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-xl hover:bg-blue-100"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>{order.customer.phone}</span>
                  </a>

                  <div className="flex items-start gap-1.5 text-xs text-gray-600 pt-1">
                    <MapPin className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-gray-900">
                        {order.customer.address}
                      </p>
                      <p className="text-emerald-700 font-bold">Quartier {order.customer.quartierGoma}, Goma</p>
                      {order.customer.deliveryNotes && (
                        <p className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded-xl mt-1">
                          Repère : "{order.customer.deliveryNotes}"
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    Contenu du Colis ({order.items.length} articles)
                  </span>
                  <div className="bg-gray-50 rounded-2xl p-3 space-y-1 max-h-28 overflow-y-auto text-xs">
                    {order.items.map((it, idx) => (
                      <div key={idx} className="flex items-center justify-between text-gray-700">
                        <span className="truncate max-w-[200px]">
                          {it.quantity}x {it.product.name}
                        </span>
                        <span className="font-bold">{formatPrice(it.product.priceUsd * it.quantity)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-xs font-bold text-gray-900 pt-1">
                    <span>Créneau : {order.deliverySlotName}</span>
                    <span className="text-emerald-700 font-black">
                      Total : {formatPrice(order.totalUsd)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedOrderForMap(order)}
                  className="px-4 py-2 bg-gray-900 hover:bg-black text-white font-bold text-xs rounded-xl flex items-center gap-1.5"
                >
                  <Navigation className="w-4 h-4 text-emerald-400" />
                  <span>Afficher la Map GPS & Itinéraire Goma</span>
                </button>

                <div className="flex flex-wrap items-center gap-2">
                  {order.status !== 'in_delivery' && order.status !== 'delivered' && (
                    <button
                      type="button"
                      onClick={() => updateOrderStatus(order.id, 'in_delivery')}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>Prendre en charge (En route)</span>
                    </button>
                  )}

                  {order.status !== 'delivered' && (
                    <button
                      type="button"
                      onClick={() => {
                        setOrderToConfirm(order);
                        setHandoverCodeInput('');
                        setHandoverError('');
                        setHandoverSuccess('');
                      }}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md flex items-center gap-2"
                    >
                      <KeyRound className="w-4 h-4" />
                      <span>Demander le Code Client pour Valider</span>
                    </button>
                  )}

                  {order.status === 'delivered' && (
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Livraison validée par code secret client</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Handover Code Verification Modal */}
      {orderToConfirm && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setOrderToConfirm(null)}
              className="absolute top-4 right-4 p-1 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <KeyRound className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-black text-gray-900">
                Validation de la Remise au Client
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Demandez au client le code de confirmation figurant sur son reçu virtuel (ex: GM-XXXX).
              </p>
            </div>

            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Code Secret Client *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: GM-7492 ou 7492"
                  className="w-full text-center font-mono text-2xl font-black px-4 py-3 rounded-2xl border-2 border-emerald-500 bg-emerald-50/50 uppercase tracking-widest text-gray-900 focus:outline-hidden"
                  value={handoverCodeInput}
                  onChange={(e) => setHandoverCodeInput(e.target.value)}
                  autoFocus
                />
              </div>

              {handoverError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700 font-bold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{handoverError}</span>
                </div>
              )}

              {handoverSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800 font-bold">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{handoverSuccess}</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOrderToConfirm(null)}
                  className="py-3 px-4 rounded-xl border border-gray-300 font-bold text-xs text-gray-700 hover:bg-gray-100"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md"
                >
                  Valider la Livraison Définitive
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
