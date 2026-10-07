import React, { useState } from 'react';
import { Loader2, MailWarning } from 'lucide-react';
import { useApp } from '../context/AppContext';

/** Rappel affiché tant qu'un compte créé par mot de passe n'a pas confirmé son adresse e-mail. */
export const EmailVerifyBanner: React.FC = () => {
  const { currentUser, resendVerification, notify } = useApp();
  const [sending, setSending] = useState(false);

  if (!currentUser || currentUser.emailVerified !== false) return null;

  const resend = async () => {
    setSending(true);
    const res = await resendVerification();
    setSending(false);
    if (res.success) notify(`E-mail de confirmation envoyé à ${currentUser.email}.`);
    else notify(res.message || 'Envoi impossible.', 'error');
  };

  return (
    <div role="status" className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2">
      <div className="page-width mx-auto flex items-center justify-between gap-3 text-xs">
        <p className="flex items-center gap-2 min-w-0">
          <MailWarning className="w-4 h-4 shrink-0" />
          <span>
            Confirmez votre adresse : ouvrez le lien envoyé à <strong className="break-all">{currentUser.email}</strong>.
          </span>
        </p>
        <button
          type="button"
          onClick={resend}
          disabled={sending}
          className="shrink-0 px-3 py-1.5 rounded-full bg-amber-900 text-white font-bold flex items-center gap-1.5 disabled:opacity-60"
        >
          {sending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Renvoyer
        </button>
      </div>
    </div>
  );
};
