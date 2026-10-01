import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Lock,
  User,
  ArrowRight,
  ShieldCheck,
  Check,
  AlertCircle,
  Loader2,
  Briefcase,
  Store,
  Truck,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const AuthModal: React.FC = () => {
  const { isAuthOpen, setIsAuthOpen, login, loginWithGoogle, siteConfig } = useApp();

  const [activeTab, setActiveTab] = useState<'customer' | 'staff'>('customer');
  const [isSignUp, setIsSignUp] = useState(false);

  // Customer email/password state
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Staff login state
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffError, setStaffError] = useState('');

  // Reset errors on open
  useEffect(() => {
    if (isAuthOpen) {
      setErrorMessage('');
      setSuccessMessage('');
      setStaffError('');
      setGoogleLoading(false);
    }
  }, [isAuthOpen]);

  if (!isAuthOpen) return null;

  // Real Google Sign-in with official Google OAuth Popup
  const handleGoogleSignIn = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    setGoogleLoading(true);

    try {
      const res = await loginWithGoogle();
      setGoogleLoading(false);

      if (res.success) {
        setIsAuthOpen(false);
      } else {
        setErrorMessage(res.message || 'Échec de la connexion avec Google.');
      }
    } catch (err: any) {
      setGoogleLoading(false);
      setErrorMessage(err.message || 'Impossible de finaliser la connexion Google.');
    }
  };

  // Handle standard email/password submit
  const handleCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!email.trim() || !password) {
      setErrorMessage('Veuillez renseigner votre email et mot de passe.');
      return;
    }

    setIsSubmitting(true);
    const res = login(email.trim(), password, name.trim());
    setIsSubmitting(false);

    if (res.success) {
      setSuccessMessage('Connexion réussie !');
      setTimeout(() => {
        setIsAuthOpen(false);
      }, 500);
    } else {
      setErrorMessage(res.message || 'Identifiants invalides.');
    }
  };

  // Handle Staff login (Agent or Driver)
  const handleStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStaffError('');

    if (!staffEmail.trim() || !staffPassword) {
      setStaffError('Veuillez entrer votre identifiant professionnel et mot de passe.');
      return;
    }

    setIsSubmitting(true);
    const res = login(staffEmail.trim(), staffPassword);
    setIsSubmitting(false);

    if (res.success) {
      setIsAuthOpen(false);
    } else {
      setStaffError(res.message || 'Identifiants professionnels non reconnus.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100 flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-sm"
              style={{ backgroundColor: siteConfig.primaryColor || '#E2001A' }}
            >
              G
            </div>
            <div>
              <h2 className="text-base font-black text-gray-900">
                {activeTab === 'staff'
                  ? 'Portail Employés Gomarché'
                  : isSignUp
                  ? 'Créer mon compte Gomarché'
                  : 'Connexion Gomarché Goma'}
              </h2>
              <p className="text-xs text-gray-500">
                {activeTab === 'staff'
                  ? 'Accès sécurisé réservé aux agents de rayon et livreurs'
                  : 'Livraisons exclusives à Goma avec tracé GPS'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsAuthOpen(false)}
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Navigation Tabs (Customer vs Staff) */}
        <div className="grid grid-cols-2 bg-gray-100/80 p-1 border-b border-gray-200 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setActiveTab('customer');
              setErrorMessage('');
            }}
            className={`py-2 rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'customer'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <User className="w-3.5 h-3.5 text-[#E2001A]" />
            <span>Espace Client & Google</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('staff');
              setStaffError('');
            }}
            className={`py-2 rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'staff'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5 text-blue-600" />
            <span>Employés Supermarché</span>
          </button>
        </div>

        {/* ======================================================== */}
        {/* VIEW 1: CUSTOMER & REAL GOOGLE SIGN-IN VIEW              */}
        {/* ======================================================== */}
        {activeTab === 'customer' && (
          <div className="p-6 space-y-4">
            {/* Real Official Google Sign-In Button */}
            <button
              type="button"
              disabled={googleLoading}
              onClick={handleGoogleSignIn}
              className="w-full py-3.5 px-4 rounded-2xl border-2 border-gray-200 bg-white hover:bg-gray-50 hover:border-blue-500 hover:shadow-md text-gray-800 font-bold text-xs sm:text-sm flex items-center justify-center gap-3 transition-all shadow-xs active:scale-98 cursor-pointer group"
            >
              {googleLoading ? (
                <>
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                  <span className="text-blue-700">Ouverture de Google...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 shrink-0 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.9c2.28-2.1 3.64-5.2 3.64-9.15z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.9-3.05c-1.08.72-2.45 1.16-4.03 1.16-3.1 0-5.73-2.1-6.67-4.92H1.27v3.13C3.25 21.3 7.31 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.33 14.28c-.24-.72-.38-1.49-.38-2.28s.14-1.56.38-2.28V6.59H1.27C.46 8.21 0 10.05 0 12s.46 3.79 1.27 5.41l4.06-3.13z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.7 1.27 6.59l4.06 3.13c.94-2.82 3.57-4.97 6.67-4.97z"
                    />
                  </svg>
                  <span>Continuer avec Google</span>
                </>
              )}
            </button>

            <div className="flex items-center gap-3 my-1">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-[10px] uppercase font-bold text-gray-400">
                ou avec votre email
              </span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{successMessage}</span>
              </div>
            )}

            <form onSubmit={handleCustomerSubmit} className="space-y-3">
              {isSignUp && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Votre Nom & Prénom
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      placeholder="Ex: Alain Kalala"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-300 text-xs sm:text-sm focus:outline-hidden focus:border-[#E2001A]"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Adresse Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="votre.email@domaine.cd"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-300 text-xs sm:text-sm focus:outline-hidden focus:border-[#E2001A]"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Mot de passe
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-300 text-xs sm:text-sm focus:outline-hidden focus:border-[#E2001A]"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-2xl text-white font-bold text-xs sm:text-sm shadow-md transition-transform transform active:scale-95 flex items-center justify-center gap-2"
                style={{ backgroundColor: siteConfig.primaryColor || '#E2001A' }}
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isSignUp ? (
                  'Créer mon compte client Gomarché'
                ) : (
                  'Se connecter à mon compte'
                )}
              </button>
            </form>

            {/* Toggle SignUp / SignIn */}
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setErrorMessage('');
                }}
                className="text-xs font-semibold text-[#E2001A] hover:underline"
              >
                {isSignUp
                  ? 'Déjà un compte ? Connectez-vous ici'
                  : 'Nouveau client ? Créer un compte en 30 secondes'}
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 2: STAFF & EMPLOYEES LOGIN VIEW                     */}
        {/* ======================================================== */}
        {activeTab === 'staff' && (
          <div className="p-6 space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-900 flex items-start gap-2.5">
              <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Portail Collaborateurs & Personnel Gomarché</strong>
                <span>
                  Cet espace est strictement réservé aux agents de rayon et chauffeurs-livreurs du supermarché.
                </span>
              </div>
            </div>

            {staffError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{staffError}</span>
              </div>
            )}

            <form onSubmit={handleStaffSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Email Professionnel Employé *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="agent.rayon@gomarche.cd ou livreur@..."
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-300 text-xs sm:text-sm focus:outline-hidden focus:border-blue-600"
                    value={staffEmail}
                    onChange={(e) => setStaffEmail(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Mot de passe personnel *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-300 text-xs sm:text-sm focus:outline-hidden focus:border-blue-600"
                    value={staffPassword}
                    onChange={(e) => setStaffPassword(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-2xl bg-gray-900 hover:bg-black text-white font-bold text-xs sm:text-sm shadow-md transition-transform transform active:scale-95 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Briefcase className="w-4 h-4 text-amber-400" />
                    <span>Accéder à mon espace professionnel</span>
                  </>
                )}
              </button>
            </form>

            <div className="pt-2 text-center">
              <span className="text-[11px] text-gray-400 block">
                Mot de passe oublié ou nouvel employé ? Contactez l'administrateur Gomarché.
              </span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
