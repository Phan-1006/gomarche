import React, { useEffect, useMemo, useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

// Refus mémorisé : on ne repropose l'installation qu'après ce délai.
const DISMISS_KEY = 'gm_pwa_dismissed_at';
const DISMISS_DAYS = 14;

// L'application tourne déjà installée (écran d'accueil, fenêtre dédiée).
const isInstalled = () =>
  ['standalone', 'fullscreen', 'minimal-ui', 'window-controls-overlay'].some(
    (mode) => window.matchMedia?.(`(display-mode: ${mode})`).matches
  ) ||
  (navigator as any).standalone === true ||
  document.referrer.startsWith('android-app://');

// Safari sur iPhone/iPad sait installer, mais sans invite : il faut passer par « Partager ».
// Les navigateurs intégrés (Facebook, Instagram, WhatsApp…) et les autres navigateurs iOS ne le peuvent pas.
const isIosSafari = () => {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return ios && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|FBAN|FBAV|Instagram|Line|WhatsApp/.test(ua);
};

const recentlyDismissed = () => {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY) || 0);
    return at > 0 && Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
};

export const PwaInstallPrompt: React.FC = () => {
  const { deferredPrompt, setDeferredPrompt, siteConfig } = useApp();
  const [installed, setInstalled] = useState(isInstalled);
  const [dismissed, setDismissed] = useState(recentlyDismissed);
  const [showIosSteps, setShowIosSteps] = useState(false);
  const iosSafari = useMemo(isIosSafari, []);

  useEffect(() => {
    const onInstalled = () => setInstalled(true);
    const standalone = window.matchMedia?.('(display-mode: standalone)');
    const onModeChange = (e: MediaQueryListEvent) => e.matches && setInstalled(true);
    window.addEventListener('appinstalled', onInstalled);
    standalone?.addEventListener?.('change', onModeChange);
    return () => {
      window.removeEventListener('appinstalled', onInstalled);
      standalone?.removeEventListener?.('change', onModeChange);
    };
  }, []);

  // Proposée uniquement là où l'installation est réellement possible :
  // invite fournie par le navigateur, ou Safari sur iOS.
  if (installed || dismissed || (!deferredPrompt && !iosSafari)) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* navigation privée : le refus ne vaut que pour cette visite */
    }
    setDismissed(true);
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      setShowIosSteps((open) => !open);
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    // Une invite ne sert qu'une fois, quelle que soit la réponse.
    setDeferredPrompt(null);
    if (outcome === 'accepted') setInstalled(true);
    else dismiss();
  };

  return (
    <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white px-4 py-2.5 shadow-md border-b border-gray-700">
      <div className="page-width mx-auto flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          {siteConfig.pwaIconUrl || siteConfig.customLogoUrl ? (
            <img
              src={siteConfig.pwaIconUrl || siteConfig.customLogoUrl}
              alt="Icône App"
              className="w-8 h-8 rounded-lg object-contain bg-white/10 p-0.5 shrink-0 shadow-xs"
            />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-[#E2001A] flex items-center justify-center text-white font-black text-sm shrink-0 shadow-xs">
              G
            </div>
          )}
          <div>
            <p className="font-bold text-white leading-tight">
              Installez l'application <span translate="no" className="notranslate">{siteConfig.siteName}</span>
            </p>
            <p className="text-[0.6875rem] text-gray-300 hidden sm:block">
              Accès rapide depuis votre écran d'accueil, sans passer par le navigateur.
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
            <span>Installer</span>
          </button>

          <button
            type="button"
            onClick={dismiss}
            aria-label="Plus tard"
            className="p-1 text-gray-400 hover:text-white rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showIosSteps && (
        <p className="page-width mx-auto mt-2 text-[0.6875rem] text-gray-200 flex items-center gap-1.5 flex-wrap">
          Touchez <Share className="w-3.5 h-3.5 inline" aria-label="Partager" /> en bas de Safari, puis
          <strong>« Sur l'écran d'accueil »</strong>.
        </p>
      )}
    </div>
  );
};
