import React, { useEffect, useMemo, useState } from 'react';
import { Phone, XCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Order, OrderStatus, StaffMember } from '../../types';
import { api, errorMessage } from '../../services/api';
import { formatDateTime, isActiveOrder, PAYMENT_STATUS_LABELS, PURPOSE_LABELS, STATUS_LABELS, STATUS_STYLES } from '../../utils/orders';

const FILTERS: { id: 'active' | OrderStatus | 'all'; label: string }[] = [
  { id: 'active', label: 'En cours' },
  { id: 'awaiting_payment', label: 'À payer' },
  { id: 'confirmed', label: 'À préparer' },
  { id: 'preparing', label: 'En préparation' },
  { id: 'ready', label: 'Prêtes' },
  { id: 'in_delivery', label: 'En route' },
  { id: 'delivered', label: 'Livrées' },
  { id: 'cancelled', label: 'Annulées' },
  { id: 'all', label: 'Toutes' },
];

/** Supervision des commandes : où en est chacune, qui s'en occupe, réattribution et annulation. */
export const OrdersTab: React.FC = () => {
  const { workOrders, orderAction, notify } = useApp();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('active');
  const [staff, setStaff] = useState<StaffMember[]>([]);

  useEffect(() => {
    api<{ staff: StaffMember[] }>('GET', '/admin/staff').then((d) => setStaff(d.staff)).catch(() => {});
  }, []);

  const assignable = (role: StaffMember['role']) => staff.filter((s) => s.role === role && s.active && s.hasAccount);
  const drivers = assignable('delivery_driver');
  const preparers = assignable('order_agent');

  const list = useMemo(
    () => workOrders.filter((o) => (filter === 'all' ? true : filter === 'active' ? isActiveOrder(o) : o.status === filter)),
    [workOrders, filter]
  );
  const count = (id: (typeof FILTERS)[number]['id']) =>
    workOrders.filter((o) => (id === 'all' ? true : id === 'active' ? isActiveOrder(o) : o.status === id)).length;

  const act = async (order: Order, action: string, body: object, success: string) => {
    try {
      await orderAction(order.id, action, body);
      notify(success);
    } catch (e) {
      notify(errorMessage(e), 'error');
    }
  };

  // Retard : fin de créneau dépassée alors que la commande n'est pas livrée.
  const isLate = (o: Order) => isActiveOrder(o) && o.status !== 'awaiting_payment' && Date.now() > o.deliveryWindowEnd;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border ${filter === f.id ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
          >
            {f.label} ({count(f.id)})
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <p className="bg-white rounded-3xl p-10 text-center border border-gray-200 text-sm text-gray-500">Aucune commande dans cette vue.</p>
      ) : (
        <div className="space-y-3">
          {list.map((o) => (
            <article key={o.id} className={`bg-white rounded-3xl p-5 border shadow-sm space-y-3 ${isLate(o) ? 'border-red-300' : 'border-gray-200'}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-mono font-black text-sm text-gray-900">{o.orderNumber}</span>
                  <span className="text-gray-400">{formatDateTime(o.createdAt)}</span>
                  <span className="font-bold text-gray-700">{o.deliveryMode === 'delivery' ? `Livraison • ${o.customer.quartierGoma}` : 'Retrait magasin'}</span>
                  <span className="text-gray-500">{o.deliverySlotName}</span>
                  {isLate(o) && <span className="font-black text-red-700 bg-red-50 px-2 py-0.5 rounded-full">En retard</span>}
                </div>
                <span className={`text-xs font-black px-3 py-1 rounded-full ${STATUS_STYLES[o.status]}`}>{STATUS_LABELS[o.status]}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div>
                  <p className="font-black text-gray-900">{o.customer.name}</p>
                  <a href={`tel:${o.customer.phone}`} className="text-blue-600 font-bold inline-flex items-center gap-1">
                    <Phone className="w-3 h-3" />{o.customer.phone}
                  </a>
                  {o.customer.address && <p className="text-gray-600">{o.customer.address}</p>}
                </div>
                <div className="space-y-0.5">
                  <p className="font-black text-gray-900">
                    $ {o.totalUsd.toFixed(2)} <span className="font-bold text-gray-500">• {o.items.reduce((n, i) => n + i.quantity, 0)} article(s)</span>
                  </p>
                  {o.payments.map((p) => (
                    <p key={p.id} className="text-gray-600">
                      {PURPOSE_LABELS[p.purpose]} : $ {p.amountUsd.toFixed(2)} — <span className="font-bold">{PAYMENT_STATUS_LABELS[p.status]}</span>
                    </p>
                  ))}
                  {o.cancelReason && <p className="text-red-700">Motif : {o.cancelReason}</p>}
                </div>
                <div className="space-y-2">
                  {isActiveOrder(o) && o.status !== 'awaiting_payment' ? (
                    <>
                      <label className="flex items-center gap-2">
                        <span className="w-20 text-gray-500 font-bold">Préparateur</span>
                        <select
                          className="flex-1 px-2 py-1.5 border border-gray-300 rounded-lg bg-white font-bold"
                          value={preparers.find((s) => s.name === o.preparerName)?.email || ''}
                          disabled={o.status !== 'confirmed' && o.status !== 'preparing'}
                          onChange={(e) => act(o, 'assign', { kind: 'preparer', email: e.target.value }, 'Préparateur mis à jour.')}
                        >
                          <option value="">{o.preparerName && !preparers.some((s) => s.name === o.preparerName) ? o.preparerName : '— à prendre —'}</option>
                          {preparers.map((s) => (
                            <option key={s.email} value={s.email}>{s.name}</option>
                          ))}
                        </select>
                      </label>
                      {o.deliveryMode === 'delivery' && (
                        <label className="flex items-center gap-2">
                          <span className="w-20 text-gray-500 font-bold">Livreur</span>
                          <select
                            className="flex-1 px-2 py-1.5 border border-gray-300 rounded-lg bg-white font-bold"
                            value={drivers.find((s) => s.name === o.deliveryDriverName)?.email || ''}
                            onChange={(e) => act(o, 'assign', { kind: 'driver', email: e.target.value }, 'Livreur mis à jour.')}
                          >
                            <option value="">{o.deliveryDriverName && !drivers.some((s) => s.name === o.deliveryDriverName) ? o.deliveryDriverName : '— à prendre —'}</option>
                            {drivers.map((s) => (
                              <option key={s.email} value={s.email}>{s.name}</option>
                            ))}
                          </select>
                        </label>
                      )}
                    </>
                  ) : (
                    <p className="text-gray-600">
                      {o.preparerName && `Préparée par ${o.preparerName}. `}
                      {o.deliveryDriverName && `Livreur : ${o.deliveryDriverName}. `}
                      {o.deliveredAt && `Remise le ${formatDateTime(o.deliveredAt)}.`}
                    </p>
                  )}
                  {isActiveOrder(o) && (
                    <button
                      type="button"
                      onClick={() => {
                        const reason = prompt('Motif de l’annulation (visible par le client) :');
                        if (reason) act(o, 'cancel', { reason }, 'Commande annulée, stock remis en rayon.');
                      }}
                      className="text-red-600 font-bold hover:underline inline-flex items-center gap-1"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Annuler la commande
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
