import React, { useEffect, useRef, useState } from 'react';
import {
  Home,
  Layers,
  ShoppingCart,
  Clock,
  User as UserIcon,
  Flame,
  ShieldCheck,
  Package,
  LogOut,
  X,
} from 'lucide-react';
import { AppProvider, AppView, useApp } from './context/AppContext';
import { ROLE_LABELS } from './types';
import { staffLinksFor } from './utils/staffLinks';
import { Header } from './components/Header';
import { HeroCarousel } from './components/HeroCarousel';
import { CategoryShowcase } from './components/CategoryShowcase';
import { ProductSections } from './components/ProductSections';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { AuthModal } from './components/AuthModal';
import { ProductDetailModal } from './components/ProductDetailModal';
import { AdminPanel } from './components/AdminPanel';
import { AgentPanel } from './components/AgentPanel';
import { DeliveryDriverPanel } from './components/DeliveryDriverPanel';
import { PrepPanel } from './components/PrepPanel';
import { CashierPanel } from './components/CashierPanel';
import { isActiveOrder } from './utils/orders';
import { OrderTrackingView } from './components/OrderTrackingView';
import { PromotionsView } from './components/PromotionsView';
import { PwaInstallPrompt } from './components/PwaInstallPrompt';
import { EmailVerifyBanner } from './components/EmailVerifyBanner';
import { NotificationPrompt } from './components/NotificationPrompt';
import { Footer } from './components/Footer';
import { scrollToTop } from './utils/scroll';

