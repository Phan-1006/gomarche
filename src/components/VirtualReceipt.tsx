import React from 'react';
import { Printer } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Order } from '../types';
import { formatDateTime, METHOD_LABELS, PAYMENT_STATUS_LABELS, PURPOSE_LABELS, STATUS_LABELS } from '../utils/orders';

/** Reçu d'une commande : montants figés à la commande, état de chaque paiement. */
export const VirtualReceipt: React.FC<{ order: Order }> = ({ order }) => {
  const { formatPrice, siteConfig } = useApp();

  return (
    <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden max-w-xl mx-auto print:shadow-none print:border-0">
      <div className="bg-[#161A1D] text-white p-5 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-black notranslate" translate="no">{siteConfig.siteName}</h3>
          <p className="text-xs text-gray-400">{siteConfig.storeAddress}</p>
          <p className="text-xs text-gray-400">{siteConfig.storePhone}</p>
        </div>
        <div className="text-right text-xs">
          <p className="font-mono font-black text-base">{order.orderNumber}</p>
          <p className="text-gray-400">{formatDateTime(order.createdAt)}</p>
          <p className="text-emerald-400 font-bold mt-1">{STATUS_LABELS[order.status]}</p>
        </div>
      </div>

      <div className="p-5 space-y-4 text-xs">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Client</p>
            <p className="font-bold text-gray-900">{order.customer.name}</p>
            <p className="text-gray-600">{order.customer.phone}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-gray-400 mb-1">
              {order.deliveryMode === 'delivery' ? 'Livraison' : 'Retrait au magasin'}
            </p>
            {order.deliveryMode === 'delivery' && (
              <p className="text-gray-700">{order.customer.address}, {order.customer.quartierGoma}, Goma</p>
            )}
            <p className="font-bold text-gray-900">{order.deliverySlotName}</p>
          </div>
        </div>

        <table className="w-full">
          <thead className="text-[10px] uppercase text-gray-400 border-b border-gray-200">
            <tr>
              <th className="text-left py-1.5 font-black">Article</th>
              <th className="text-right py-1.5 font-black">Qté</th>
              <th className="text-right py-1.5 font-black">P.U.</th>
              <th className="text-right py-1.5 font-black">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {order.items.map((item) => (
              <tr key={item.productId}>
                <td className="py-2">
                  <p className="font-bold text-gray-900">{item.name}</p>
                  <p className="text-[10px] text-gray-400">{item.brand} • {item.unit}</p>
                </td>
                <td className="py-2 text-right">{item.quantity}</td>
                <td className="py-2 text-right">$ {item.unitPriceUsd.toFixed(2)}</td>
                <td className="py-2 text-right font-bold">$ {(item.unitPriceUsd * item.quantity).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="space-y-1 border-t border-gray-200 pt-3">
          <div className="flex justify-between text-gray-600">
            <span>Sous-total</span>
            <span>$ {order.subtotalUsd.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>{order.deliveryMode === 'delivery' ? 'Frais de livraison' : 'Retrait'}</span>
            <span>{order.deliveryFeeUsd > 0 ? `$ ${order.deliveryFeeUsd.toFixed(2)}` : 'Gratuit'}</span>
          </div>
          <div className="flex justify-between text-sm font-black text-gray-900 pt-1">
            <span>Total</span>
            <span>
              $ {order.totalUsd.toFixed(2)} <span className="text-xs font-bold text-gray-500">({order.totalCdf.toLocaleString('fr-FR')} FC au taux {order.exchangeRate})</span>
            </span>
          </div>
        </div>

        <div className="bg-gray-50 rounded-2xl p-3 space-y-1.5">
          <p className="text-[10px] font-black uppercase text-gray-400">Paiements</p>
          {order.payments.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-2">
              <span className="text-gray-700">
                {PURPOSE_LABELS[p.purpose]} • {METHOD_LABELS[p.method]}
                {p.transactionRef && <span className="font-mono text-gray-500"> • {p.transactionRef}</span>}
              </span>
              <span className="font-bold text-gray-900 shrink-0">
                {formatPrice(p.amountUsd, 'USD')} • {PAYMENT_STATUS_LABELS[p.status]}
              </span>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="w-full py-2.5 rounded-xl border border-gray-300 text-gray-700 font-bold flex items-center justify-center gap-2 print:hidden"
        >
          <Printer className="w-4 h-4" />
          <span>Imprimer ou enregistrer en PDF</span>
        </button>
      </div>
    </div>
  );
};
