import React, { useState } from 'react';
import {
  FileText,
  ShieldCheck,
  CheckCircle2,
  Printer,
  XCircle,
  AlertTriangle,
  Clock,
  MapPin,
  Phone,
  QrCode,
  Copy,
  Check,
} from 'lucide-react';
import { Order } from '../types';
import { useApp } from '../context/AppContext';
import { PaymentMethodBadge } from './MobileMoneyLogos';

interface VirtualReceiptProps {
  order: Order;
  onClose?: () => void;
}

export const VirtualReceipt: React.FC<VirtualReceiptProps> = ({ order, onClose }) => {
  const { formatPrice, cancelOrder, siteConfig, currency } = useApp();
  const [copied, setCopied] = useState(false);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('Changement d’avis client');

  // Check 24-hour cancellation rule
  const now = Date.now();
  const isWithin24Hours = now < order.cancellationDeadlineTimestamp;
  const canCancel =
    order.status !== 'delivered' &&
    order.status !== 'cancelled' &&
    isWithin24Hours;

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(order.confirmationCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirmCancel = () => {
    cancelOrder(order.id, cancelReason);
    setIsCancelConfirmOpen(false);
  };

  const hoursRemainingToCancel = Math.max(
    0,
    Math.round((order.cancellationDeadlineTimestamp - now) / (1000 * 60 * 60))
  );

  return (
    <div className="bg-white rounded-3xl border-2 border-gray-200 overflow-hidden shadow-2xl max-w-2xl mx-auto my-4 text-gray-900">
      {/* Receipt Top Header */}
      <div className="bg-[#1C2024] text-white p-6 relative">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {siteConfig.customLogoUrl ? (
              <img
                src={siteConfig.customLogoUrl}
                alt={siteConfig.siteName}
                className="h-12 max-w-[140px] object-contain rounded-2xl bg-white/95 p-1 border border-white/20 shadow-md"
              />
            ) : (
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-2xl text-white shadow-md border-2 border-white/30"
                style={{ backgroundColor: siteConfig.primaryColor || '#E2001A' }}
              >
                G
              </div>
            )}
            <div>
              <h2 className="text-xl font-black tracking-tight">
                <span translate="no" className="notranslate">Gomarché</span> Goma
              </h2>
              <p className="text-xs text-gray-400">
                Reçu Numérique Virtuel & Bordereau de Livraison
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-bold text-gray-200 flex items-center gap-1.5 transition-colors border border-gray-700"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimer</span>
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-colors"
              >
                Fermer
              </button>
            )}
          </div>
        </div>

        {/* Order Meta Bar */}
        <div className="mt-6 pt-4 border-t border-gray-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-gray-400 block text-[10px] uppercase">N° Reçu</span>
            <span className="font-mono font-bold text-white">{order.orderNumber}</span>
          </div>
          <div>
            <span className="text-gray-400 block text-[10px] uppercase">Date & Heure</span>
            <span className="font-medium text-white">{order.date}</span>
          </div>
          <div>
            <span className="text-gray-400 block text-[10px] uppercase">Ville & Quartier</span>
            <span className="font-medium text-emerald-400">Goma • {order.customer.quartierGoma}</span>
          </div>
          <div>
            <span className="text-gray-400 block text-[10px] uppercase">Statut Commande</span>
            <span
              className={`font-black uppercase text-[10px] px-2 py-0.5 rounded-full inline-block ${
                order.status === 'delivered'
                  ? 'bg-emerald-500 text-white'
                  : order.status === 'cancelled'
                  ? 'bg-red-500 text-white'
                  : 'bg-amber-400 text-gray-950'
              }`}
            >
              {order.status === 'delivered' && 'Colis Réceptionné'}
              {order.status === 'cancelled' && 'Commande Annulée'}
              {order.status === 'in_delivery' && 'En Route (Livreur)'}
              {order.status === 'preparing' && 'En Préparation'}
              {order.status === 'paid' && 'Payée & Validée'}
            </span>
          </div>
        </div>
      </div>

      {/* Secret Handover Code Highlight Box */}
      <div className="p-6 bg-gradient-to-br from-amber-50 via-white to-red-50 border-b-2 border-dashed border-gray-300">
        <div className="rounded-2xl border-2 border-amber-300 bg-white p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck className="w-5 h-5 text-[#E2001A]" />
                <span className="text-xs font-black uppercase tracking-wider text-gray-900">
                  Code Secret de Confirmation de Réception
                </span>
              </div>
              <p className="text-xs text-gray-600 max-w-md">
                Ce code est votre preuve exclusive de paiement. Communiquez-le au livreur <span translate="no" className="notranslate">Gomarché</span> uniquement lors de la remise physique de vos articles à Goma.
              </p>
            </div>

            {/* The Code Badge */}
            <div className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-2xl shadow-md shrink-0">
              <span className="font-mono text-xl sm:text-2xl font-black tracking-widest text-amber-300">
                {order.confirmationCode}
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="p-1 text-gray-400 hover:text-white rounded-md"
                title="Copier le code"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {order.status === 'delivered' ? (
            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-2 text-xs font-black text-emerald-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Livraison officiellement validée par saisie du code chez le livreur. L'annulation est désormais close.</span>
            </div>
          ) : (
            <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
              <span className="flex items-center gap-1.5 text-amber-700 font-semibold">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  {canCancel
                    ? `Annulation possible sous 24h (Reste environ ${hoursRemainingToCancel}h)`
                    : 'Délai d’annulation de 24h expiré'}
                </span>
              </span>

              {canCancel && (
                <button
                  type="button"
                  onClick={() => setIsCancelConfirmOpen(true)}
                  className="text-xs font-bold text-red-600 hover:underline flex items-center gap-1"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Annuler la commande</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Ordered Items Table */}
      <div className="p-6 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
          Articles & Produits Commandés ({order.items.length})
        </h3>

        <div className="divide-y divide-gray-100 text-xs">
          {order.items.map((item, idx) => (
            <div key={idx} className="py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-black text-gray-900 bg-gray-100 px-2 py-0.5 rounded">
                  {item.quantity}x
                </span>
                <div>
                  <p className="font-bold text-gray-900">{item.product.name}</p>
                  <p className="text-[10px] text-gray-400">{item.product.brand} • {item.product.unit}</p>
                </div>
              </div>

              <div className="text-right">
                <span className="font-black text-gray-900">
                  {formatPrice(item.product.priceUsd * item.quantity)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Totals & Delivery fee addition */}
        <div className="pt-4 border-t border-gray-200 space-y-1.5 text-xs">
          <div className="flex items-center justify-between text-gray-600">
            <span>Sous-total articles :</span>
            <span className="font-semibold text-gray-900">{formatPrice(order.subtotalUsd)}</span>
          </div>

          <div className="flex items-center justify-between text-gray-600">
            <span>
              Frais de livraison Goma ({order.deliverySlotName}) :
            </span>
            <span className="font-black text-emerald-700">
              {order.deliveryFeeUsd > 0
                ? `+ ${formatPrice(order.deliveryFeeUsd)}`
                : 'Gratuit (Seuil fidélité atteint)'}
            </span>
          </div>

          <div className="pt-2 border-t border-gray-200 flex items-baseline justify-between">
            <div>
              <span className="text-sm font-black text-gray-900">Total Général Réglé :</span>
              <span className="text-xs text-gray-500 block">
                soit {currency === 'USD' ? `${order.totalCdf.toLocaleString('fr-FR')} FC` : `$ ${order.totalUsd.toFixed(2)}`}
              </span>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-[#E2001A]">
                {formatPrice(order.totalUsd)}
              </span>
            </div>
          </div>
        </div>

        {/* Delivery and Customer Information */}
        <div className="pt-4 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3 bg-gray-50 rounded-xl space-y-1">
            <span className="text-[10px] uppercase font-bold text-gray-400 block">
              Adresse de Livraison (Goma)
            </span>
            <p className="font-bold text-gray-900">{order.customer.name}</p>
            <p className="text-gray-600">
              {order.customer.address}, {order.customer.quartierGoma}, Goma
            </p>
            <p className="text-gray-500 font-mono">{order.customer.phone}</p>
          </div>

          <div className="p-3 bg-gray-50 rounded-xl space-y-1">
            <span className="text-[10px] uppercase font-bold text-gray-400 block">
              Validation Mobile Money
            </span>
            <div className="flex items-center gap-2">
              <PaymentMethodBadge method={order.paymentMethod} size="sm" />
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                Transaction Confirmée
              </span>
            </div>
            <p className="text-[11px] text-gray-500 font-mono mt-1">
              Réf : {order.transactionRef}
            </p>
            <p className="text-[10px] text-gray-400">
              API Webhook Instant Gateway Goma
            </p>
          </div>
        </div>

        {/* Barcode representation */}
        <div className="pt-4 flex flex-col items-center justify-center text-center">
          <div className="font-mono text-xl tracking-widest text-gray-700 font-black">
            ||| | ||||| || |||| ||| |||| | ||||
          </div>
          <span className="text-[10px] font-mono text-gray-400 mt-1">
            {order.orderNumber} • {order.confirmationCode}
          </span>
        </div>
      </div>

      {/* Cancellation Confirmation Modal */}
      {isCancelConfirmOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h4 className="text-base font-black text-gray-900">
                Annuler votre commande ?
              </h4>
              <p className="text-xs text-gray-500 mt-1">
                Conformément à la politique <span translate="no" className="notranslate">Gomarché</span> Goma, l'annulation est possible dans les 24h précédant la livraison. Le montant sera immédiatement recrédité sur votre compte Mobile Money.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Motif de l'annulation
              </label>
              <select
                aria-label="Sélectionner le motif de l'annulation"
                className="w-full text-xs border border-gray-300 rounded-xl p-2 bg-white"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              >
                <option value="Changement d’avis client">Changement d’avis</option>
                <option value="Erreur dans la commande d'articles">Erreur dans la commande</option>
                <option value="Retard ou indisponibilité à l'adresse">Indisponible à l'adresse</option>
                <option value="Autre motif">Autre motif</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCancelConfirmOpen(false)}
                className="py-2.5 rounded-xl border border-gray-300 font-bold text-xs text-gray-700 hover:bg-gray-100"
              >
                Garder la commande
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                className="py-2.5 rounded-xl bg-red-600 hover:bg-red-700 font-bold text-xs text-white shadow-md"
              >
                Confirmer l'annulation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
