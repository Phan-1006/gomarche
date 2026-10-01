import React, { useState } from 'react';
import {
  Package,
  CheckCircle2,
  Clock,
  Truck,
  MapPin,
  ArrowLeft,
  Download,
  Phone,
  Store,
  CreditCard,
  Navigation,
  FileText,
  Activity,
  XCircle,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Order } from '../types';
import { PaymentMethodBadge } from './MobileMoneyLogos';
import { GomaDeliveryMap } from './GomaDeliveryMap';
import { VirtualReceipt } from './VirtualReceipt';

export const OrderTrackingView: React.FC = () => {
  const {
    orders,
    selectedOrder,
    setSelectedOrder,
    setActiveView,
    formatPrice,
    currency,
    userActivities,
    cancelOrder,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'current' | 'history' | 'activity'>('current');
  const [detailSubView, setDetailSubView] = useState<'map' | 'receipt'>('map');

  const currentOrders = orders.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled');
  const pastOrders = orders.filter((o) => o.status === 'delivered' || o.status === 'cancelled');

  // If viewing a single order detail
  if (selectedOrder) {
    const isWithin24Hours = Date.now() < selectedOrder.cancellationDeadlineTimestamp;
    const canCancel =
      selectedOrder.status !== 'delivered' &&
      selectedOrder.status !== 'cancelled' &&
      isWithin24Hours;

    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setSelectedOrder(null)}
            className="text-xs font-bold text-gray-600 hover:text-gray-900 flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour à mes commandes</span>
          </button>

          {/* Sub-view toggle between GPS Map and Virtual Receipt */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-2xl border border-gray-200">
            <button
              type="button"
              onClick={() => setDetailSubView('map')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
                detailSubView === 'map'
                  ? 'bg-gray-900 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Navigation className="w-3.5 h-3.5 text-emerald-400" />
              <span>Tracé Map & GPS</span>
            </button>
            <button
              type="button"
              onClick={() => setDetailSubView('receipt')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
                detailSubView === 'receipt'
                  ? 'bg-gray-900 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              <span>Reçu Virtuel & Code</span>
            </button>
          </div>
        </div>

        {/* Display selected view */}
        {detailSubView === 'receipt' ? (
          <VirtualReceipt order={selectedOrder} onClose={() => setSelectedOrder(null)} />
        ) : (
          <div className="space-y-6">
            {/* Interactive GPS Map of Goma */}
            <GomaDeliveryMap order={selectedOrder} />

            {/* Secret Confirmation Code Banner */}
            <div className="bg-amber-50 rounded-3xl p-5 border-2 border-amber-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 block">
                  Code Secret de Remise (À fournir au livreur à Goma) :
                </span>
                <span className="font-mono text-2xl font-black text-gray-900">
                  {selectedOrder.confirmationCode}
                </span>
                <p className="text-xs text-gray-600 mt-1">
                  Ce code confirme la réception définitive de vos courses.
                </p>
              </div>

              {canCancel && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Confirmez-vous l'annulation de cette commande (remboursement immédiat sous 24h) ?")) {
                      cancelOrder(selectedOrder.id);
                    }
                  }}
                  className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-bold text-xs rounded-xl flex items-center gap-1.5 shrink-0"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Annuler (Valable 24h)</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900">Espace Suivi & Activités Client</h2>
          <p className="text-xs text-gray-500">
            Suivi des livraisons en cours à Goma, reçus virtuels et journal de votre compte
          </p>
        </div>
        <button
          type="button"
          onClick={() => setActiveView('home')}
          className="text-xs font-bold text-[#E2001A] hover:underline self-start sm:self-auto"
        >
          Retour à la boutique
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('current')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors ${
            activeTab === 'current'
              ? 'bg-gray-900 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Commandes en cours ({currentOrders.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors ${
            activeTab === 'history'
              ? 'bg-gray-900 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>Historique Passé ({pastOrders.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('activity')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors ${
            activeTab === 'activity'
              ? 'bg-gray-900 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Journal d'activités</span>
        </button>
      </div>

      {/* Tab 1: Current Orders */}
      {activeTab === 'current' && (
        <div className="space-y-4">
          {currentOrders.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center border border-gray-200">
              <Package className="w-10 h-10 text-gray-400 mx-auto mb-2" />
              <h4 className="text-base font-bold text-gray-800">Aucune commande en cours</h4>
              <p className="text-xs text-gray-500 mt-1">
                Faites vos courses pour suivre votre coursier en direct sur la carte de Goma !
              </p>
            </div>
          ) : (
            currentOrders.map((ord) => (
              <div
                key={ord.id}
                className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-100 gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-base text-gray-900">
                        {ord.orderNumber}
                      </span>
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                        Payé ({ord.paymentMethod.replace('_', ' ')})
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Destination : Quartier {ord.customer.quartierGoma} • Créneau : {ord.deliverySlotName}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-blue-700 bg-blue-50 px-3 py-1 rounded-full animate-pulse">
                      {ord.status === 'in_delivery' ? '🛵 En cours de livraison' : '🏬 En préparation magasin'}
                    </span>
                  </div>
                </div>

                {/* Secret Code preview */}
                <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#E2001A]" />
                    <span className="text-xs font-bold text-gray-900">
                      Code Secret à donner au livreur :
                    </span>
                  </div>
                  <span className="font-mono text-base font-black text-amber-900 bg-white px-3 py-1 rounded-xl border border-amber-300">
                    {ord.confirmationCode}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-sm font-black text-gray-900">
                    Total : {formatPrice(ord.totalUsd)}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedOrder(ord);
                        setDetailSubView('map');
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Tracé GPS en direct</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedOrder(ord);
                        setDetailSubView('receipt');
                      }}
                      className="px-4 py-2 bg-gray-900 hover:bg-black text-white font-bold text-xs rounded-xl flex items-center gap-1.5"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Reçu Virtuel</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 2: Past Orders History */}
      {activeTab === 'history' && (
        <div className="space-y-3">
          {pastOrders.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center border border-gray-200">
              <Package className="w-10 h-10 text-gray-400 mx-auto mb-2" />
              <h4 className="text-base font-bold text-gray-800">Aucune commande archivée</h4>
            </div>
          ) : (
            pastOrders.map((ord) => (
              <div
                key={ord.id}
                onClick={() => {
                  setSelectedOrder(ord);
                  setDetailSubView('receipt');
                }}
                className="bg-white rounded-2xl p-4 border border-gray-200 hover:border-gray-300 transition-all cursor-pointer flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-gray-900">{ord.orderNumber}</span>
                    <span className="text-xs text-gray-400">• {ord.date}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        ord.status === 'delivered'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {ord.status === 'delivered' ? 'Livré et Confirmé par Code' : 'Annulé'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Quartier {ord.customer.quartierGoma} • {ord.items.length} articles
                  </p>
                </div>

                <div className="text-right">
                  <span className="font-black text-sm text-gray-900 block">{formatPrice(ord.totalUsd)}</span>
                  <span className="text-[11px] text-blue-600 font-bold hover:underline">
                    Voir le reçu
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 3: Activity Log */}
      {activeTab === 'activity' && (
        <div className="bg-white rounded-3xl p-6 border border-gray-200 space-y-4">
          <h3 className="text-sm font-black text-gray-900">Journal d'activités récent</h3>
          <div className="divide-y divide-gray-100 text-xs">
            {userActivities.map((act) => (
              <div key={act.id} className="py-3 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-red-50 text-[#E2001A] flex items-center justify-center shrink-0">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">{act.title}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{act.description}</p>
                  <span className="text-[10px] text-gray-400 block mt-1">{act.timestamp}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
