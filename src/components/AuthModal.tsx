import React, { useEffect, useState } from 'react';
import { X, Mail, Lock, User as UserIcon, AlertCircle, Loader2, ShieldCheck, MailCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useBotGuard } from './BotGuard';
import { TermsLink } from './TermsLink';

const GoogleIcon = () => (
  <span aria-hidden="true" className="w-5 h-5 rounded-full bg-white border border-gray-300 text-[13px] font-black text-[#4285F4] flex items-center justify-center">
    G
  </span>
);

export const AuthModal: React.FC = () => {
  const { isAuthOpen, setIsAuthOpen, login, register, loginWithGoogle, requestPasswordReset, resetPassword, resetToken, setResetToken, notify, siteConfig } = useApp();
  // 'forgot' : demande du lien par e-mail ; 'reset' : choix du nouveau mot de passe depuis ce lien.
  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'reset'>('login');
  const [forgotSent, setForgotSent] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<'form' | 'google' | null>(null);
  const bot = useBotGuard();

  useEffect(() => {
    if (isAuthOpen) {
      setError('');
      setPassword('');
      setForgotSent(false);
      setMode(resetToken ? 'reset' : 'login');
    }
  }, [isAuthOpen, resetToken]);

  const close = () => {
    setResetToken(null);
    setIsAuthOpen(false);
  };

  if (!isAuthOpen) return null;

  const finish = (res: { success: boolean; message?: string }) => {
    setBusy(null);
    if (res.success) setIsAuthOpen(false);
    else {
      setError(res.message || 'Connexion impossible.');
      bot.reset();
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy('form');
    if (mode === 'forgot') {
      const res = await requestPasswordReset(email, bot.fields);
      setBusy(null);
      if (res.success) setForgotSent(true);
      else {
        setError(res.message || 'Envoi impossible.');
        bot.reset();
      }
      return;
    }
    if (mode === 'reset') {
      const res = await resetPassword(resetToken || '', password);
      if (res.success) notify('Mot de passe modifié. Vous êtes connecté.');
      return finish(res);
    }
    if (mode === 'login') return finish(await login(email, password, bot.fields));
    const res = await register(name, email, password, { ...bot.fields, acceptTerms });
    if (res.success) notify('Compte créé. Un e-mail de confirmation vient de vous être envoyé.');
    finish(res);
  };

  const switchMode = (next: typeof mode) => {
    setMode(next);
    setError('');
    setForgotSent(false);
    if (next !== 'reset') setResetToken(null);
  };

  const withAccount = mode === 'login' || mode === 'register';
  const title = { login: 'Connexion à ', register: 'Créer un compte ', forgot: 'Mot de passe oublié', reset: 'Nouveau mot de passe' }[mode];
  const subtitle = {
    login: 'Heureux de vous revoir.',
    register: 'Quelques secondes suffisent pour commander.',
    forgot: 'Indiquez votre adresse : nous vous envoyons un lien pour choisir un nouveau mot de passe.',
    reset: 'Choisissez un nouveau mot de passe pour votre compte.',
  }[mode];
  const submitLabel = { login: 'Se connecter', register: 'Créer mon compte', forgot: 'Envoyer le lien', reset: 'Enregistrer le mot de passe' }[mode];

  const google = async () => {
    setError('');
    setBusy('google');
    finish(await loginWithGoogle());
  };

  const inputClass = 'w-full pl-10 pr-3.5 py-3 rounded-xl border border-gray-300 text-sm focus:outline-hidden focus:border-[#E2001A]';

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div role="dialog" aria-modal="true" aria-label="Connexion" className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-5 relative">
        <button type="button" aria-label="Fermer" onClick={close} className="absolute top-4 right-4 p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100">
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-1">
          <h2 className="text-xl font-black text-gray-900">
            {title}
            {withAccount && <span translate="no" className="notranslate">{siteConfig.siteName}</span>}
          </h2>
          <p className="text-xs text-gray-500">{subtitle}</p>
        </div>

        {mode === 'forgot' && forgotSent ? (
          <div className="space-y-4">
            <div role="status" className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 text-sm text-emerald-900">
              <MailCheck className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />
              <span>
                Si un compte existe pour <strong className="break-all">{email}</strong>, un e-mail vient de partir. Ouvrez-le et suivez le lien
                (valable 1 heure). Pensez à regarder dans les courriers indésirables.
              </span>
            </div>
            <button type="button" onClick={() => switchMode('login')} className="w-full py-3 rounded-xl border-2 border-gray-200 text-sm font-bold text-gray-800 hover:bg-gray-50">
              Retour à la connexion
            </button>
          </div>
        ) : (
        <>
        {withAccount && (
        <>
        <button
          type="button"
          onClick={google}
          disabled={!!busy}
          className="w-full py-3 rounded-xl border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-sm font-bold text-gray-800 flex items-center justify-center gap-3 disabled:opacity-60"
        >
          {busy === 'google' ? <Loader2 className="w-5 h-5 animate-spin" /> : <GoogleIcon />}
          <span>Continuer avec Google</span>
        </button>

        <div className="flex items-center gap-3 text-[11px] text-gray-400 font-bold uppercase">
          <span className="flex-1 h-px bg-gray-200" />
          ou par e-mail
          <span className="flex-1 h-px bg-gray-200" />
        </div>
        </>
        )}

        <form onSubmit={submit} className="space-y-3">
          {mode === 'register' && (
            <div className="relative">
              <UserIcon className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input type="text" required minLength={2} maxLength={80} autoComplete="name" aria-label="Nom complet" placeholder="Nom complet" className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          )}
          {mode !== 'reset' && (
          <div className="relative">
            <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input type="email" required autoComplete="email" aria-label="Adresse e-mail" placeholder="Adresse e-mail" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          )}
          {mode !== 'forgot' && (
          <div className="relative">
            <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              required
              minLength={mode === 'login' ? 1 : 8}
              maxLength={200}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              autoFocus={mode === 'reset'}
              aria-label={mode === 'reset' ? 'Nouveau mot de passe' : 'Mot de passe'}
              placeholder={mode === 'login' ? 'Mot de passe' : mode === 'reset' ? 'Nouveau mot de passe (8 caractères minimum)' : 'Mot de passe (8 caractères minimum)'}
              className={inputClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          )}

          {mode === 'login' && (
            <div className="text-right -mt-1">
              <button type="button" onClick={() => switchMode('forgot')} className="text-xs font-bold text-gray-600 hover:text-[#E2001A] hover:underline">
                Mot de passe oublié ?
              </button>
            </div>
          )}

          {mode === 'register' && (
            <label className="flex items-start gap-2.5 text-xs text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                required
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 shrink-0 accent-[#E2001A]"
              />
              <span>
                J’ai lu et j’accepte les règles et conditions d’utilisation. <TermsLink>En savoir plus</TermsLink>
              </span>
            </label>
          )}

          {bot.element}

          {error && (
            <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-700 font-bold">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={!!busy || bot.pending || (mode === 'register' && !acceptTerms)}
            className="w-full py-3 rounded-xl text-white font-black text-sm flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ backgroundColor: siteConfig.primaryColor || '#E2001A' }}
          >
            {busy === 'form' && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{submitLabel}</span>
          </button>
        </form>

        {withAccount ? (
          <p className="text-xs text-center text-gray-600">
            {mode === 'login' ? 'Pas encore de compte ?' : 'Déjà un compte ?'}{' '}
            <button type="button" onClick={() => switchMode(mode === 'login' ? 'register' : 'login')} className="font-bold text-[#E2001A] hover:underline">
              {mode === 'login' ? 'Créer un compte' : 'Se connecter'}
            </button>
          </p>
        ) : (
          <p className="text-xs text-center">
            <button type="button" onClick={() => switchMode('login')} className="font-bold text-[#E2001A] hover:underline">
              Retour à la connexion
            </button>
          </p>
        )}
        </>
        )}

        {withAccount && (
          <p className="text-[11px] text-center text-gray-500">
            En continuant avec Google, vous acceptez les règles et conditions d’utilisation. <TermsLink>En savoir plus</TermsLink>
          </p>
        )}

        {withAccount && (
        <p className="text-[11px] text-gray-500 bg-gray-50 rounded-xl p-3 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            Employé ? Utilisez Google avec l’adresse enregistrée par l’administrateur, ou le mot de passe qu’il vous a remis.
          </span>
        </p>
        )}
      </div>
    </div>
  );
};
