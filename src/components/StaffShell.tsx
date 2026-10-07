import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Role, ROLE_LABELS } from '../types';

interface StaffShellProps {
  roles: Role[];
  title: string;
  subtitle: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

/** Cadre commun des espaces employés : contrôle du rôle, en-tête, zone de travail. */
export const StaffShell: React.FC<StaffShellProps> = ({ roles, title, subtitle, actions, children }) => {
  const { currentUser, siteConfig, setIsAuthOpen, setActiveView } = useApp();

  if (!currentUser || !roles.includes(currentUser.role)) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-xl max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-gray-100 text-gray-600 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-gray-900">Espace réservé au personnel</h2>
          <p className="text-xs text-gray-600 leading-relaxed">
            Connectez-vous avec l’adresse e-mail que l’administrateur a enregistrée pour vous : votre espace s’ouvre automatiquement.
          </p>
          <div className="flex flex-col gap-2">
            {!currentUser && (
              <button type="button" onClick={() => setIsAuthOpen(true)} className="w-full py-3 bg-gray-900 hover:bg-black text-white font-bold text-xs rounded-xl">
                Se connecter
              </button>
            )}
            <button type="button" onClick={() => setActiveView('home')} className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl">
              Retour à la boutique
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100/70 pb-24">
      <div className="bg-[#161A1D] text-white">
        <div className="page-width mx-auto px-4 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {siteConfig.customLogoUrl && (
              <img src={siteConfig.customLogoUrl} alt="" className="h-11 max-w-[7.5rem] object-contain rounded-2xl bg-white/10 p-1 border border-white/10" />
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black">{title}</h1>
                <span className="bg-white/10 text-gray-200 text-[0.625rem] font-black uppercase px-2 py-0.5 rounded-full border border-white/10">
                  {ROLE_LABELS[currentUser.role]}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5 truncate">
                {currentUser.name} • {subtitle}
              </p>
            </div>
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      </div>
      <div className="page-width mx-auto px-4 py-6 space-y-5">{children}</div>
    </div>
  );
};

export const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${active ? 'bg-white text-gray-900' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}
  >
    {children}
  </button>
);

export const EmptyState: React.FC<{ icon: React.ReactNode; title: string; hint?: string }> = ({ icon, title, hint }) => (
  <div className="bg-white rounded-3xl p-10 text-center border border-gray-200">
    <div className="w-12 h-12 mx-auto mb-3 text-gray-400 flex items-center justify-center">{icon}</div>
    <h3 className="text-base font-bold text-gray-800">{title}</h3>
    {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
  </div>
);
