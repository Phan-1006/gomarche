import React, { Suspense, useEffect, useRef, useState } from 'react';
import {
  Truck,
  Phone,
  MapPin,
  Clock,
  CheckCircle2,
  Navigation,
  KeyRound,
  Hand,
  Banknote,
  MessageCircle,
  ExternalLink,
  Loader2,
  Radio,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Order } from '../types';
import { api, errorMessage } from '../services/api';
import { cashDue, directionsUrl, formatDateTime, isActiveOrder, STATUS_LABELS, STATUS_STYLES } from '../utils/orders';
import { EmptyState, StaffShell, TabButton } from './StaffShell';
import { OrderChat } from './OrderChat';
import { HandoverDialog } from './HandoverDialog';

const LiveMap = React.lazy(() => import('./LiveMap'));

type GpsState = 'off' | 'on' | 'denied' | 'unavailable';

/**
 * Partage la position réelle du téléphone du livreur tant qu'une course est en route.
 * Le navigateur ne transmet la position que lorsque cette page est ouverte à l'écran.
 */
function useLocationSharing(active: boolean): { state: GpsState; position?: { lat: number; lng: number } } {
  const [state, setState] = useState<GpsState>('off');
  const [position, setPosition] = useState<{ lat: number; lng: number }>();
  const lastSent = useRef(0);

  useEffect(() => {
    if (!active) return setState('off');
    if (!navigator.geolocation) return setState('unavailable');
    const watch = navigator.geolocation.watchPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setState('on');
        setPosition(p);
        // Un envoi toutes les 8 s suffit pour un suivi fluide sans vider la batterie ni le forfait.
        if (Date.now() - lastSent.current < 8000) return;
        lastSent.current = Date.now();
        api('POST', '/driver/location', { ...p, accuracy: pos.coords.accuracy }).catch(() => {});
      },
      (err) => setState(err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable'),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    );
    return () => navigator.geolocation.clearWatch(watch);
  }, [active]);

  return { state, position };
}

