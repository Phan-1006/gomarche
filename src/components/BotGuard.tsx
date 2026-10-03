import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';

declare global {
  interface Window {
    turnstile?: { render: (el: HTMLElement, opts: Record<string, unknown>) => string; reset: (id?: string) => void };
  }
}

/**
 * Protection anti-robots des formulaires :
 * - un champ-piège invisible que seuls les robots remplissent ;
 * - le défi Cloudflare Turnstile quand l'admin l'a activé côté serveur.
 * `fields` est à joindre tel quel au corps de la requête.
 */
export function useBotGuard() {
  const { siteConfig } = useApp();
  const siteKey = siteConfig.turnstileSiteKey;
  const [website, setWebsite] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  // Le conteneur n'existe que lorsque le formulaire est affiché : on (re)crée le défi à ce moment-là.
  const [box, setBox] = useState<HTMLDivElement | null>(null);
  const widgetId = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!siteKey || !box) return;
    let cancelled = false;
    const render = () => {
      if (cancelled || !window.turnstile || widgetId.current) return;
      widgetId.current = window.turnstile.render(box, {
        sitekey: siteKey,
        callback: (token: string) => setCaptchaToken(token),
        'expired-callback': () => setCaptchaToken(''),
      });
    };
    if (window.turnstile) render();
    else {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.onload = render;
      document.head.appendChild(script);
    }
    return () => {
      cancelled = true;
      widgetId.current = undefined;
      setCaptchaToken('');
    };
  }, [siteKey, box]);

  const element = (
    <>
      <div aria-hidden="true" className="absolute -left-[9999px] w-px h-px overflow-hidden">
        <label>
          Ne pas remplir ce champ
          <input type="text" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </label>
      </div>
      {siteKey && <div ref={setBox} className="flex justify-center" />}
    </>
  );

  return {
    element,
    fields: { website, captchaToken },
    // Un jeton Turnstile ne sert qu'une fois : à redemander après chaque envoi.
    reset: () => {
      setCaptchaToken('');
      window.turnstile?.reset(widgetId.current);
    },
    pending: !!siteKey && !captchaToken,
  };
}
