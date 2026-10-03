import React, { Suspense, useState } from 'react';
import {
  Package,
  CheckCircle2,
  Clock,
  Truck,
  ArrowLeft,
  Phone,
  Navigation,
  FileText,
  XCircle,
  ShieldCheck,
  User as UserIcon,
  Banknote,
  Store,
  Loader2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Order, OrderStatus } from '../types';
import { GOMA_QUARTIERS } from '../data/mockData';
import { errorMessage } from '../services/api';
import { cashDue, etaMinutes, formatDateTime, formatTime, isActiveOrder, STATUS_LABELS, STATUS_STYLES } from '../utils/orders';
import { VirtualReceipt } from './VirtualReceipt';
import { PaymentInstructions } from './PaymentInstructions';
import { OrderChat } from './OrderChat';

const LiveMap = React.lazy(() => import('./LiveMap'));

const STEPS: { status: OrderStatus; label: string }[] = [
  { status: 'awaiting_payment', label: 'Paiement' },
  { status: 'confirmed', label: 'Confirmée' },
  { status: 'preparing', label: 'Préparation' },
  { status: 'ready', label: 'Prête' },
  { status: 'in_delivery', label: 'En route' },
  { status: 'delivered', label: 'Livrée' },
];

const Progress: React.FC<{ order: Order }> = ({ order }) => {
  const steps = order.deliveryMode === 'drive' ? STEPS.filter((s) => s.status !== 'in_delivery') : STEPS;
  const current = steps.findIndex((s) => s.status === order.status);
  return (
    <ol className="flex items-center gap-1">
      {steps.map((s, i) => (
        <li key={s.status} className="flex-1 min-w-0">
          <div className={`h-1.5 rounded-full ${i <= current ? 'bg-emerald-500' : 'bg-gray-200'}`} />
          <span className={`block mt-1 text-[10px] font-bold truncate ${i === current ? 'text-gray-900' : 'text-gray-400'}`}>
            {s.status === 'delivered' && order.deliveryMode === 'drive' ? 'Retirée' : s.label}
          </span>
        </li>
      ))}
    </ol>
  );
};