export const DeliveryDriverPanel: React.FC = () => {
  const { currentUser, workOrders, siteConfig, orderAction, formatPrice, notify } = useApp();
  const [tab, setTab] = useState<'available' | 'mine' | 'done'>('available');
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [handover, setHandover] = useState<Order | null>(null);

  const myId = currentUser?.id;
  const available = workOrders.filter((o) => !o.deliveryDriverId && isActiveOrder(o));
  const mine = workOrders.filter((o) => o.deliveryDriverId === myId && isActiveOrder(o));
  const done = workOrders.filter((o) => o.deliveryDriverId === myId && !isActiveOrder(o));
  const gps = useLocationSharing(mine.some((o) => o.status === 'in_delivery'));

  // Signale l'arrivée d'une nouvelle course à prendre.
  const knownAvailable = useRef(available.length);
  useEffect(() => {
    if (available.length > knownAvailable.current) {
      navigator.vibrate?.([200, 100, 200]);
      notify('Nouvelle course disponible !');
    }
    knownAvailable.current = available.length;
  }, [available.length, notify]);

  const run = async (order: Order, action: string, success?: string) => {
    setBusyId(order.id);
    try {
      await orderAction(order.id, action);
      if (success) notify(success);
      if (action === 'claim-delivery') setTab('mine');
    } catch (e) {
      notify(errorMessage(e), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const list = tab === 'available' ? available : tab === 'mine' ? mine : done;

  return (
    <StaffShell
      roles={['delivery_driver']}
      title="Espace Livreur"
      subtitle={currentUser?.phone || 'Ajoutez votre numéro dans votre profil'}
      actions={
        <>
          <TabButton active={tab === 'available'} onClick={() => setTab('available')}>À prendre ({available.length})</TabButton>
          <TabButton active={tab === 'mine'} onClick={() => setTab('mine')}>Mes courses ({mine.length})</TabButton>
          <TabButton active={tab === 'done'} onClick={() => setTab('done')}>Terminées ({done.length})</TabButton>
        </>
      }
    >
      {mine.some((o) => o.status === 'in_delivery') && (
        <div
          className={`rounded-2xl px-4 py-3 text-xs font-bold flex items-center gap-2 ${
            gps.state === 'on' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          <Radio className={`w-4 h-4 ${gps.state === 'on' ? 'animate-pulse' : ''}`} />
          {gps.state === 'on' && 'Votre position est partagée en direct avec le client. Gardez cette page ouverte pendant la course.'}
          {gps.state === 'off' && 'Activation du GPS...'}
          {gps.state === 'denied' && 'Localisation refusée : autorisez-la dans les réglages du navigateur pour que le client vous suive.'}
          {gps.state === 'unavailable' && 'Signal GPS indisponible pour le moment. Le client peut toujours vous appeler.'}
        </div>
      )}

      {list.length === 0 ? (
        <EmptyState
          icon={<Truck className="w-10 h-10" />}
          title={tab === 'available' ? 'Aucune course à prendre pour le moment' : tab === 'mine' ? 'Vous n’avez pas de course en cours' : 'Aucune course terminée'}
          hint={tab === 'available' ? 'Les nouvelles commandes apparaissent ici automatiquement. Le premier livreur qui la prend l’obtient.' : undefined}
        />
      ) : (
        list.map((order) => {
          const isMine = order.deliveryDriverId === myId;
          const cash = cashDue(order);
          const busy = busyId === order.id;
          const open = openOrderId === order.id;
          return (
            <article key={order.id} className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-gray-100">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono font-bold text-sm bg-gray-100 text-gray-800 px-3 py-1 rounded-xl">{order.orderNumber}</span>
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> {order.deliverySlotName}
                  </span>
                </div>
                <span className={`text-xs font-black px-3 py-1 rounded-full ${STATUS_STYLES[order.status]}`}>
                  {order.status === 'in_delivery' ? 'En route' : order.status === 'ready' ? 'Colis prêt au magasin' : STATUS_LABELS[order.status]}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1.5">
                  <p className="text-sm font-black text-gray-900">{order.customer.name}</p>
                  <div className="flex items-start gap-1.5 text-gray-600">
                    <MapPin className="w-4 h-4 text-red-500 shrink-0" />
                    <div>
                      {order.customer.address && <p className="font-semibold text-gray-900">{order.customer.address}</p>}
                      <p className="text-emerald-700 font-bold">Quartier {order.customer.quartierGoma}</p>
                      {order.customer.deliveryNotes && (
                        <p className="text-amber-800 bg-amber-50 p-2 rounded-xl mt-1">Repère : « {order.customer.deliveryNotes} »</p>
                      )}
                      {!isMine && <p className="text-gray-400 mt-1">Adresse et téléphone visibles après prise en charge.</p>}
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <p className="text-gray-600">
                    {order.items.reduce((n, i) => n + i.quantity, 0)} article(s) • commande de {formatPrice(order.totalUsd, 'USD')}
                  </p>
                  {cash ? (
                    <p className="font-black text-gray-900 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex items-center gap-2">
                      <Banknote className="w-4 h-4 text-amber-700" />
                      À encaisser : $ {cash.amountUsd.toFixed(2)} ou {cash.amountCdf.toLocaleString('fr-FR')} FC
                    </p>
                  ) : (
                    <p className="font-bold text-emerald-700">Déjà payée — rien à encaisser</p>
                  )}
                  {order.deliveredAt && <p className="text-gray-500">Livrée le {formatDateTime(order.deliveredAt)}</p>}
                </div>
              </div>

              {isActiveOrder(order) && (
                <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center gap-2">
                  {!isMine && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => run(order, 'claim-delivery', 'Course prise en charge : elle est à vous.')}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl flex items-center gap-2 disabled:opacity-60"
                    >
                      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Hand className="w-4 h-4" />}
                      <span>Prendre cette course</span>
                    </button>
                  )}

                  {isMine && (
                    <>
                      <a href={`tel:${order.customer.phone}`} className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5" />
                        <span>Appeler le client</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => setOpenOrderId(open ? null : order.id)}
                        className="px-4 py-2.5 bg-gray-900 hover:bg-black text-white font-bold text-xs rounded-xl flex items-center gap-1.5"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>{open ? 'Fermer' : 'Carte & messages'}</span>
                        {!open && !!order.unreadHint && <span className="bg-red-500 text-white rounded-full px-1.5 text-[10px]">{order.unreadHint}</span>}
                      </button>
                      {order.customer.coordinates && (
                        <a href={directionsUrl(order.customer.coordinates)} target="_blank" rel="noreferrer" className="px-4 py-2.5 border border-gray-300 text-gray-800 font-bold text-xs rounded-xl flex items-center gap-1.5">
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Itinéraire</span>
                        </a>
                      )}

                      {order.status === 'ready' && (
                        <button type="button" disabled={busy} onClick={() => run(order, 'depart', 'Bonne route ! Le client suit votre position.')} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl flex items-center gap-2 disabled:opacity-60">
                          <Navigation className="w-4 h-4" />
                          <span>J’ai le colis, je pars</span>
                        </button>
                      )}
                      {order.status === 'in_delivery' && (
                        <button
                          type="button"
                          onClick={() => setHandover(order)}
                          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl flex items-center gap-2"
                        >
                          <KeyRound className="w-4 h-4" />
                          <span>Remettre au client (code)</span>
                        </button>
                      )}
                      {order.status !== 'in_delivery' && (
                        <>
                          {order.status !== 'ready' && <span className="text-xs text-gray-500">Le magasin prépare le colis...</span>}
                          <button type="button" disabled={busy} onClick={() => run(order, 'release-delivery', 'Course libérée pour un autre livreur.')} className="ml-auto text-xs font-bold text-red-600 hover:underline">
                            Libérer la course
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>
              )}

              {open && isMine && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Suspense fallback={<div className="h-72 rounded-3xl bg-gray-100 animate-pulse" />}>
                    <LiveMap store={siteConfig.storeLocation} destination={order.customer.coordinates} driver={gps.position} />
                  </Suspense>
                  <OrderChat order={order} />
                  {!order.customer.coordinates && (
                    <p className="text-xs text-gray-500 lg:col-span-2">
                      Le client n’a pas placé son adresse sur la carte : utilisez l’adresse écrite, le repère, ou appelez-le.
                    </p>
                  )}
                </div>
              )}
            </article>
          );
        })
      )}

      {handover && <HandoverDialog order={handover} onClose={() => setHandover(null)} />}
    </StaffShell>
  );
};
