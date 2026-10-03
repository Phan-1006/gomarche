import React from 'react';
import {
  Home,
  Layers,
  ShoppingCart,
  Clock,
  User as UserIcon,
  Flame,
  ShieldCheck,
} from 'lucide-react';
import { AppProvider, useApp } from './context/AppContext';
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
    homeViewFor,
  } = useApp();

  const pendingOrdersCount = orders.filter(isActiveOrder).length;
  const unreadMessages = orders.reduce((n, o) => n + (o.unreadHint || 0), 0);

  return (
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

      {/* Compte */}
      <button
        type="button"
        onClick={() => {
          if (!currentUser) {
            setIsAuthOpen(true);
          } else {
            const home = homeViewFor(currentUser);
            setActiveView(home === 'home' ? 'orders' : home);
          }
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
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
  );
};

const GomarcheContent: React.FC = () => {
  const { activeView, siteConfig } = useApp();

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
        {activeView === 'home' && (
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

        {activeView === 'product_detail' && (
          <>
            <HeroCarousel />
            <CategoryShowcase />
            <ProductSections />
          </>
        )}
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
