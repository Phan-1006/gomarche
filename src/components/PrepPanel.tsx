import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, ClipboardList, Clock, Hand, KeyRound, Loader2, PackageCheck, Phone, Store, Truck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Order } from '../types';
import { errorMessage } from '../services/api';
import { STATUS_LABELS, STATUS_STYLES } from '../utils/orders';
import { EmptyState, StaffShell, TabButton } from './StaffShell';
import { HandoverDialog } from './HandoverDialog';

/** Espace des agents préparateurs : ils réclament une commande payée, la préparent, la déclarent prête. */
export const PrepPanel: React.FC = () => {
  const { currentUser, workOrders, orderAction, notify } = useApp();
  const [tab, setTab] = useState<'queue' | 'mine'>('queue');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [handover, setHandover] = useState<Order | null>(null);
  // Articles cochés pendant la préparation (aide-mémoire local à l'agent).
  const [picked, setPicked] = useState<Record<string, boolean>>({});

  const myId = currentUser?.id;
  const isAdmin = currentUser?.role === 'admin';
  const queue = workOrders.filter((o) => o.status === 'confirmed' && !o.preparerId);
  const mine = workOrders.filter(
    (o) => (isAdmin ? !!o.preparerId : o.preparerId === myId) && (o.status === 'preparing' || o.status === 'ready')
  );

  const knownQueue = useRef(queue.length);
  useEffect(() => {
    if (queue.length > knownQueue.current) {
      navigator.vibrate?.(200);
      notify('Nouvelle commande à préparer !');
    }
    knownQueue.current = queue.length;
  }, [queue.length, notify]);

  const run = async (order: Order, action: string, success: string) => {
    setBusyId(order.id);
    try {
      await orderAction(order.id, action);
      notify(success);
      if (action === 'claim-prep') setTab('mine');
    } catch (e) {
      notify(errorMessage(e), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const list = tab === 'queue' ? queue : mine;

  return (
    <StaffShell
      roles={['order_agent', 'admin']}
      title="Préparation des commandes"
      subtitle="Prenez une commande, préparez-la, déclarez-la prête"
      actions={
        <>
          <TabButton active={tab === 'queue'} onClick={() => setTab('queue')}>À prendre ({queue.length})</TabButton>
          <TabButton active={tab === 'mine'} onClick={() => setTab('mine')}>{isAdmin ? 'En cours' : 'Mes préparations'} ({mine.length})</TabButton>
        </>
      }
    >
      {list.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="w-10 h-10" />}
          title={tab === 'queue' ? 'Aucune commande en attente de préparation' : 'Aucune préparation en cours'}
          hint={tab === 'queue' ? 'Les commandes payées apparaissent ici automatiquement.' : undefined}
        />
      ) : (
        list.map((order) => {
          const busy = busyId === order.id;
          const allPicked = order.items.every((i) => picked[`${order.id}:${i.productId}`]);
          return (
            <article key={order.id} className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-gray-100">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono font-bold text-sm bg-gray-100 text-gray-800 px-3 py-1 rounded-xl">{order.orderNumber}</span>
                  <span className="text-xs font-bold text-gray-700 flex items-center gap-1">
                    {order.deliveryMode === 'delivery' ? <Truck className="w-3.5 h-3.5" /> : <Store className="w-3.5 h-3.5" />}
                    {order.deliveryMode === 'delivery' ? 'Livraison' : 'Retrait magasin'}
                  </span>
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> {order.deliverySlotName}
                  </span>
                </div>
                <span className={`text-xs font-black px-3 py-1 rounded-full ${STATUS_STYLES[order.status]}`}>{STATUS_LABELS[order.status]}</span>
              </div>

              <ul className="divide-y divide-gray-100">
                {order.items.map((item) => {
                  const key = `${order.id}:${item.productId}`;
                  return (
                    <li key={key}>
                      <label className="flex items-center gap-3 py-2 cursor-pointer">
                        {order.status === 'preparing' && (
                          <input type="checkbox" checked={!!picked[key]} onChange={(e) => setPicked((p) => ({ ...p, [key]: e.target.checked }))} className="w-5 h-5 accent-emerald-600 shrink-0" />
                        )}
                        <img src={item.image} alt="" className="w-11 h-11 rounded-xl object-contain bg-gray-50 border border-gray-200 shrink-0" />
                        <span className="min-w-0 flex-1">
                          <span className={`block text-sm font-bold truncate ${picked[key] ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{item.name}</span>
                          <span className="block text-[11px] text-gray-500">{item.brand} • {item.unit}</span>
                        </span>
                        <span className="text-base font-black text-gray-900 bg-gray-100 rounded-xl px-3 py-1 shrink-0">× {item.quantity}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>

              <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="text-gray-600">
                  <span className="font-bold text-gray-900">{order.customer.name}</span>
                  {order.preparerName && <span> • préparée par {order.preparerName}</span>}
                  {order.deliveryMode === 'delivery' && (
                    <span> • livreur : {order.deliveryDriverName || 'pas encore attribué'}</span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {order.status === 'confirmed' && (
                    <button type="button" disabled={busy} onClick={() => run(order, 'claim-prep', 'Commande prise en charge : elle est à vous.')} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl flex items-center gap-2 disabled:opacity-60">
                      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Hand className="w-4 h-4" />}
                      <span>Prendre cette commande</span>
                    </button>
                  )}
                  {order.status === 'preparing' && (
                    <button
                      type="button"
                      disabled={busy || !allPicked}
                      title={allPicked ? undefined : 'Cochez chaque article une fois dans le colis'}
                      onClick={() => run(order, 'ready', 'Commande prête.')}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl flex items-center gap-2 disabled:opacity-50"
                    >
                      <PackageCheck className="w-4 h-4" />
                      <span>{allPicked ? 'Colis prêt' : 'Cochez tous les articles'}</span>
                    </button>
                  )}
                  {order.status === 'ready' && order.deliveryMode === 'delivery' && (
                    <span className="font-bold text-violet-700 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> Prête — en attente du livreur
                    </span>
                  )}
                  {order.status === 'ready' && order.deliveryMode === 'drive' && (
                    <>
                      <a href={`tel:${order.customer.phone}`} className="px-4 py-2.5 border border-gray-300 text-gray-800 font-bold rounded-xl flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5" />
                        <span>Appeler le client</span>
                      </a>
                      <button type="button" onClick={() => setHandover(order)} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl flex items-center gap-2">
                        <KeyRound className="w-4 h-4" />
                        <span>Remettre au client (code)</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </article>
          );
        })
      )}

      {handover && <HandoverDialog order={handover} onClose={() => setHandover(null)} />}
    </StaffShell>
  );
};
