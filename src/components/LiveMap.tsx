import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LatLng } from '../types';
import { GOMA_BOUNDS } from '../data/mockData';

interface LiveMapProps {
  store: LatLng;
  destination?: LatLng;
  driver?: LatLng;
  // Si fourni, la carte devient un sélecteur : un appui place (ou déplace) le point de livraison.
  onPick?: (position: LatLng) => void;
  className?: string;
}

const pin = (emoji: string, color: string) =>
  L.divIcon({
    className: '',
    html: `<div style="width:36px;height:36px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center"><span style="transform:rotate(45deg);font-size:16px;line-height:1">${emoji}</span></div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
  });

const ICONS = {
  store: pin('🏬', '#111827'),
  destination: pin('🏠', '#E2001A'),
  driver: pin('🛵', '#2563EB'),
};

/** Carte réelle de Goma (OpenStreetMap) avec le magasin, le point de livraison et le livreur. */
export const LiveMap: React.FC<LiveMapProps> = ({ store, destination, driver, onPick, className }) => {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layers = useRef<{ store?: L.Marker; destination?: L.Marker; driver?: L.Marker; line?: L.Polyline }>({});
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;
  const fitted = useRef('');

  useEffect(() => {
    if (!container.current) return;
    const m = L.map(container.current, {
      center: [store.lat, store.lng],
      zoom: 14,
      minZoom: 11,
      maxBounds: [
        [GOMA_BOUNDS.minLat - 0.1, GOMA_BOUNDS.minLng - 0.1],
        [GOMA_BOUNDS.maxLat + 0.1, GOMA_BOUNDS.maxLng + 0.1],
      ],
    });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>',
    }).addTo(m);
    m.on('click', (e) => onPickRef.current?.({ lat: e.latlng.lat, lng: e.latlng.lng }));
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
      layers.current = {};
    };
    // La carte n'est créée qu'une fois ; les positions sont mises à jour par l'effet suivant.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const place = (key: 'store' | 'destination' | 'driver', pos: LatLng | undefined, title: string) => {
      const existing = layers.current[key];
      if (!pos) {
        existing?.remove();
        layers.current[key] = undefined;
      } else if (existing) {
        existing.setLatLng([pos.lat, pos.lng]);
      } else {
        layers.current[key] = L.marker([pos.lat, pos.lng], { icon: ICONS[key], title, zIndexOffset: key === 'driver' ? 1000 : 0 })
          .bindTooltip(title)
          .addTo(m);
      }
    };
    place('store', store, 'Magasin');
    place('destination', destination, 'Adresse de livraison');
    place('driver', driver, 'Livreur');

    layers.current.line?.remove();
    layers.current.line = undefined;
    const from = driver || store;
    if (destination && !onPick) {
      layers.current.line = L.polyline(
        [
          [from.lat, from.lng],
          [destination.lat, destination.lng],
        ],
        { color: '#2563EB', weight: 4, opacity: 0.7, dashArray: '8 10' }
      ).addTo(m);
    }

    // Recadrage uniquement quand l'ensemble des points change (pas à chaque mouvement du livreur),
    // pour ne pas arracher la carte des mains de l'utilisateur.
    const shape = `${!!destination}|${!!driver}`;
    if (fitted.current !== shape) {
      fitted.current = shape;
      const points: L.LatLngTuple[] = [store, destination, driver].filter((p): p is LatLng => !!p).map((p) => [p.lat, p.lng]);
      if (points.length > 1) m.fitBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 16 });
      else m.setView(points[0], 15);
    }
  }, [store, destination, driver, onPick]);

  return <div ref={container} className={className || 'h-72 w-full rounded-3xl overflow-hidden border border-gray-200 z-0'} />;
};

export default LiveMap;
