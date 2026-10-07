import type { AppView } from '../context/AppContext';
import type { User } from '../types';

// Espaces de travail accessibles selon le rôle (le premier est l'espace principal).
const STAFF_LINKS: Partial<Record<User['role'], { view: AppView; label: string }[]>> = {
  admin: [
    { view: 'admin', label: 'Administration' },
    { view: 'cashier', label: 'Caisse & paiements' },
    { view: 'prep', label: 'Préparation des commandes' },
    { view: 'agent', label: 'Catalogue des rayons' },
  ],
  category_agent: [{ view: 'agent', label: 'Mon rayon' }],
  order_agent: [{ view: 'prep', label: 'Préparation des commandes' }],
  cashier: [{ view: 'cashier', label: 'Caisse & paiements' }],
  delivery_driver: [{ view: 'delivery', label: 'Espace livreur' }],
};

export const staffLinksFor = (user: User | null) => (user && STAFF_LINKS[user.role]) || [];
