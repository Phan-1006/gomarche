import React, { useState, useEffect } from 'react';
import {
  Navigation,
  MapPin,
  Compass,
  Phone,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Bike,
  Store,
  Layers,
  Zap,
} from 'lucide-react';
import { Order } from '../types';

interface GomaDeliveryMapProps {
  order: Order;
  isDriverView?: boolean;
  onConfirmHandoverClick?: () => void;
}

export const GomaDeliveryMap: React.FC<GomaDeliveryMapProps> = ({
  order,
  isDriverView = false,
  onConfirmHandoverClick,
}) => {
  // Coordinates in Goma:
  // Hub Gomarché: Central Goma (near Rond-Point BDGL / Kanyamuhanga)
  // Quartiers:
  // - Les Volcans: close to center
  // - Himbi: west along Lac Kivu
  // - Katindo: central-west
  // - Kyeshero: further west
  // - Ndosho: west boundary
  // - Mabanga: north
  // - Birere: east near border

  const quartierLocations: Record<string, { x: number; y: number; name: string }> = {
    'Les Volcans': { x: 50, y: 55, name: 'Quartier Les Volcans' },
    Himbi: { x: 38, y: 65, name: 'Quartier Himbi (Bord du Lac)' },
    Katindo: { x: 42, y: 50, name: 'Quartier Katindo' },
    Kyeshero: { x: 28, y: 68, name: 'Quartier Kyeshero' },
    Ndosho: { x: 20, y: 52, name: 'Quartier Ndosho' },
    'Mabanga Nord': { x: 55, y: 35, name: 'Quartier Mabanga Nord' },
    'Mabanga Sud': { x: 52, y: 42, name: 'Quartier Mabanga Sud' },
    Birere: { x: 72, y: 52, name: 'Quartier Birere' },
    Majengo: { x: 65, y: 28, name: 'Quartier Majengo' },
    Mikeno: { x: 58, y: 48, name: 'Quartier Mikeno' },
    Bujovu: { x: 75, y: 32, name: 'Quartier Bujovu (Aéroport)' },
    Murara: { x: 60, y: 42, name: 'Quartier Murara' },
  };

  const clientQuartier = order.customer.quartierGoma || 'Himbi';
  const destCoords = quartierLocations[clientQuartier] || { x: 40, y: 62, name: clientQuartier };

  // Hub Gomarché location (Center Goma)
  const hubCoords = { x: 54, y: 48, name: 'Entrepôt Central Gomarché (Bd Kanyamuhanga)' };

  // Courier progression animation (0 = hub, 1 = at destination)
  const [courierProgress, setCourierProgress] = useState(
    order.status === 'delivered' ? 1 : order.status === 'in_delivery' ? 0.65 : 0.15
  );

  useEffect(() => {
    if (order.status === 'in_delivery') {
      const interval = setInterval(() => {
        setCourierProgress((prev) => (prev < 0.9 ? prev + 0.04 : 0.9));
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [order.status]);

  // Current courier position interpolated
  const courierX = hubCoords.x + (destCoords.x - hubCoords.x) * courierProgress;
  const courierY = hubCoords.y + (destCoords.y - hubCoords.y) * courierProgress;

  const estimatedMinutes = Math.max(
    3,
    Math.round((1 - courierProgress) * (order.deliverySlotName.includes('Express') ? 20 : 35))
  );

  const estimatedDistanceKm = Math.max(
    0.3,
    Number(((1 - courierProgress) * 4.2).toFixed(1))
  );

  return (
    <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm">
      {/* Map Header Status */}
      <div className="p-4 bg-gray-900 text-white flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/40">
            <Compass className="w-4 h-4 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-wide uppercase text-emerald-400">
                GPS Tracé Goma en Direct
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            </div>
            <p className="text-[11px] text-gray-300">
              Zone : Ville de Goma • Destination : {clientQuartier}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="bg-gray-800 px-3 py-1.5 rounded-xl border border-gray-700 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>ETA : ~{estimatedMinutes} min</span>
          </div>
          <div className="bg-gray-800 px-3 py-1.5 rounded-xl border border-gray-700 flex items-center gap-1.5">
            <Navigation className="w-3.5 h-3.5 text-blue-400" />
            <span>{estimatedDistanceKm} km</span>
          </div>
        </div>
      </div>

      {/* Interactive Map Visual Container (Stylized Goma Map) */}
      <div className="relative w-full h-72 sm:h-96 bg-[#1A222D] overflow-hidden select-none">
        {/* SVG Roads & Geographical layout of Goma */}
        <svg
          className="w-full h-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <defs>
            {/* Lac Kivu Water gradient */}
            <linearGradient id="lacKivuGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0B3C5D" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#062238" stopOpacity="0.95" />
            </linearGradient>

            {/* Glowing polyline */}
            <linearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#E2001A" />
              <stop offset="100%" stopColor="#10B981" />
            </linearGradient>
          </defs>

          {/* Lac Kivu (Bottom area of Goma city) */}
          <path
            d="M 0,78 Q 20,70 45,74 T 80,72 T 100,76 L 100,100 L 0,100 Z"
            fill="url(#lacKivuGrad)"
          />

          {/* Grid street patterns in Goma */}
          <line x1="10" y1="20" x2="90" y2="20" stroke="#2A384A" strokeWidth="0.4" strokeDasharray="1,2" />
          <line x1="10" y1="35" x2="90" y2="35" stroke="#2A384A" strokeWidth="0.4" strokeDasharray="1,2" />
          <line x1="10" y1="50" x2="90" y2="50" stroke="#2A384A" strokeWidth="0.4" strokeDasharray="1,2" />
          <line x1="10" y1="65" x2="90" y2="65" stroke="#2A384A" strokeWidth="0.4" strokeDasharray="1,2" />

          {/* Major Roads (Bd Kanyamuhanga, Route Sake, Route Rutshuru) */}
          {/* Bd Kanyamuhanga */}
          <path
            d="M 54,10 L 54,48 L 50,68"
            stroke="#475569"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          {/* Route Sake */}
          <path
            d="M 0,55 Q 25,58 54,48"
            stroke="#334155"
            strokeWidth="1.4"
          />
          {/* Route Gisenyi Border */}
          <path
            d="M 54,48 L 85,52"
            stroke="#334155"
            strokeWidth="1.2"
          />

          {/* Active Delivery Path */}
          <path
            d={`M ${hubCoords.x},${hubCoords.y} Q ${(hubCoords.x + destCoords.x) / 2},${(hubCoords.y + destCoords.y) / 2 - 4} ${destCoords.x},${destCoords.y}`}
            fill="none"
            stroke="url(#routeGrad)"
            strokeWidth="1.2"
            strokeDasharray="2,1"
          />

          {/* Water label */}
          <text
            x="50"
            y="90"
            fill="#38BDF8"
            fontSize="3.2"
            fontWeight="bold"
            letterSpacing="0.8"
            textAnchor="middle"
            opacity="0.6"
          >
            LAC KIVU (GOMA)
          </text>
        </svg>

        {/* Quartier Badges plotted on map */}
        <div className="absolute top-[35%] left-[52%] -translate-x-1/2 text-[9px] font-bold text-gray-400 bg-gray-900/60 px-1.5 py-0.5 rounded-xs pointer-events-none">
          Mabanga
        </div>
        <div className="absolute top-[52%] left-[40%] -translate-x-1/2 text-[9px] font-bold text-gray-400 bg-gray-900/60 px-1.5 py-0.5 rounded-xs pointer-events-none">
          Katindo
        </div>
        <div className="absolute top-[65%] left-[36%] -translate-x-1/2 text-[9px] font-bold text-gray-400 bg-gray-900/60 px-1.5 py-0.5 rounded-xs pointer-events-none">
          Himbi
        </div>
        <div className="absolute top-[68%] left-[26%] -translate-x-1/2 text-[9px] font-bold text-gray-400 bg-gray-900/60 px-1.5 py-0.5 rounded-xs pointer-events-none">
          Kyeshero
        </div>
        <div className="absolute top-[55%] left-[50%] -translate-x-1/2 text-[9px] font-bold text-gray-400 bg-gray-900/60 px-1.5 py-0.5 rounded-xs pointer-events-none">
          Les Volcans
        </div>
        <div className="absolute top-[52%] left-[72%] -translate-x-1/2 text-[9px] font-bold text-gray-400 bg-gray-900/60 px-1.5 py-0.5 rounded-xs pointer-events-none">
          Birere
        </div>

        {/* 1. Hub Gomarché Marker */}
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10"
          style={{ left: `${hubCoords.x}%`, top: `${hubCoords.y}%` }}
        >
          <div className="w-8 h-8 rounded-xl bg-[#E2001A] text-white flex items-center justify-center shadow-lg border-2 border-white">
            <Store className="w-4 h-4" />
          </div>
          <span className="mt-1 px-1.5 py-0.5 bg-gray-900/90 text-[9px] font-black text-white rounded-md whitespace-nowrap shadow-xs">
            Hub Gomarché Goma
          </span>
        </div>

        {/* 2. Client Destination Marker */}
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10"
          style={{ left: `${destCoords.x}%`, top: `${destCoords.y}%` }}
        >
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg border-2 border-white animate-bounce">
              <MapPin className="w-4 h-4" />
            </div>
            <div className="absolute -inset-1 rounded-full bg-blue-400 animate-ping opacity-30" />
          </div>
          <span className="mt-1 px-1.5 py-0.5 bg-blue-900/90 text-[9px] font-black text-white rounded-md whitespace-nowrap shadow-xs">
            Client : {clientQuartier}
          </span>
        </div>

        {/* 3. Live Courier Marker (Moving) */}
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-20 transition-all duration-1000 ease-out"
          style={{ left: `${courierX}%`, top: `${courierY}%` }}
        >
          <div className="relative">
            <div className="w-9 h-9 rounded-full bg-emerald-500 text-gray-950 flex items-center justify-center shadow-2xl border-2 border-white">
              <Bike className="w-5 h-5 text-gray-950" />
            </div>
            <div className="absolute -inset-2 rounded-full bg-emerald-400 animate-ping opacity-40" />
          </div>
          <span className="mt-1 px-2 py-0.5 bg-emerald-950/90 border border-emerald-400 text-[9px] font-black text-emerald-300 rounded-md whitespace-nowrap shadow-md">
            🛵 Coursier Express en route
          </span>
        </div>
      </div>

      {/* Map Bottom Footer Details */}
      <div className="p-4 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-gray-700 font-bold">
            <MapPin className="w-4 h-4 text-[#E2001A]" />
            <span>Adresse : {order.customer.address}, {clientQuartier}, Goma</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {order.deliveryDriverPhone && (
            <a
              href={`tel:${order.deliveryDriverPhone}`}
              className="px-3.5 py-2 rounded-xl bg-white border border-gray-300 hover:bg-gray-100 text-gray-800 font-bold flex items-center gap-1.5 transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-emerald-600" />
              <span>Appeler le coursier</span>
            </a>
          )}

          {isDriverView && onConfirmHandoverClick && order.status !== 'delivered' && (
            <button
              type="button"
              onClick={onConfirmHandoverClick}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 shadow-md transition-all active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Saisir le Code Client pour valider</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
