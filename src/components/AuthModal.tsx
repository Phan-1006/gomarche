import React, { useEffect, useState } from 'react';
import { X, Mail, Lock, User as UserIcon, AlertCircle, Loader2, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useBotGuard } from './BotGuard';

const GoogleIcon = () => (
  <span aria-hidden="true" className="w-5 h-5 rounded-full bg-white border border-gray-300 text-[13px] font-black text-[#4285F4] flex items-center justify-center">
    G
  </span>
);

export const AuthModal: React.FC = () => {
  const { isAuthOpen, setIsAuthOpen, login, register, loginWithGoogle, siteConfig } = useApp();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<'form' | 'google' | null>(null);
  const bot = useBotGuard();

  useEffect(() => {
    if (isAuthOpen) {
      setError('');
      setPassword('');
    }
  }, [isAuthOpen]);

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
    finish(mode === 'login' ? await login(email, password, bot.fields) : await register(name, email, password, bot.fields));
  };

  const google = async () => {
    setError('');
    setBusy('google');
    finish(await loginWithGoogle());
  };

  const inputClass = 'w-full pl-10 pr-3.5 py-3 rounded-xl border border-gray-300 text-sm focus:outline-hidden focus:border-[#E2001A]';

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div role="dialog" aria-modal="true" aria-label="Connexion" className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-5 relative">
        <button type="button" aria-label="Fermer" onClick={() => setIsAuthOpen(false)} className="absolute top-4 right-4 p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100">
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-1">
          <h2 className="text-xl font-black text-gray-900">
            {mode === 'login' ? 'Connexion à ' : 'Créer un compte '}
            <span translate="no" className="notranslate">{siteConfig.siteName}</span>
          </h2>
          <p className="text-xs text-gray-500">Clients et personnel utilisent la même porte : votre espace s’ouvre selon votre adresse e-mail.</p>
        </div>

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

        <form onSubmit={submit} className="space-y-3">
          {mode === 'register' && (
            <div className="relative">
              <UserIcon className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input type="text" required minLength={2} maxLength={80} autoComplete="name" aria-label="Nom complet" placeholder="Nom complet" className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          )}
          <div className="relative">
            <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input type="email" required autoComplete="email" aria-label="Adresse e-mail" placeholder="Adresse e-mail" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              required
              minLength={mode === 'register' ? 8 : 1}
              maxLength={200}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              aria-label="Mot de passe"
              placeholder={mode === 'register' ? 'Mot de passe (8 caractères minimum)' : 'Mot de passe'}
              className={inputClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {bot.element}

          {error && (
            <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-700 font-bold">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={!!busy || bot.pending}
            className="w-full py-3 rounded-xl text-white font-black text-sm flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ backgroundColor: siteConfig.primaryColor || '#E2001A' }}
          >
            {busy === 'form' && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{mode === 'login' ? 'Se connecter' : 'Créer mon compte'}</span>
          </button>
        </form>

        <p className="text-xs text-center text-gray-600">
          {mode === 'login' ? 'Pas encore de compte ?' : 'Déjà un compte ?'}{' '}
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setError('');
            }}
            className="font-bold text-[#E2001A] hover:underline"
          >
            {mode === 'login' ? 'Créer un compte' : 'Se connecter'}
          </button>
        </p>

        <p className="text-[11px] text-gray-500 bg-gray-50 rounded-xl p-3 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            Employé ? Utilisez Google avec l’adresse enregistrée par l’administrateur, ou le mot de passe qu’il vous a remis.
          </span>
        </p>
      </div>
    </div>
  );
};
