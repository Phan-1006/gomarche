import React, { useState } from 'react';
import { Download, X, Smartphone, Check } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const PwaInstallPrompt: React.FC = () => {
  const { deferredPrompt, siteConfig } = useApp();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDismissed(true);
      }
    } else {
      alert(
        "Application Gomarché PWA :\n\n• Sur Android / Chrome : Cliquez sur le menu (3 points en haut à droite) puis 'Installer l'application'.\n• Sur iPhone / Safari : Cliquez sur le bouton de Partage puis 'Sur l'écran d'accueil'."
      );
    }
  };

  return (
    <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white px-4 py-2.5 shadow-md border-b border-gray-700">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#E2001A] flex items-center justify-center text-white font-black text-sm shrink-0 shadow-xs">
            G
          </div>
          <div>
            <p className="font-bold text-white leading-tight">
              Installez l'application Gomarché sur votre téléphone (PWA)
            </p>
            <p className="text-[11px] text-gray-300 hidden sm:block">
              Accès ultra-rapide sans téléchargement lourd, notifications des promos et suivi livreur.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleInstallClick}
            className="px-3.5 py-1.5 rounded-full text-xs font-bold text-white shadow-sm flex items-center gap-1.5 transition-transform transform active:scale-95"
            style={{ backgroundColor: siteConfig.primaryColor || '#E2001A' }}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Installer l'App</span>
          </button>

          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="p-1 text-gray-400 hover:text-white rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
