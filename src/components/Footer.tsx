import React from 'react';
import {
  Truck,
  ShieldCheck,
  RotateCcw,
  Headphones,
  MapPin,
  Mail,
  Phone,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { scrollToResults } from '../utils/scroll';
import { TermsLink } from './TermsLink';
import { AirtelMoneyLogo, OrangeMoneyLogo, MpesaLogo, AfriMoneyLogo } from './MobileMoneyLogos';

export const Footer: React.FC = () => {
  const { siteConfig, setActiveView, setSelectedCategoryFilter, categories } = useApp();

  return (
    <footer className="bg-[#161A1D] text-white border-t border-gray-800">
      {/* Value Proposition Banner (Goma Exclusive) */}
      <div className="border-b border-gray-800 bg-[#121517] py-8">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6 text-center md:text-left">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-red-600/10 text-[#E2001A] flex items-center justify-center shrink-0 border border-red-600/20">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-black text-sm text-white">Livraison Express Goma</h4>
              <p className="text-xs text-gray-400 mt-0.5">
                À domicile ou au bureau dans tous les quartiers de Goma avec GPS
              </p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center md:items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-600/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-black text-sm text-white">Validation Sécurisée par Code</h4>
              <p className="text-xs text-gray-400 mt-0.5">
                Reçu numérique avec code secret remis au livreur
              </p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center md:items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-600/10 text-amber-400 flex items-center justify-center shrink-0 border border-amber-600/20">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-black text-sm text-white">Annulation simple</h4>
              <p className="text-xs text-gray-400 mt-0.5">
                Gratuite tant que la préparation n’a pas commencé
              </p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center md:items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/10 text-blue-400 flex items-center justify-center shrink-0 border border-blue-600/20">
              <Headphones className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-black text-sm text-white">Service Client Goma</h4>
              <p className="text-xs text-gray-400 mt-0.5">
                {siteConfig.storeOpeningHours}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Columns */}
      <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 text-xs">
        {/* Brand column */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-3">
            {siteConfig.customLogoUrl ? (
              <img
                src={siteConfig.customLogoUrl}
                alt={siteConfig.siteName}
                className="h-12 max-w-[180px] object-contain rounded-xl bg-white/95 p-1.5 shadow-sm"
              />
            ) : (
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-2xl shadow-md shrink-0"
                style={{ backgroundColor: siteConfig.primaryColor || '#E2001A' }}
              >
                G
              </div>
            )}
            <div>
              <span translate="no" className="notranslate text-2xl font-black text-white">Gomarché Goma</span>
              <span className="text-[10px] uppercase font-bold text-gray-400 block -mt-1">
                Le Supermarché en Ligne à Goma
              </span>
            </div>
          </div>

          <p className="text-gray-400 leading-relaxed max-w-sm">
            <span translate="no" className="notranslate text-white font-semibold">Gomarché</span> est le service de supermarché en ligne exclusif à la ville de Goma (Nord-Kivu). Commandez vos produits d'épicerie, frais du terroir et produits ménagers avec paiement Mobile Money instantané et livraison géolocalisée.
          </p>

          <div className="space-y-1.5 text-gray-300">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#E2001A]" />
              <span>{siteConfig.storeAddress}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-emerald-400" />
              <span>{siteConfig.storePhone}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-blue-400" />
              <span>{siteConfig.storeEmail}</span>
            </div>
          </div>
        </div>

        {/* Rayons */}
        <div className="space-y-3">
          <h4 className="font-black text-sm uppercase tracking-wider text-white">
            Rayons Goma
          </h4>
          <ul className="space-y-2 text-gray-400">
            {categories.slice(0, 5).map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategoryFilter(c.id);
                    setActiveView('home');
                    // Même rayon déjà sélectionné : rien ne change à l'écran, on y ramène quand même.
                    scrollToResults();
                  }}
                  className="hover:text-white transition-colors"
                >
                  {c.name}
                </button>
              </li>
            ))}
            <li>
              <button
                type="button"
                onClick={() => {
                  setActiveView('promotions');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="text-red-400 hover:text-red-300 font-bold"
              >
                🔥 Offres & Bons Plans Goma
              </button>
            </li>
          </ul>
        </div>

        {/* Services & Avantages */}
        <div className="space-y-3">
          <h4 className="font-black text-sm uppercase tracking-wider text-white">
            Services & Garanties
          </h4>
          <ul className="space-y-2 text-gray-400">
            <li>Livraison Express (Moins de 45 min)</li>
            <li>Tracé de livraison GPS en direct</li>
            <li>Code secret de confirmation client</li>
            <li>Annulation avant préparation</li>
            <li>Drive Retrait Bd Kanyamuhanga</li>
            <li>Application PWA Mobile Goma</li>
          </ul>
        </div>

        {/* Moyens de Paiement */}
        <div className="space-y-3">
          <h4 className="font-black text-sm uppercase tracking-wider text-white">
            Paiements Acceptés
          </h4>
          <p className="text-gray-400 text-xs">
            Réglez vos courses en direct en USD ($) ou CDF (FC) par :
          </p>
          <div className="flex flex-col gap-2">
            <AirtelMoneyLogo size="sm" customLogoUrl={siteConfig.paymentGateways?.airtel?.customLogoUrl} />
            <OrangeMoneyLogo size="sm" customLogoUrl={siteConfig.paymentGateways?.orange?.customLogoUrl} />
            <MpesaLogo size="sm" customLogoUrl={siteConfig.paymentGateways?.mpesa?.customLogoUrl} />
            <AfriMoneyLogo size="sm" customLogoUrl={siteConfig.paymentGateways?.afrimoney?.customLogoUrl} />
          </div>
        </div>
      </div>

      {/* Bottom Legal */}
      <div className="border-t border-gray-800 bg-[#0E1012] py-4 text-xs text-gray-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>
            © 2026 <span translate="no" className="notranslate">Gomarché</span> Goma • Tous droits réservés •{' '}
            <TermsLink className="underline hover:text-white">Conditions d’utilisation</TermsLink>
          </p>
          <p className="text-gray-500">Service exclusif Ville de Goma, République Démocratique du Congo.</p>
        </div>
      </div>
    </footer>
  );
};
