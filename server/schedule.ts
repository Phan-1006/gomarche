import type { DeliveryOption, SiteConfig } from '../src/types';

// Goma est à UTC+2 toute l'année (pas d'heure d'été).
const GOMA_OFFSET_MS = 2 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export const isHHMM = (v: unknown): v is string => typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
export const toMinutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const fromMinutes = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

// Horodatage UTC d'une heure murale de Goma pour un jour donné (index de jour depuis 1970).
const at = (dayIndex: number, minutes: number) => dayIndex * DAY_MS + minutes * 60_000 - GOMA_OFFSET_MS;

export interface ResolvedOption extends DeliveryOption {
  windowStart: number;
  windowEnd: number;
}

/**
 * Créneaux réellement commandables à l'instant `now`.
 * - jamais dans le passé : un créneau reste ouvert tant que préparation + livraison tiennent
 *   avant sa fin ;
 * - jamais hors des heures de service (pas de livraison de nuit) : après la dernière livraison,
 *   les premiers créneaux proposés sont ceux du lendemain ;
 * - le premier créneau planifié disponible est recommandé.
 */
export function deliveryOptions(config: SiteConfig, now = Date.now()): ResolvedOption[] {
  const hours = config.deliveryHours;
  const serviceStart = toMinutes(hours.start);
  const serviceEnd = toMinutes(hours.end);
  const gomaNow = now + GOMA_OFFSET_MS;
  const today = Math.floor(gomaNow / DAY_MS);
  const nowMinutes = Math.floor((gomaNow % DAY_MS) / 60_000);
  const options: ResolvedOption[] = [];
  const dateFmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });

  for (let d = 0; d <= hours.daysAhead; d++) {
    const dayIndex = today + d;
    const dayDate = new Date(dayIndex * DAY_MS);
    if (hours.closedWeekdays.includes(dayDate.getUTCDay())) continue;
    const date = dayDate.toISOString().slice(0, 10);
    const dayLabel = d === 0 ? "Aujourd'hui" : d === 1 ? 'Demain' : dateFmt.format(dayDate);

    for (const slot of config.deliverySlots) {
      if (!slot.active) continue;
      if (slot.isExpress) {
        // L'express n'existe que maintenant, pendant le service.
        if (d !== 0) continue;
        const eta = nowMinutes + hours.expressMinutes;
        if (nowMinutes < serviceStart || eta > serviceEnd) continue;
        options.push({
          key: `${date}|${slot.id}`,
          slotId: slot.id,
          date,
          dayLabel,
          label: slot.label,
          startTime: fromMinutes(nowMinutes),
          endTime: fromMinutes(eta),
          priceUsd: slot.priceUsd,
          isExpress: true,
          recommended: false,
          windowStart: now,
          windowEnd: now + hours.expressMinutes * 60_000,
        });
        continue;
      }
      const start = Math.max(toMinutes(slot.startTime), serviceStart);
      const end = Math.min(toMinutes(slot.endTime), serviceEnd);
      if (end <= start) continue;
      if (d === 0 && nowMinutes + hours.prepMinutes > end) continue;
      options.push({
        key: `${date}|${slot.id}`,
        slotId: slot.id,
        date,
        dayLabel,
        label: slot.label,
        startTime: fromMinutes(start),
        endTime: fromMinutes(end),
        priceUsd: slot.priceUsd,
        isExpress: false,
        recommended: false,
        windowStart: at(dayIndex, start),
        windowEnd: at(dayIndex, end),
      });
    }
  }

  options.sort((a, b) => a.windowStart - b.windowStart || Number(a.isExpress) - Number(b.isExpress));
  const recommended = options.find((o) => !o.isExpress) || options[0];
  if (recommended) recommended.recommended = true;
  return options;
}
