import React, { Suspense, useEffect, useState } from 'react';
import { AlertCircle, Clock, Loader2, MapPin, Plus, Save, Trash2, Zap } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { DeliveryHoursConfig, DeliveryOption, DeliverySlotConfig, LatLng } from '../../types';
import { api } from '../../services/api';

const LiveMap = React.lazy(() => import('../LiveMap'));

const WEEKDAYS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const inputClass = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-hidden focus:border-[#E2001A]';

/** Heures de service, créneaux de livraison et position du magasin. */
export const ScheduleTab: React.FC = () => {
  const { siteConfig, saveSiteConfig, notify } = useApp();
  const [hours, setHours] = useState<DeliveryHoursConfig>(siteConfig.deliveryHours);
  const [slots, setSlots] = useState<DeliverySlotConfig[]>(siteConfig.deliverySlots);
  const [freeThreshold, setFreeThreshold] = useState(siteConfig.freeDeliveryThresholdUsd);
  const [maxPerDriver, setMaxPerDriver] = useState(siteConfig.maxActiveDeliveriesPerDriver);
  const [storeLocation, setStoreLocation] = useState<LatLng>(siteConfig.storeLocation);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<DeliveryOption[]>([]);

  const loadPreview = () =>
    api<{ options: DeliveryOption[] }>('GET', '/delivery-options')
      .then((d) => setPreview(d.options))
      .catch(() => {});
  useEffect(() => {
    loadPreview();
  }, []);

  const setSlot = (id: string, patch: Partial<DeliverySlotConfig>) => setSlots((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const save = async () => {
    setError('');
    setBusy(true);
    const res = await saveSiteConfig({
      deliveryHours: hours,
      deliverySlots: slots,
      freeDeliveryThresholdUsd: freeThreshold,
      maxActiveDeliveriesPerDriver: maxPerDriver,
      storeLocation,
    });
    setBusy(false);
    if (!res.success) return setError(res.message || 'Enregistrement impossible.');
    notify('Horaires de livraison enregistrés.');
    loadPreview();
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm space-y-5">
        <div>
          <h3 className="text-lg font-black text-gray-900">Heures de service</h3>
          <p className="text-xs text-gray-500">
            Aucune livraison n’est proposée en dehors de ces heures. Une commande passée après la dernière livraison est planifiée le prochain jour ouvert.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label htmlFor="sh-start" className="block text-xs font-bold text-gray-700 mb-1">Première livraison</label>
            <input id="sh-start" type="time" className={inputClass} value={hours.start} onChange={(e) => setHours({ ...hours, start: e.target.value })} />
          </div>
          <div>
            <label htmlFor="sh-end" className="block text-xs font-bold text-gray-700 mb-1">Dernière livraison</label>
            <input id="sh-end" type="time" className={inputClass} value={hours.end} onChange={(e) => setHours({ ...hours, end: e.target.value })} />
          </div>
          <div>
            <label htmlFor="sh-prep" className="block text-xs font-bold text-gray-700 mb-1">Préparation (min)</label>
            <input id="sh-prep" type="number" min={0} max={600} className={inputClass} value={hours.prepMinutes} onChange={(e) => setHours({ ...hours, prepMinutes: Number(e.target.value) })} />
          </div>
          <div>
            <label htmlFor="sh-express" className="block text-xs font-bold text-gray-700 mb-1">Délai express (min)</label>
            <input id="sh-express" type="number" min={10} max={240} className={inputClass} value={hours.expressMinutes} onChange={(e) => setHours({ ...hours, expressMinutes: Number(e.target.value) })} />
          </div>
          <div>
            <label htmlFor="sh-days" className="block text-xs font-bold text-gray-700 mb-1">Jours à l’avance</label>
            <input id="sh-days" type="number" min={0} max={14} className={inputClass} value={hours.daysAhead} onChange={(e) => setHours({ ...hours, daysAhead: Number(e.target.value) })} />
          </div>
        </div>
        <p className="text-[0.6875rem] text-gray-500">
          « Préparation » : temps minimal entre la commande et la fin du créneau. Avec 45 min, le créneau 12h00–14h30 reste commandable jusqu’à 13h45.
        </p>

        <div>
          <span className="block text-xs font-bold text-gray-700 mb-1.5">Jours sans livraison</span>
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map((day, i) => {
              const closed = hours.closedWeekdays.includes(i);
              return (
                <button
                  key={day}
                  type="button"
                  aria-pressed={closed}
                  onClick={() => setHours({ ...hours, closedWeekdays: closed ? hours.closedWeekdays.filter((d) => d !== i) : [...hours.closedWeekdays, i] })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${closed ? 'bg-red-600 border-red-600 text-white' : 'bg-white border-gray-300 text-gray-700'}`}
                >
                  {day} {closed ? '• fermé' : ''}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-gray-900">Créneaux proposés au client</h3>
            <p className="text-xs text-gray-500">Le premier créneau encore possible est recommandé automatiquement ; le client peut en choisir un autre, jamais dans le passé.</p>
          </div>
          <button
            type="button"
            onClick={() => setSlots([...slots, { id: `slot-${Date.now()}`, label: 'Nouveau créneau', startTime: hours.start, endTime: hours.end, priceUsd: 2, active: true }])}
            className="px-4 py-2.5 rounded-xl bg-gray-900 text-white font-bold text-xs flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Ajouter un créneau</span>
          </button>
        </div>

        <div className="space-y-3">
          {slots.map((slot) => (
            <div key={slot.id} className={`grid grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_auto_auto] gap-3 items-end p-4 rounded-2xl border ${slot.active ? 'border-gray-200 bg-white' : 'border-gray-200 bg-gray-50 opacity-70'}`}>
              <div className="col-span-2 lg:col-span-1">
                <label className="block text-[0.6875rem] font-bold text-gray-600 mb-1">
                  {slot.isExpress ? (
                    <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-red-600" /> Express (pendant les heures de service)</span>
                  ) : (
                    'Nom du créneau'
                  )}
                </label>
                <input aria-label="Nom du créneau" className={inputClass} value={slot.label} onChange={(e) => setSlot(slot.id, { label: e.target.value })} />
              </div>
              {slot.isExpress ? (
                <p className="col-span-2 text-xs text-gray-500 pb-2">Livré en ~{hours.expressMinutes} min, tant que l’arrivée reste avant {hours.end.replace(':', 'h')}.</p>
              ) : (
                <>
                  <div>
                    <label className="block text-[0.6875rem] font-bold text-gray-600 mb-1">Début</label>
                    <input aria-label="Heure de début" type="time" className={inputClass} value={slot.startTime} onChange={(e) => setSlot(slot.id, { startTime: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-[0.6875rem] font-bold text-gray-600 mb-1">Fin</label>
                    <input aria-label="Heure de fin" type="time" className={inputClass} value={slot.endTime} onChange={(e) => setSlot(slot.id, { endTime: e.target.value })} />
                  </div>
                </>
              )}
              <div>
                <label className="block text-[0.6875rem] font-bold text-gray-600 mb-1">Frais ($)</label>
                <input aria-label="Frais de livraison en dollars" type="number" min={0} step={0.5} className={inputClass} value={slot.priceUsd} onChange={(e) => setSlot(slot.id, { priceUsd: Number(e.target.value) })} />
              </div>
              <label className="flex items-center gap-2 text-xs font-bold text-gray-700 pb-2.5 cursor-pointer">
                <input type="checkbox" checked={slot.active} onChange={(e) => setSlot(slot.id, { active: e.target.checked })} className="w-4 h-4 accent-emerald-600" />
                Actif
              </label>
              <button type="button" aria-label={`Supprimer ${slot.label}`} onClick={() => setSlots(slots.filter((s) => s.id !== slot.id))} className="p-2 text-red-500 hover:bg-red-50 rounded-xl mb-0.5 justify-self-start">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div>
            <label htmlFor="sh-free" className="block text-xs font-bold text-gray-700 mb-1">Livraison offerte à partir de ($)</label>
            <input id="sh-free" type="number" min={0} className={inputClass} value={freeThreshold} onChange={(e) => setFreeThreshold(Number(e.target.value))} />
          </div>
          <div>
            <label htmlFor="sh-max" className="block text-xs font-bold text-gray-700 mb-1">Courses simultanées max. par livreur</label>
            <input id="sh-max" type="number" min={1} max={20} className={inputClass} value={maxPerDriver} onChange={(e) => setMaxPerDriver(Number(e.target.value))} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm space-y-3">
        <div>
          <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-[#E2001A]" /> Position du magasin
          </h3>
          <p className="text-xs text-gray-500">Touchez la carte à l’emplacement exact du magasin : c’est le point de départ affiché aux clients et aux livreurs.</p>
        </div>
        <Suspense fallback={<div className="h-72 rounded-3xl bg-gray-100 animate-pulse" />}>
          <LiveMap store={storeLocation} onPick={setStoreLocation} />
        </Suspense>
      </div>

      {error && (
        <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700 font-bold">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4 bg-white rounded-3xl p-5 border border-gray-200">
        <div className="text-xs text-gray-600 min-w-0">
          <span className="font-black text-gray-900 flex items-center gap-1.5 mb-1">
            <Clock className="w-4 h-4" /> Ce qu’un client voit en ce moment (configuration enregistrée)
          </span>
          {preview.length === 0
            ? 'Aucun créneau ouvert.'
            : preview.slice(0, 4).map((o) => `${o.dayLabel} ${o.label} ${o.startTime}–${o.endTime}${o.recommended ? ' ★' : ''}`).join('  •  ')}
        </div>
        <button type="button" onClick={save} disabled={busy} className="px-6 py-3 rounded-2xl bg-[#E2001A] hover:bg-red-700 text-white font-black text-sm flex items-center gap-2 disabled:opacity-60">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>Enregistrer les horaires</span>
        </button>
      </div>
    </div>
  );
};
