import React, { useEffect, useState } from 'react';
import { Bell, Loader2, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { enablePush, pushPermission } from '../services/push';
import { isActiveOrder } from '../utils/orders';

// Refus mémorisé : on ne repropose qu'après ce délai.
const DISMISS_KEY = 'gm_push_dismissed_at';
const DISMISS_DAYS = 14;

const recentlyDismissed = () => {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY) || 0);
    return at > 0 && Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
};

/**
 * Propose d'activer les notifications au moment où elles servent : un client qui a une commande
 * en cours, ou un employé à son poste. Jamais à un simple visiteur.
 */
export const NotificationPrompt: React.FC = () => {
  const { currentUser, siteConfig, orders, notify } = useApp();
  const publicKey = siteConfig.pushPublicKey;
  const [permission, setPermission] = useState(pushPermission);
  const [dismissed, setDismissed] = useState(recentlyDismissed);
  const [busy, setBusy] = useState(false);
  const userId = currentUser?.id;

  // Autorisation déjà donnée : l'appareil est (ré)associé au compte connecté, sans rien demander.
  useEffect(() => {
    if (!userId || !publicKey || pushPermission() !== 'granted') return;
    enablePush(publicKey, false).catch(() => {});
  }, [userId, publicKey]);

  if (!currentUser || !publicKey || permission !== 'default' || dismissed) return null;
  const isStaff = currentUser.role !== 'customer';
  if (!isStaff && !orders.some(isActiveOrder)) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* navigation privée : le refus ne vaut que pour cette visite */
    }
    setDismissed(true);
  };

  const enable = async () => {
    setBusy(true);
    try {
      const result = await enablePush(publicKey, true);
      setPermission(pushPermission());
      if (result === 'ok') notify('Notifications activées sur cet appareil.');
      else if (result === 'denied') notify('Notifications refusées. Vous pouvez les réautoriser dans les réglages du navigateur.', 'error');
      else notify('Notifications indisponibles sur cet appareil.', 'error');
    } catch {
      notify('Activation impossible pour le moment. Réessayez.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div role="status" className="bg-blue-50 border-b border-blue-200 text-blue-950 px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs">
        <p className="flex items-center gap-2 min-w-0">
          <Bell className="w-4 h-4 shrink-0" />
          <span>
            {isStaff
              ? 'Soyez prévenu des nouvelles commandes et des messages, même application fermée.'
              : 'Soyez prévenu de l’avancement de votre commande et des messages de votre livreur.'}
          </span>
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={enable}
            disabled={busy}
            className="px-3 py-1.5 rounded-full bg-blue-700 text-white font-bold flex items-center gap-1.5 disabled:opacity-60"
          >
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Activer
          </button>
          <button type="button" onClick={dismiss} aria-label="Plus tard" className="p-1 text-blue-700 hover:text-blue-950 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
