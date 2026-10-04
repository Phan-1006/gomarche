// Défilement automatique : amène l'utilisateur là où le contenu vient de changer.

const smooth = (): ScrollBehavior =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';

export const RESULTS_ID = 'catalogue-resultats';

export const scrollToTop = () => window.scrollTo({ top: 0, behavior: smooth() });

/**
 * Amène la liste des produits filtrés juste sous l'en-tête fixe. On attend le prochain rendu :
 * au moment du clic, la liste n'est pas encore affichée (ou pas encore à jour).
 */
export function scrollToResults() {
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      const target = document.getElementById(RESULTS_ID);
      if (!target) return scrollToTop();
      const header = document.querySelector('header');
      const offset = (header?.getBoundingClientRect().height || 0) + 12;
      window.scrollTo({ top: Math.max(0, target.getBoundingClientRect().top + window.scrollY - offset), behavior: smooth() });
    })
  );
}