const MobileBottomNav: React.FC = () => {
  const {
    activeView,
    setActiveView,
    cartItemsCount,
    setIsCartOpen,
    setIsAuthOpen,
    currentUser,
    orders,
    setSelectedCategoryFilter,
    logout,
    setSelectedOrder,
  } = useApp();
  const [isAccountOpen, setIsAccountOpen] = useState(false);

  const go = (view: AppView) => {
    setIsAccountOpen(false);
    // Ouvrir « Mes commandes » ramène à la liste, même si une commande était affichée.
    if (view === 'orders') setSelectedOrder(null);
    setActiveView(view);
  };

  const pendingOrdersCount = orders.filter(isActiveOrder).length;
  const unreadMessages = orders.reduce((n, o) => n + (o.unreadHint || 0), 0);

  return (
    <>
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 py-2 px-3 flex items-center justify-around md:hidden shadow-2xl backdrop-blur-md bg-white/95">
      {/* Home */}
      <button
        type="button"
        onClick={() => {
          setSelectedCategoryFilter(null);
          setActiveView('home');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        className={`flex flex-col items-center gap-1 ${
          activeView === 'home' ? 'text-[#E2001A]' : 'text-gray-500'
        }`}
      >
        <Home className="w-5 h-5" />
        <span className="text-[10px] font-bold">Accueil</span>
      </button>

      {/* Promos / Rayons */}
      <button
        type="button"
        onClick={() => {
          setActiveView('promotions');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        className={`flex flex-col items-center gap-1 ${
          activeView === 'promotions' ? 'text-[#E2001A]' : 'text-gray-500'
        }`}
      >
        <Flame className="w-5 h-5 text-red-600 fill-red-600" />
        <span className="text-[10px] font-bold">Promos Goma</span>
      </button>

      {/* Panier */}
      <button
        type="button"
        onClick={() => setIsCartOpen(true)}
        className="flex flex-col items-center gap-1 text-gray-500 relative"
      >
        <div className="relative">
          <ShoppingCart className="w-5 h-5 text-gray-800" />
          {cartItemsCount > 0 && (
            <span className="absolute -top-1.5 -right-2.5 w-4 h-4 rounded-full bg-[#E2001A] text-white text-[9px] font-black flex items-center justify-center border-2 border-white">
              {cartItemsCount}
            </span>
          )}
        </div>
        <span className="text-[10px] font-bold">Panier</span>
      </button>

      {/* Suivi Commandes */}
      <button
        type="button"
        onClick={() => {
          setActiveView('orders');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        className={`flex flex-col items-center gap-1 relative ${
          activeView === 'orders' ? 'text-[#E2001A]' : 'text-gray-500'
        }`}
      >
        <div className="relative">
          <Clock className="w-5 h-5" />
          {unreadMessages > 0 ? (
            <span className="absolute -top-2 -right-2.5 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center border border-white">
              {unreadMessages > 9 ? '9+' : unreadMessages}
            </span>
          ) : (
            pendingOrdersCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white animate-pulse" />
            )
          )}
        </div>
        <span className="text-[10px] font-bold">Mes Courses</span>
      </button>

      {/* Compte : ouvre le menu du compte (espaces de travail, commandes, déconnexion) */}
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => (currentUser ? setIsAccountOpen(true) : setIsAuthOpen(true))}
        className={`flex flex-col items-center gap-1 ${
          ['admin', 'agent', 'prep', 'cashier', 'delivery'].includes(activeView) ? 'text-[#E2001A]' : 'text-gray-500'
        }`}
      >
        <UserIcon className="w-5 h-5" />
        <span className="text-[10px] font-bold">
          {currentUser ? currentUser.name.split(' ')[0] : 'Compte'}
        </span>
      </button>

    </div>

      {/* Hors de la barre : son flou d'arrière-plan enfermerait sinon la fenêtre dans sa propre hauteur. */}
      {isAccountOpen && currentUser && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end" onClick={() => setIsAccountOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Mon compte"
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-white rounded-t-3xl p-4 pb-6 space-y-1 shadow-2xl"
          >
            <div className="flex items-center justify-between px-2 pb-3 border-b border-gray-100">
              <div className="min-w-0">
                <p className="text-sm font-black text-gray-900 truncate">{currentUser.name}</p>
                <p className="text-xs text-gray-500 truncate">
                  {ROLE_LABELS[currentUser.role]} • {currentUser.email}
                </p>
              </div>
              <button type="button" aria-label="Fermer" onClick={() => setIsAccountOpen(false)} className="p-2 rounded-xl text-gray-400 hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            {staffLinksFor(currentUser).map((link) => (
              <button key={link.view} type="button" onClick={() => go(link.view)} className="w-full px-3 py-3.5 rounded-2xl text-left text-sm font-bold text-gray-900 hover:bg-gray-50 flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span>{link.label}</span>
              </button>
            ))}
            <button type="button" onClick={() => go('orders')} className="w-full px-3 py-3.5 rounded-2xl text-left text-sm font-bold text-gray-900 hover:bg-gray-50 flex items-center gap-3">
              <Package className="w-5 h-5 text-gray-500" />
              <span>Mes commandes & mon profil</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAccountOpen(false);
                logout();
              }}
              className="w-full px-3 py-3.5 rounded-2xl text-left text-sm font-bold text-red-600 hover:bg-red-50 flex items-center gap-3"
            >
              <LogOut className="w-5 h-5" />
              <span>Se déconnecter</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};

const GomarcheContent: React.FC = () => {
  const { activeView, siteConfig, selectedOrder, selectedCategoryFilter, searchQuery, booting } = useApp();

  // Changer de page (ou ouvrir une commande) repart du haut. Deux exceptions : la fiche produit,
  // qui s'ouvre par-dessus la boutique sans la déplacer, et la boutique filtrée, qui se place
  // d'elle-même sur ses résultats.
  const previousView = useRef(activeView);
  const selectedOrderId = selectedOrder?.id;
  useEffect(() => {
    const from = previousView.current;
    previousView.current = activeView;
    if (activeView === 'product_detail' || from === 'product_detail') return;
    if (activeView === 'home' && (selectedCategoryFilter || searchQuery)) return;
    scrollToTop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView, selectedOrderId]);

  // Tant que la boutique réelle n'est pas connue, un écran neutre : jamais l'habillage par défaut
  // ni une ancienne version, qui seraient remplacés une seconde plus tard.
  if (booting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white" role="status" aria-label="Chargement de la boutique">
        <div className="w-10 h-10 rounded-full border-4 border-gray-200 border-t-gray-500 animate-spin" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col font-sans antialiased text-gray-900 transition-colors pb-20 md:pb-0"
      style={{ backgroundColor: siteConfig.backgroundColor || '#F8F9FA' }}
    >
      {/* PWA Prompt bar */}
      <PwaInstallPrompt />

      {/* Rappel de confirmation d'adresse e-mail */}
      <EmailVerifyBanner />

      {/* Invitation à activer les notifications (commande en cours, personnel) */}
      <NotificationPrompt />

      {/* Modern Supermarket Header */}
      <Header />

      {/* Main View Router */}
      <main className="flex-1">
        {/* La fiche produit s'ouvre par-dessus la boutique : même rendu, pour qu'elle ne soit pas
            reconstruite (et ne perde pas sa position) à l'ouverture et à la fermeture. */}
        {(activeView === 'home' || activeView === 'product_detail') && (
          <>
            <HeroCarousel />
            <CategoryShowcase />
            <ProductSections />
          </>
        )}

        {activeView === 'promotions' && <PromotionsView />}

        {activeView === 'admin' && <AdminPanel />}

        {activeView === 'agent' && <AgentPanel />}

        {activeView === 'delivery' && <DeliveryDriverPanel />}

        {activeView === 'prep' && <PrepPanel />}

        {activeView === 'cashier' && <CashierPanel />}

        {activeView === 'orders' && <OrderTrackingView />}

      </main>

      {/* Modals & Overlays */}
      <CartDrawer />
      <CheckoutModal />
      <AuthModal />
      <ProductDetailModal />

      {/* Mobile Floating Bottom Bar */}
      <MobileBottomNav />

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <GomarcheContent />
    </AppProvider>
  );
}