const OrderDetail: React.FC<{ order: Order }> = ({ order }) => {
  const { setSelectedOrder, orderAction, siteConfig, formatPrice, notify } = useApp();
  const [subView, setSubView] = useState<'tracking' | 'receipt'>('tracking');
  const [cancelling, setCancelling] = useState(false);

  const canCancel = order.status === 'awaiting_payment' || order.status === 'confirmed';
  const cash = cashDue(order);
  const destination = order.customer.coordinates;
  const showMap = order.deliveryMode === 'delivery' && isActiveOrder(order) && (destination || order.driverLocation);

  const cancel = async () => {
    if (!confirm('Annuler cette commande ? Un paiement déjà validé vous sera remboursé par la caisse.')) return;
    setCancelling(true);
    try {
      await orderAction(order.id, 'cancel');
      notify('Commande annulée.');
    } catch (e) {
      notify(errorMessage(e), 'error');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={() => setSelectedOrder(null)} className="text-xs font-bold text-gray-600 hover:text-gray-900 flex items-center gap-1.5">
          <ArrowLeft className="w-4 h-4" />
          <span>Mes commandes</span>
        </button>
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-2xl border border-gray-200">
          {(['tracking', 'receipt'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setSubView(v)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 ${subView === v ? 'bg-gray-900 text-white' : 'text-gray-600'}`}
            >
              {v === 'tracking' ? <Navigation className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
              <span>{v === 'tracking' ? 'Suivi' : 'Reçu'}</span>
            </button>
          ))}
        </div>
      </div>

      {subView === 'receipt' ? (
        <VirtualReceipt order={order} />
      ) : (
        <div className="space-y-5">
          <div className="bg-white rounded-3xl p-5 border border-gray-200 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-mono font-black text-lg text-gray-900">{order.orderNumber}</span>
                <p className="text-xs text-gray-500">
                  {order.deliveryMode === 'delivery' ? 'Livraison' : 'Retrait'} : {order.deliverySlotName}
                </p>
              </div>
              <span className={`text-xs font-black px-3 py-1 rounded-full ${STATUS_STYLES[order.status]}`}>
                {order.status === 'ready' && order.deliveryMode === 'drive' ? 'Prête à retirer au magasin' : STATUS_LABELS[order.status]}
              </span>
            </div>
            {order.status === 'cancelled' ? (
              <p className="text-xs text-red-700 font-bold">Motif : {order.cancelReason}</p>
            ) : (
              <Progress order={order} />
            )}
          </div>

          <PaymentInstructions order={order} />

          {showMap && (
            <div className="space-y-2">
              <Suspense fallback={<div className="h-72 rounded-3xl bg-gray-100 animate-pulse" />}>
                <LiveMap store={siteConfig.storeLocation} destination={destination} driver={order.driverLocation} />
              </Suspense>
              <p className="text-xs text-gray-600 px-1">
                {order.status !== 'in_delivery'
                  ? 'La position du livreur apparaîtra ici dès son départ du magasin.'
                  : order.driverLocation
                  ? `Position du livreur mise à jour à ${formatTime(order.driverLocation.at)}${
                      destination ? ` • arrivée estimée dans ~${etaMinutes(order.driverLocation, destination)} min` : ''
                    }`
                  : 'Le livreur est en route ; sa position GPS n’est pas disponible pour le moment. Vous pouvez l’appeler.'}
              </p>
            </div>
          )}

          {order.deliveryDriverName && isActiveOrder(order) && (
            <div className="bg-white rounded-3xl p-5 border border-gray-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-gray-400">Votre livreur</span>
                  <p className="text-sm font-black text-gray-900">{order.deliveryDriverName}</p>
                </div>
              </div>
              {order.deliveryDriverPhone && (
                <a href={`tel:${order.deliveryDriverPhone}`} className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  <span>Appeler {order.deliveryDriverPhone}</span>
                </a>
              )}
            </div>
          )}

          {order.status === 'ready' && order.deliveryMode === 'drive' && (
            <div className="bg-violet-50 border border-violet-200 rounded-3xl p-5 flex items-start gap-3 text-sm text-gray-800">
              <Store className="w-5 h-5 text-violet-600 shrink-0 mt-0.5" />
              <span>
                Votre commande vous attend au magasin : <strong>{siteConfig.storeAddress}</strong>. Donnez votre code au comptoir.
              </span>
            </div>
          )}

          {isActiveOrder(order) && order.confirmationCode && (
            <div className="bg-amber-50 rounded-3xl p-5 border-2 border-amber-200 flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Code de remise
                </span>
                <span className="font-mono text-3xl font-black text-gray-900 tracking-widest">{order.confirmationCode}</span>
                <p className="text-xs text-gray-600 mt-1">
                  À donner {order.deliveryMode === 'delivery' ? 'au livreur' : 'au comptoir'} uniquement quand vous avez vos courses en main.
                </p>
              </div>
              {cash && (
                <div className="text-right">
                  <span className="text-[10px] font-black uppercase text-gray-500 flex items-center gap-1 justify-end">
                    <Banknote className="w-3.5 h-3.5" /> À payer en espèces à la remise
                  </span>
                  <span className="text-xl font-black text-gray-900">{formatPrice(cash.amountUsd, 'USD')}</span>
                  <span className="block text-xs text-gray-500">ou {cash.amountCdf.toLocaleString('fr-FR')} FC</span>
                </div>
              )}
            </div>
          )}

          {(order.deliveryDriverId || order.preparerId) && <OrderChat order={order} />}

          {canCancel && (
            <button
              type="button"
              onClick={cancel}
              disabled={cancelling}
              className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs rounded-xl flex items-center gap-1.5 disabled:opacity-60"
            >
              {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
              <span>Annuler la commande</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const ProfileForm: React.FC = () => {
  const { currentUser, updateProfile, notify } = useApp();
  const [name, setName] = useState(currentUser?.name || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [address, setAddress] = useState(currentUser?.address || '');
  const [commune, setCommune] = useState(currentUser?.commune || GOMA_QUARTIERS[0]);
  const [busy, setBusy] = useState(false);
  const inputClass = 'w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-hidden focus:border-[#E2001A]';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const res = await updateProfile({ name, phone: phone || undefined, address, commune });
    setBusy(false);
    notify(res.success ? 'Profil enregistré.' : res.message || 'Erreur', res.success ? 'success' : 'error');
  };

  return (
    <form onSubmit={submit} className="bg-white rounded-3xl p-6 border border-gray-200 space-y-4 max-w-xl">
      <div>
        <h3 className="text-sm font-black text-gray-900">Mon profil</h3>
        <p className="text-xs text-gray-500">{currentUser?.email} • {currentUser?.loyaltyPoints} points de fidélité</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="pf-name" className="block text-xs font-bold text-gray-700 mb-1">Nom</label>
          <input id="pf-name" className={inputClass} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </div>
        <div>
          <label htmlFor="pf-phone" className="block text-xs font-bold text-gray-700 mb-1">Téléphone</label>
          <input id="pf-phone" className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" placeholder="+243 8XX XXX XXX" />
        </div>
        <div>
          <label htmlFor="pf-commune" className="block text-xs font-bold text-gray-700 mb-1">Quartier</label>
          <select id="pf-commune" className={`${inputClass} bg-white`} value={commune} onChange={(e) => setCommune(e.target.value)}>
            {GOMA_QUARTIERS.map((q) => (
              <option key={q} value={q}>{q}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="pf-address" className="block text-xs font-bold text-gray-700 mb-1">Adresse</label>
          <input id="pf-address" className={inputClass} value={address} onChange={(e) => setAddress(e.target.value)} autoComplete="street-address" />
        </div>
      </div>
      <button type="submit" disabled={busy} className="px-5 py-2.5 rounded-xl bg-gray-900 text-white text-xs font-bold disabled:opacity-60">
        Enregistrer
      </button>
    </form>
  );
};

export const OrderTrackingView: React.FC = () => {
  const { orders, selectedOrder, setSelectedOrder, setActiveView, formatPrice, currentUser } = useApp();
  const [activeTab, setActiveTab] = useState<'current' | 'history' | 'profile'>('current');

  if (selectedOrder && selectedOrder.userId === currentUser?.id) return <OrderDetail order={selectedOrder} />;

  const currentOrders = orders.filter(isActiveOrder);
  const pastOrders = orders.filter((o) => !isActiveOrder(o));
  const list = activeTab === 'current' ? currentOrders : pastOrders;

  const tabs = [
    { id: 'current' as const, label: `En cours (${currentOrders.length})`, icon: Clock },
    { id: 'history' as const, label: `Historique (${pastOrders.length})`, icon: Package },
    { id: 'profile' as const, label: 'Mon profil', icon: UserIcon },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900">Mes commandes</h2>
          <p className="text-xs text-gray-500">Suivi en direct, paiement, messages avec votre livreur et reçus</p>
        </div>
        <button type="button" onClick={() => setActiveView('home')} className="text-xs font-bold text-[#E2001A] hover:underline self-start sm:self-auto">
          Retour à la boutique
        </button>
      </div>

      <div className="flex items-center gap-2 border-b border-gray-200 pb-2 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap ${activeTab === t.id ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <t.icon className="w-3.5 h-3.5" />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {activeTab === 'profile' ? (
        <ProfileForm />
      ) : list.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 text-center border border-gray-200">
          <Package className="w-10 h-10 text-gray-400 mx-auto mb-2" />
          <h4 className="text-base font-bold text-gray-800">
            {activeTab === 'current' ? 'Aucune commande en cours' : 'Aucune commande passée'}
          </h4>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((ord) => (
            <button
              key={ord.id}
              type="button"
              onClick={() => setSelectedOrder(ord)}
              className="w-full text-left bg-white rounded-3xl p-5 border border-gray-200 hover:border-gray-300 shadow-sm space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-mono font-bold text-base text-gray-900">{ord.orderNumber}</span>
                  <span className="text-xs text-gray-400"> • {formatDateTime(ord.createdAt)}</span>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {ord.items.reduce((n, i) => n + i.quantity, 0)} article(s) • {ord.deliverySlotName}
                  </p>
                </div>
                <span className={`text-xs font-black px-3 py-1 rounded-full ${STATUS_STYLES[ord.status]}`}>{STATUS_LABELS[ord.status]}</span>
              </div>
              {isActiveOrder(ord) && <Progress order={ord} />}
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-gray-900">{formatPrice(ord.totalUsd)}</span>
                <span className="text-xs font-bold text-blue-600 flex items-center gap-1">
                  {ord.status === 'awaiting_payment' ? 'Payer maintenant' : ord.status === 'delivered' ? 'Voir le reçu' : 'Suivre'}
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
