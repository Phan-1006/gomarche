import React, { useEffect, useState } from 'react';
import { FileText, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { TERMS_VERSION, termsSections } from '../data/terms';

/** Lien qui ouvre les règles et conditions d'utilisation dans une fenêtre de lecture. */
export const TermsLink: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => {
  const { siteConfig } = useApp();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className || 'font-bold text-[#E2001A] hover:underline'}>
        {children}
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Règles et conditions d’utilisation"
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[88vh] flex flex-col overflow-hidden text-left"
          >
            <div className="p-5 border-b border-gray-100 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-[#E2001A] shrink-0 mt-0.5" />
                <div>
                  <h2 className="text-base font-black text-gray-900">Règles et conditions d’utilisation</h2>
                  <p className="text-xs text-gray-500">
                    <span translate="no" className="notranslate">{siteConfig.siteName}</span> • version du {TERMS_VERSION.split('-').reverse().join('/')}
                  </p>
                </div>
              </div>
              <button type="button" aria-label="Fermer" onClick={() => setOpen(false)} className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-5 text-sm text-gray-700 leading-relaxed">
              {termsSections(siteConfig).map((section) => (
                <section key={section.title} className="space-y-1.5">
                  <h3 className="text-sm font-black text-gray-900">{section.title}</h3>
                  {section.paragraphs.map((p) => (
                    <p key={p}>{p}</p>
                  ))}
                </section>
              ))}
            </div>

            <div className="p-4 border-t border-gray-100">
              <button type="button" onClick={() => setOpen(false)} className="w-full py-3 rounded-xl bg-gray-900 hover:bg-black text-white font-bold text-sm">
                J’ai lu, fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
