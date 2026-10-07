import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  ShoppingCart,
  User as UserIcon,
  Menu,
  X,
  ChevronDown,
  ShieldCheck,
  Truck,
  Store,
  Flame,
  Download,
  ArrowRight,
  LogOut,
  Package,
  Layers,
  MapPin,
  RefreshCw,
  Compass,
  Phone,
} from 'lucide-react';
import { AppView, useApp } from '../context/AppContext';
import { ROLE_LABELS } from '../types';
import { staffLinksFor } from '../utils/staffLinks';
import { AirtelMoneyLogo, OrangeMoneyLogo, MpesaLogo, AfriMoneyLogo } from './MobileMoneyLogos';

export const Header: React.FC = () => {
  const {
    currentUser,
    currency,
    setCurrency,
    deliveryMode,
    setDeliveryMode,
    cartItemsCount,
    cartTotalUsd,
    formatPrice,
    categories,
    selectedCategoryFilter,
    setSelectedCategoryFilter,
    searchQuery,
    setSearchQuery,
    activeView,
    setActiveView,
    setIsCartOpen,
    setIsAuthOpen,
    logout,
    siteConfig,
    deferredPrompt,
  } = useApp();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [isRayonsDropdownOpen, setIsRayonsDropdownOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const accountDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: Event) => {
      if (accountDropdownRef.current && !accountDropdownRef.current.contains(e.target as Node)) {
        setIsAccountDropdownOpen(false);
      }
    };
    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, []);

  const handlePwaInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the PWA install prompt');
      }
    } else {
      alert("Pour installer Gomarché PWA :\nCliquez sur le menu de votre navigateur puis sur 'Ajouter à l'écran d'accueil'.");
    }
  };

  const staffLinks = staffLinksFor(currentUser);

  return (
    <header className="sticky top-0 z-40 bg-white shadow-xs border-b border-gray-100">
      {/* 1. Top Announcement & Utility Bar (Exclusively Goma) */}
      <div className="bg-[#161A1D] text-white text-xs py-1.5 px-4 hidden md:block">
        <div className="page-width mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-amber-300 font-bold">
              <MapPin className="w-3.5 h-3.5 text-red-500 fill-red-500" />
              <span>Service Exclusif Ville de Goma (Nord-Kivu) • Livraison Express avec Tracé GPS</span>
            </span>
            <span className="text-gray-500">|</span>
            <span className="text-gray-300">
              Hub Central : {siteConfig.storeAddress}
            </span>
          </div>

          <div className="flex items-center gap-5">
            {/* Currency Switcher */}
            <div className="flex items-center gap-1 bg-gray-800/90 rounded-lg px-2 py-0.5 border border-gray-700">
              <span className="text-gray-400 text-[11px]">Devise :</span>
              <button
                type="button"
                onClick={() => setCurrency('USD')}
                className={`px-1.5 py-0.5 rounded text-[11px] font-bold transition-colors ${
                  currency === 'USD' ? 'bg-[#E2001A] text-white' : 'text-gray-300 hover:text-white'
                }`}
              >
                USD ($)
              </button>
              <button
                type="button"
                onClick={() => setCurrency('CDF')}
                className={`px-1.5 py-0.5 rounded text-[11px] font-bold transition-colors ${
                  currency === 'CDF' ? 'bg-[#E2001A] text-white' : 'text-gray-300 hover:text-white'
                }`}
              >
                CDF (FC)
              </button>
              <span className="text-gray-400 text-[10px] ml-1">
                (1$ = {siteConfig.exchangeRateUsdToCdf.toLocaleString()} FC)
              </span>
            </div>

            {/* Delivery mode */}
            <div className="flex items-center gap-1 bg-gray-800/90 rounded-lg p-0.5 border border-gray-700">
              <button
                type="button"
                onClick={() => setDeliveryMode('delivery')}
                className={`flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                  deliveryMode === 'delivery' ? 'bg-white text-gray-900 font-bold shadow-xs' : 'text-gray-300 hover:text-white'
                }`}
              >
                <Truck className="w-3 h-3 text-[#E2001A]" />
                <span>Livraison Goma</span>
              </button>
              <button
                type="button"
                onClick={() => setDeliveryMode('drive')}
                className={`flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                  deliveryMode === 'drive' ? 'bg-white text-gray-900 font-bold shadow-xs' : 'text-gray-300 hover:text-white'
                }`}
              >
                <Store className="w-3 h-3 text-emerald-600" />
                <span>Drive Retrait Goma</span>
              </button>
            </div>

            {/* Secure Role Badges (Only shown to authenticated staff) */}
            <div className="flex items-center gap-2 text-[11px]">
              {staffLinks[0] && (
                <button
                  type="button"
                  onClick={() => setActiveView(staffLinks[0].view)}
                  className="bg-white/10 text-white border border-white/30 rounded-lg px-2.5 py-1 text-[11px] font-bold flex items-center gap-1.5 hover:bg-white/20 transition-colors"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{staffLinks[0].label}</span>
                </button>
              )}
              {staffLinks.length === 0 && (
                <span className="text-gray-300 text-[11px] flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden lg:inline text-gray-400">Assistance Goma :</span>
                  <strong className="text-white">{siteConfig.storePhone}</strong>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Header: Big Logo, Rounded Search, Cart & Account */}
      <div className="page-width mx-auto px-3 sm:px-4 py-2 sm:py-4 flex items-center justify-between gap-2 sm:gap-4 md:gap-8">
        {/* Mobile menu trigger */}
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-1.5 sm:p-2 text-gray-700 hover:text-[#E2001A] lg:hidden rounded-2xl hover:bg-gray-100 shrink-0 cursor-pointer"
          aria-label="Menu"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6 sm:w-7 sm:h-7" /> : <Menu className="w-6 h-6 sm:w-7 sm:h-7" />}
        </button>

        {/* Brand Logo - Responsive sizing so it never causes mobile overflow */}
        <div
          onClick={() => {
            setActiveView('home');
            setSelectedCategoryFilter(null);
            setSearchQuery('');
          }}
          className="flex items-center gap-2 sm:gap-3.5 cursor-pointer select-none group shrink-0"
        >
          {siteConfig.customLogoUrl ? (
            <img
              src={siteConfig.customLogoUrl}
              alt={siteConfig.siteName}
              className="h-10 sm:h-14 md:h-20 object-contain"
            />
          ) : (
            <div className="flex items-center gap-2 sm:gap-3.5">
              {/* Distinctive Supermarket Emblem */}
              <div
                className="w-9 h-9 sm:w-14 sm:h-14 md:w-18 md:h-18 rounded-xl sm:rounded-2xl md:rounded-3xl flex items-center justify-center text-white shadow-md transition-transform group-hover:scale-105 border-2 border-white/60 shrink-0"
                style={{ backgroundColor: siteConfig.primaryColor || '#E2001A' }}
              >
                <div className="relative flex items-center justify-center">
                  <span className="font-black text-xl sm:text-3xl md:text-5xl tracking-tighter leading-none">
                    G
                  </span>
                  <div
                    className="absolute -bottom-0.5 -right-1 w-2.5 h-2.5 sm:w-4 sm:h-4 rounded-full border border-white shadow-xs"
                    style={{ backgroundColor: siteConfig.secondaryColor || '#009640' }}
                  />
                </div>
              </div>
              <div className="flex flex-col">
                <div translate="no" className="notranslate flex items-baseline">
                  <span
                    className="text-lg sm:text-2xl md:text-4xl lg:text-5xl font-black tracking-tight"
                    style={{ color: siteConfig.primaryColor || '#E2001A' }}
                  >
                    Go
                  </span>
                  <span className="text-lg sm:text-2xl md:text-4xl lg:text-5xl font-black text-gray-900 tracking-tight">
                    marché
                  </span>
                  <span
                    className="text-[9px] sm:text-xs md:text-sm font-black uppercase tracking-wider text-emerald-600 ml-1 sm:ml-2 px-1.5 py-0.2 bg-emerald-50 rounded-md sm:rounded-lg border border-emerald-200"
                  >
                    Goma
                  </span>
                </div>
                <span className="text-[9px] sm:text-[11px] uppercase tracking-wider font-bold text-gray-500 hidden sm:block">
                  Supermarché en Ligne • Service Exclusif Goma
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Center: Large Rounded Search Bar */}
        <div className="flex-1 max-w-2xl mx-1 md:mx-4 hidden sm:block">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setActiveView('home');
            }}
            className={`relative flex items-center w-full rounded-full border-2 transition-all bg-white shadow-xs ${
              isSearchFocused
                ? 'border-[#E2001A] ring-3 ring-red-100'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            {/* Category dropdown inside search */}
            <div className="hidden lg:flex items-center pl-4 pr-2 py-2 border-r border-gray-200 text-xs font-bold text-gray-700">
              <select
                aria-label="Filtrer par rayon"
                className="bg-transparent focus:outline-hidden cursor-pointer pr-1"
                value={selectedCategoryFilter || ''}
                onChange={(e) => {
                  setSelectedCategoryFilter(e.target.value || null);
                  setActiveView('home');
                }}
              >
                <option value="">Tous les rayons</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <input
              ref={searchInputRef}
              type="text"
              placeholder="Que cherchez-vous à Goma ? (Riz, Huile, Lait, Jus...)"
              className="flex-1 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 bg-transparent focus:outline-hidden"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
            />

            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="p-1 mr-1 text-gray-400 hover:text-gray-600 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            <button
              type="submit"
              aria-label="Lancer la recherche"
              className="p-2.5 m-1 rounded-full text-white transition-all transform active:scale-95 shadow-xs"
              style={{ backgroundColor: siteConfig.primaryColor || '#E2001A' }}
            >
              <Search className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Right Actions: Account & Cart */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          {/* Account Profile Trigger */}
          <div className="relative" ref={accountDropdownRef}>
            <button
              type="button"
              onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
              className="flex items-center gap-2 p-2 rounded-2xl hover:bg-gray-100 transition-colors text-left"
            >
              <div className="relative">
                {currentUser?.avatar ? (
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center font-bold text-sm">
                    <UserIcon className="w-5 h-5 text-gray-600" />
                  </div>
                )}
                {currentUser?.role === 'admin' && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 border-2 border-white rounded-full flex items-center justify-center text-[9px] text-white font-bold">
                    ★
                  </span>
                )}
              </div>

              <div className="hidden md:flex flex-col">
                <span className="text-xs text-gray-500 font-medium leading-none">
                  {currentUser ? 'Bonjour,' : 'Bienvenue,'}
                </span>
                <span className="text-sm font-bold text-gray-900 leading-tight truncate max-w-[120px]">
                  {currentUser ? currentUser.name.split(' ')[0] : 'Mon Compte'}
                </span>
                {currentUser && (
                  <span className="text-[10px] text-emerald-600 font-bold leading-none mt-0.5">
                    {currentUser.loyaltyPoints} pts Club
                  </span>
                )}
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400 hidden md:block" />
            </button>

            {/* Dropdown Menu */}
            {isAccountDropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-3xl shadow-2xl border border-gray-100 py-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                {currentUser ? (
                  <>
                    <div className="px-5 py-2.5 border-b border-gray-100 mb-1">
                      <p className="text-sm font-bold text-gray-900">{currentUser.name}</p>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-red-50 text-[#E2001A]">
                          {ROLE_LABELS[currentUser.role]}
                        </span>
                        <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                          {currentUser.loyaltyPoints} pts
                        </span>
                      </div>
                    </div>

                    {staffLinks.map((link, i) => (
                      <button
                        key={link.view}
                        type="button"
                        onClick={() => {
                          setActiveView(link.view);
                          setIsAccountDropdownOpen(false);
                        }}
                        className={
                          i === 0
                            ? 'w-full px-4 py-2.5 text-left text-xs font-bold text-white bg-gray-900 hover:bg-black flex items-center justify-between my-1 rounded-xl mx-2 max-w-[calc(100%-16px)]'
                            : 'w-full px-4 py-2.5 text-left text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2'
                        }
                      >
                        <span className="flex items-center gap-2">
                          <ShieldCheck className={`w-4 h-4 ${i === 0 ? '' : 'text-emerald-600'}`} />
                          <span>{link.label}</span>
                        </span>
                        {i === 0 && <ArrowRight className="w-3.5 h-3.5" />}
                      </button>
                    ))}

                    {/* Client Orders & Activity History */}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveView('orders');
                        setIsAccountDropdownOpen(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Package className="w-4 h-4 text-gray-500" />
                      <span>Mes commandes & mon profil</span>
                    </button>

                    <div className="border-t border-gray-100 my-1 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          logout();
                          setIsAccountDropdownOpen(false);
                        }}
                        className="w-full px-4 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Se déconnecter</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="p-4 text-center">
                    <p className="text-sm font-bold text-gray-900 mb-1">Identifiez-vous</p>
                    <p className="text-xs text-gray-500 mb-3">
                      Pour commander et suivre vos livraisons à Goma
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAuthOpen(true);
                        setIsAccountDropdownOpen(false);
                      }}
                      className="w-full py-2 bg-[#E2001A] text-white text-xs font-bold rounded-xl shadow-md hover:bg-red-700"
                    >
                      Se connecter / S'inscrire
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Cart Button */}
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="flex items-center gap-2.5 px-3.5 sm:px-5 py-2.5 rounded-full text-white font-bold transition-all shadow-md transform active:scale-95"
            style={{ backgroundColor: siteConfig.primaryColor || '#E2001A' }}
          >
            <div className="relative">
              <ShoppingCart className="w-5 h-5" />
              {cartItemsCount > 0 && (
                <span className="absolute -top-2 -right-2.5 w-5 h-5 bg-amber-300 text-gray-950 rounded-full font-black text-xs flex items-center justify-center shadow-xs border-2 border-[#E2001A]">
                  {cartItemsCount}
                </span>
              )}
            </div>
            <div className="hidden sm:flex flex-col text-left leading-tight">
              <span className="text-[10px] font-normal uppercase tracking-wider text-red-100">
                Panier
              </span>
              <span className="text-xs font-black">
                {cartTotalUsd > 0 ? formatPrice(cartTotalUsd) : '0,00 $'}
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Mobile search bar */}
      <div className="px-4 pb-2.5 sm:hidden">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setActiveView('home');
          }}
          className="relative flex items-center w-full rounded-full border border-gray-300 bg-gray-50 px-3.5 py-2"
        >
          <Search className="w-4 h-4 text-gray-400 mr-2 shrink-0" />
          <input
            type="text"
            placeholder="Que cherchez-vous à Goma ?"
            className="w-full text-xs text-gray-900 bg-transparent focus:outline-hidden"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </form>
      </div>

      {/* 3. Secondary Navigation: "Tous les rayons" */}
      <div className="border-t border-gray-100 bg-[#FBFBFC]">
        <div className="page-width mx-auto px-4 flex items-center justify-between text-xs font-medium">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-2">
            <button
              type="button"
              onClick={() => setIsRayonsDropdownOpen(!isRayonsDropdownOpen)}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gray-900 text-white font-bold hover:bg-gray-800 transition-colors shrink-0"
            >
              <Menu className="w-4 h-4" />
              <span>Rayons <span translate="no" className="notranslate">Gomarché</span> Goma</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {isRayonsDropdownOpen && (
              <div className="absolute left-4 top-full mt-1 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-50">
                <div className="px-4 py-1.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                  Rayons Disponibles à Goma
                </div>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategoryFilter(cat.id);
                      setActiveView(cat.isPromoCategory ? 'promotions' : 'home');
                      setIsRayonsDropdownOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left text-xs font-semibold text-gray-700 hover:bg-red-50 hover:text-[#E2001A] flex items-center justify-between"
                  >
                    <span>{cat.name}</span>
                    {cat.isPromoCategory && (
                      <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold">
                        Promo
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setActiveView('promotions');
                const promoCat = categories.find((c) => c.isPromoCategory);
                if (promoCat) setSelectedCategoryFilter(promoCat.id);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-red-600 font-extrabold bg-red-50 hover:bg-red-100 transition-colors shrink-0"
            >
              <Flame className="w-4 h-4 fill-red-600 text-red-600" />
              <span>Offres & Promotions Goma</span>
            </button>

            {categories.slice(0, 5).map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => {
                  setSelectedCategoryFilter(category.id);
                  setActiveView('home');
                }}
                className={`px-3 py-1.5 rounded-xl font-medium transition-colors shrink-0 ${
                  selectedCategoryFilter === category.id && activeView === 'home'
                    ? 'bg-gray-200 text-gray-900 font-bold'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>

          {/* Payment Badges Goma */}
          <div className="hidden lg:flex items-center gap-1.5 text-gray-400 text-[11px] shrink-0">
            <span className="text-gray-500 font-medium mr-1">Paiements Goma :</span>
            <AirtelMoneyLogo size="sm" showText={false} customLogoUrl={siteConfig.paymentGateways?.airtel?.customLogoUrl} />
            <OrangeMoneyLogo size="sm" showText={false} customLogoUrl={siteConfig.paymentGateways?.orange?.customLogoUrl} />
            <MpesaLogo size="sm" showText={false} customLogoUrl={siteConfig.paymentGateways?.mpesa?.customLogoUrl} />
            <AfriMoneyLogo size="sm" showText={false} customLogoUrl={siteConfig.paymentGateways?.afrimoney?.customLogoUrl} />
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 lg:hidden flex">
          <div className="w-4/5 max-w-sm bg-white h-full overflow-y-auto p-5 flex flex-col justify-between shadow-2xl">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  {siteConfig.customLogoUrl ? (
                    <img
                      src={siteConfig.customLogoUrl}
                      alt={siteConfig.siteName}
                      className="h-10 max-w-[120px] object-contain rounded-xl"
                    />
                  ) : (
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-xl"
                      style={{ backgroundColor: siteConfig.primaryColor || '#E2001A' }}
                    >
                      G
                    </div>
                  )}
                  <div>
                    <span translate="no" className="notranslate font-black text-xl text-gray-900 block leading-tight">Gomarché</span>
                    <span className="text-[10px] font-bold text-emerald-600 uppercase">Supermarché Goma</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1 rounded-xl hover:bg-gray-100"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Currency & Mode */}
              <div className="py-4 border-b border-gray-100 space-y-2">
                <p className="text-xs font-bold text-gray-500 uppercase">Devise</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrency('USD')}
                    className={`py-2 text-xs font-bold rounded-xl border ${
                      currency === 'USD' ? 'bg-[#E2001A] text-white border-[#E2001A]' : 'border-gray-200'
                    }`}
                  >
                    USD ($)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrency('CDF')}
                    className={`py-2 text-xs font-bold rounded-xl border ${
                      currency === 'CDF' ? 'bg-[#E2001A] text-white border-[#E2001A]' : 'border-gray-200'
                    }`}
                  >
                    CDF (FC)
                  </button>
                </div>
              </div>

              {/* Categories list */}
              <div className="py-4 space-y-1">
                <p className="text-xs font-bold text-gray-500 mb-2 uppercase">Rayons Disponibles</p>
                <button
                  type="button"
                  onClick={() => {
                    setActiveView('promotions');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-xl font-bold text-red-600 bg-red-50 flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <Flame className="w-4 h-4 fill-red-600" />
                    <span>Offres & Promotions Goma</span>
                  </span>
                  <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded-full">Promo</span>
                </button>

                {categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategoryFilter(c.id);
                      setActiveView('home');
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-100 rounded-xl flex items-center justify-between"
                  >
                    <span>{c.name}</span>
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <p className="text-[11px] text-gray-500 mb-2 font-semibold">Paiement Mobile Money instantané :</p>
              <div className="flex flex-wrap gap-1.5">
                <AirtelMoneyLogo size="sm" showText={false} customLogoUrl={siteConfig.paymentGateways?.airtel?.customLogoUrl} />
                <OrangeMoneyLogo size="sm" showText={false} customLogoUrl={siteConfig.paymentGateways?.orange?.customLogoUrl} />
                <MpesaLogo size="sm" showText={false} customLogoUrl={siteConfig.paymentGateways?.mpesa?.customLogoUrl} />
                <AfriMoneyLogo size="sm" showText={false} customLogoUrl={siteConfig.paymentGateways?.afrimoney?.customLogoUrl} />
              </div>
            </div>
          </div>
          <div className="flex-1" onClick={() => setIsMobileMenuOpen(false)} />
        </div>
      )}
    </header>
  );
};
