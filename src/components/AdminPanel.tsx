import React, { useState } from 'react';
import {
  ShieldCheck,
  Palette,
  DollarSign,
  Layers,
  ShoppingBag,
  Users,
  Smartphone,
  BarChart3,
  Plus,
  Trash2,
  Edit,
  Save,
  Check,
  Globe,
  Truck,
  Flame,
  ArrowRight,
  Eye,
  Clock,
  Sparkles,
  Settings,
  Sliders,
  MapPin,
  Phone,
  Mail,
  Zap,
  Lock,
  KeyRound,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Category, Product, SiteConfig, User, Role, OrderStatus, ThemeStyle, DeliverySlotConfig } from '../types';
import { AirtelMoneyLogo, OrangeMoneyLogo, MpesaLogo, AfriMoneyLogo } from './MobileMoneyLogos';

export const AdminPanel: React.FC = () => {
  const {
    currentUser,
    setIsAuthOpen,
    changeAdminPassword,
    siteConfig,
    updateSiteConfig,
    updatePaymentGateway,
    updateDeliverySlot,
    categories,
    addCategory,
    updateCategory,
    deleteCategory,
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    users,
    orders,
    updateOrderStatus,
    assignDriverToOrder,
    formatPrice,
    convertUsdToCdf,
    setActiveView,
    currency,
  } = useApp();

  const [activeTab, setActiveTab] = useState<
    'overview' | 'store_info' | 'delivery_slots' | 'branding' | 'currency' | 'categories_agents' | 'products' | 'payment_apis' | 'orders' | 'security'
  >('overview');

  // Security & Password states
  const [oldAdminPass, setOldAdminPass] = useState('');
  const [newAdminPass, setNewAdminPass] = useState('');
  const [confirmAdminPass, setConfirmAdminPass] = useState('');
  const [adminPassMsg, setAdminPassMsg] = useState('');
  const [adminPassError, setAdminPassError] = useState('');
  const [googleClientIdInput, setGoogleClientIdInput] = useState(siteConfig.googleClientId || '');

  // Category modal
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [newCatImage, setNewCatImage] = useState('');
  const [newCatAgentName, setNewCatAgentName] = useState('');
  const [newCatAgentEmail, setNewCatAgentEmail] = useState('');
  const [newCatIsPromo, setNewCatIsPromo] = useState(false);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);

  // Product modal
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newProdName, setNewProdName] = useState('');
  const [newProdCategory, setNewProdCategory] = useState(categories[0]?.id || '');
  const [newProdBrand, setNewProdBrand] = useState('');
  const [newProdDesc, setNewProdDesc] = useState('');
  const [newProdPriceUsd, setNewProdPriceUsd] = useState(9.99);
  const [newProdDiscount, setNewProdDiscount] = useState(0);
  const [newProdUnit, setNewProdUnit] = useState('le kg');
  const [newProdImage, setNewProdImage] = useState('');
  const [newProdStock, setNewProdStock] = useState(50);
  const [newProdIsPromo, setNewProdIsPromo] = useState(false);
  const [isProdModalOpen, setIsProdModalOpen] = useState(false);

  // Success alert
  const [saveToast, setSaveToast] = useState(false);
  const showSaveSuccess = () => {
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2500);
  };

  // Analytics totals
  const totalRevenueUsd = orders.reduce((sum, o) => sum + (o.paymentStatus === 'completed' ? o.totalUsd : 0), 0);
  const totalRevenueCdf = convertUsdToCdf(totalRevenueUsd);
  const totalOrdersCount = orders.length;
  const pendingOrdersCount = orders.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled').length;
  const deliveryDrivers = users.filter((u) => u.role === 'delivery_driver');

  // European hypermarket style presets without mentioning competitor brands
  const themePresets: { id: ThemeStyle; name: string; primary: string; secondary: string; desc: string }[] = [
    {
      id: 'classic_red',
      name: 'Gomarché Rouge & Vert Terroir',
      primary: '#E2001A',
      secondary: '#009640',
      desc: 'Style hypermarché dynamique : rouge éclatant et vert végétal',
    },
    {
      id: 'emerald_fresh',
      name: 'Gomarché Fraîcheur & Bio Kivu',
      primary: '#009640',
      secondary: '#E2001A',
      desc: 'Axé sur les produits frais locaux et les arrivages des terroirs',
    },
    {
      id: 'navy_modern',
      name: 'Gomarché Bleu Saphir Élégant',
      primary: '#0055A5',
      secondary: '#FF6600',
      desc: 'Modernité épurée avec touches d’orange chaleureux',
    },
    {
      id: 'warm_gold',
      name: 'Gomarché Solaire & Festif',
      primary: '#D97706',
      secondary: '#E2001A',
      desc: 'Ambiance chaleureuse, idéale pour les grandes fêtes',
    },
  ];

  // Category save
  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCategory) {
      updateCategory({
        ...editingCategory,
        name: newCatName,
        description: newCatDesc,
        image: newCatImage || editingCategory.image,
        assignedAgentName: newCatAgentName,
        assignedAgentEmail: newCatAgentEmail,
        isPromoCategory: newCatIsPromo,
      });
    } else {
      addCategory({
        name: newCatName,
        slug: newCatName.toLowerCase().replace(/\s+/g, '-'),
        description: newCatDesc,
        image: newCatImage || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80',
        iconName: 'Layers',
        assignedAgentName: newCatAgentName || 'Agent Rayon',
        assignedAgentEmail: newCatAgentEmail || `agent.${Date.now()}@gomarche.cd`,
        isPromoCategory: newCatIsPromo,
        displayOrder: categories.length + 1,
      });
    }
    setIsCatModalOpen(false);
    setEditingCategory(null);
    showSaveSuccess();
  };

  // Product save
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProduct) {
      updateProduct({
        ...editingProduct,
        name: newProdName,
        categoryId: newProdCategory,
        brand: newProdBrand,
        description: newProdDesc,
        priceUsd: Number(newProdPriceUsd),
        discountPercent: Number(newProdDiscount),
        unit: newProdUnit,
        image: newProdImage || editingProduct.image,
        stockCount: Number(newProdStock),
        inStock: Number(newProdStock) > 0,
        isPromo: newProdIsPromo || Number(newProdDiscount) > 0,
      });
    } else {
      addProduct({
        name: newProdName,
        categoryId: newProdCategory,
        brand: newProdBrand || 'Gomarché Sélection',
        description: newProdDesc,
        priceUsd: Number(newProdPriceUsd),
        discountPercent: Number(newProdDiscount),
        unit: newProdUnit,
        image: newProdImage || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80',
        rating: 4.8,
        reviewCount: 1,
        inStock: Number(newProdStock) > 0,
        stockCount: Number(newProdStock),
        isPromo: newProdIsPromo || Number(newProdDiscount) > 0,
      });
    }
    setIsProdModalOpen(false);
    setEditingProduct(null);
    showSaveSuccess();
  };

  // Security barrier: Mughenyakavale@gmail.com with admin role ONLY
  if (currentUser?.role !== 'admin' || currentUser?.email.toLowerCase() !== 'mughenyakavale@gmail.com') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 border border-red-200 shadow-2xl max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-gray-900">Accès Administrateur Restreint</h2>
          <p className="text-xs text-gray-600 leading-relaxed">
            Ce panneau de contrôle est strictement réservé au Super Administrateur de Gomarché (<strong>Mughenyakavale@gmail.com</strong>). Tout accès non autorisé est bloqué.
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setIsAuthOpen(true)}
              className="w-full py-3 bg-[#E2001A] hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
            >
              S'authentifier comme Administrateur
            </button>
            <button
              type="button"
              onClick={() => setActiveView('home')}
              className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-colors"
            >
              Retour à la boutique
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminPassError('');
    setAdminPassMsg('');

    if (newAdminPass !== confirmAdminPass) {
      setAdminPassError('Les deux nouveaux mots de passe ne correspondent pas.');
      return;
    }

    const res = changeAdminPassword(oldAdminPass, newAdminPass);
    if (res.success) {
      setAdminPassMsg(res.message);
      setOldAdminPass('');
      setNewAdminPass('');
      setConfirmAdminPass('');
      showSaveSuccess();
    } else {
      setAdminPassError(res.message);
    }
  };

  const handleSaveGoogleClientId = () => {
    updateSiteConfig({ googleClientId: googleClientIdInput.trim() });
    showSaveSuccess();
  };

  return (
    <div className="min-h-screen bg-gray-100/70 pb-24">
      {saveToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 font-bold text-sm">
          <Check className="w-5 h-5 bg-white text-emerald-600 rounded-full p-0.5" />
          <span>Modifications enregistrées avec succès !</span>
        </div>
      )}

      {/* Admin Top Header Banner */}
      <div className="bg-[#161A1D] text-white border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center text-white shadow-lg border border-red-500">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                  Pannel d'Administration Gomarché Goma
                </h1>
                <span className="bg-red-600 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                  Propriétaire
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Contrôle total du supermarché : coordonnées, tarifs de livraison, rayons, API Mobile Money et catalogue
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveView('home')}
              className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold transition-colors flex items-center gap-2"
            >
              <Eye className="w-4 h-4 text-emerald-400" />
              <span>Voir la boutique</span>
            </button>
          </div>
        </div>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-1 overflow-x-auto no-scrollbar py-2">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 shrink-0 ${
              activeTab === 'overview' ? 'bg-red-50 text-[#E2001A]' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Vue Générale</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('store_info')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 shrink-0 ${
              activeTab === 'store_info' ? 'bg-red-50 text-[#E2001A]' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Coordonnées & Infos Goma</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('delivery_slots')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 shrink-0 ${
              activeTab === 'delivery_slots' ? 'bg-red-50 text-[#E2001A]' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Horaires & Prix Livraison (Express)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('branding')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 shrink-0 ${
              activeTab === 'branding' ? 'bg-red-50 text-[#E2001A]' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Palette className="w-4 h-4" />
            <span>Logo, Thème & PWA</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('currency')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 shrink-0 ${
              activeTab === 'currency' ? 'bg-red-50 text-[#E2001A]' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Taux de Change (USD / CDF)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('categories_agents')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 shrink-0 ${
              activeTab === 'categories_agents' ? 'bg-red-50 text-[#E2001A]' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Rayons & Agents Dédiés</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('products')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 shrink-0 ${
              activeTab === 'products' ? 'bg-red-50 text-[#E2001A]' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Catalogue Articles ({products.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('payment_apis')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 shrink-0 ${
              activeTab === 'payment_apis' ? 'bg-red-50 text-[#E2001A]' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>API Mobile Money</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 shrink-0 ${
              activeTab === 'orders' ? 'bg-red-50 text-[#E2001A]' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Commandes & Livreurs ({orders.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 shrink-0 ${
              activeTab === 'security' ? 'bg-red-50 text-[#E2001A]' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Lock className="w-4 h-4 text-red-600" />
            <span>Sécurité & Accès</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* ===================== TAB 1: OVERVIEW ===================== */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs">
                <span className="text-xs font-bold text-gray-500 uppercase">Chiffre d'Affaires</span>
                <p className="text-2xl font-black text-gray-900 mt-1">
                  {formatPrice(totalRevenueUsd, 'USD')}
                </p>
                <p className="text-xs font-semibold text-emerald-600 mt-0.5">
                  soit {totalRevenueCdf.toLocaleString('fr-FR')} FC
                </p>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs">
                <span className="text-xs font-bold text-gray-500 uppercase">Commandes Goma</span>
                <p className="text-2xl font-black text-gray-900 mt-1">{totalOrdersCount}</p>
                <p className="text-xs text-blue-600 font-semibold mt-0.5">
                  {pendingOrdersCount} en cours d'acheminement
                </p>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs">
                <span className="text-xs font-bold text-gray-500 uppercase">Rayons Actifs</span>
                <p className="text-2xl font-black text-gray-900 mt-1">{categories.length}</p>
                <p className="text-xs text-gray-500 mt-0.5">1 agent dédié par rayon</p>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs">
                <span className="text-xs font-bold text-gray-500 uppercase">Taux Dollar / Franc</span>
                <p className="text-2xl font-black text-[#E2001A] mt-1">
                  1 $ = {siteConfig.exchangeRateUsdToCdf.toLocaleString()} FC
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Ajustable dans l'onglet Devises</p>
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB 2: STORE INFO (ADRESSE, CONTACTS, HEURES) ===================== */}
        {activeTab === 'store_info' && (
          <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm space-y-6">
            <div>
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-[#E2001A]" />
                <h3 className="text-lg font-black text-gray-900">
                  Informations Générales & Coordonnées Gomarché Goma
                </h3>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                L'admin peut modifier l'adresse du supermarché, les numéros de contact, l'email officiel et les horaires.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Adresse de l'Entrepôt / Supermarché à Goma
                </label>
                <input
                  type="text"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-bold bg-white"
                  value={siteConfig.storeAddress}
                  onChange={(e) => updateSiteConfig({ storeAddress: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Ville d'exercice
                </label>
                <input
                  type="text"
                  disabled
                  value="Goma, Nord-Kivu, RDC"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold bg-gray-100 text-gray-700 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Numéros de Contact / Hotline Client (+243)
                </label>
                <input
                  type="text"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-bold bg-white"
                  value={siteConfig.storePhone}
                  onChange={(e) => updateSiteConfig({ storePhone: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Adresse Email Officielle du Support
                </label>
                <input
                  type="email"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-bold bg-white"
                  value={siteConfig.storeEmail}
                  onChange={(e) => updateSiteConfig({ storeEmail: e.target.value })}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Horaires d'Ouverture du Supermarché
                </label>
                <input
                  type="text"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-bold bg-white"
                  value={siteConfig.storeOpeningHours}
                  onChange={(e) => updateSiteConfig({ storeOpeningHours: e.target.value })}
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={showSaveSuccess}
                className="px-6 py-2.5 rounded-xl bg-gray-900 text-white font-bold text-xs shadow-md"
              >
                Enregistrer les coordonnées
              </button>
            </div>
          </div>
        )}

        {/* ===================== TAB 3: DELIVERY SLOTS & PRICING (EXPRESS) ===================== */}
        {activeTab === 'delivery_slots' && (
          <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm space-y-6">
            <div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-600" />
                <h3 className="text-lg font-black text-gray-900">
                  Gestion des Créneaux Horaires & Tarifs de Livraison (Goma)
                </h3>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                L'admin fixe le prix selon l'heure choisie pour la livraison. La livraison Express coûte plus cher et est ajustable ci-dessous :
              </p>
            </div>

            {/* Free delivery threshold */}
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-black text-emerald-950 block">
                  Seuil pour Livraison Offerte (USD)
                </span>
                <p className="text-xs text-emerald-700">
                  Au-delà de ce montant, les frais de livraison sont offerts au client.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  className="w-24 px-3 py-1.5 rounded-xl border border-emerald-300 bg-white font-bold text-sm text-gray-900"
                  value={siteConfig.freeDeliveryThresholdUsd}
                  onChange={(e) =>
                    updateSiteConfig({ freeDeliveryThresholdUsd: Number(e.target.value) })
                  }
                />
                <span className="text-xs font-bold text-emerald-950">$ USD</span>
              </div>
            </div>

            {/* List of slots editable */}
            <div className="space-y-3">
              {siteConfig.deliverySlots.map((slot) => (
                <div
                  key={slot.id}
                  className={`p-4 rounded-2xl border-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    slot.isExpress
                      ? 'border-red-300 bg-red-50/40'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${
                        slot.isExpress
                          ? 'bg-red-600 text-white'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {slot.isExpress ? <Zap className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-gray-900">{slot.label}</h4>
                      <p className="text-xs text-gray-500">{slot.timeRange}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-500">Tarif fixé :</span>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        className="w-20 px-2 py-1 text-xs border border-gray-300 rounded-lg font-bold text-gray-900 bg-white"
                        value={slot.priceUsd}
                        onChange={(e) =>
                          updateDeliverySlot(slot.id, { priceUsd: Number(e.target.value) })
                        }
                      />
                      <span className="text-xs font-bold text-gray-700">$</span>
                    </div>

                    <span className="text-xs font-semibold text-gray-500">
                      ({convertUsdToCdf(slot.priceUsd).toLocaleString('fr-FR')} FC)
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={showSaveSuccess}
                className="px-6 py-2.5 rounded-xl bg-gray-900 text-white font-bold text-xs shadow-md"
              >
                Sauvegarder la grille tarifaire
              </button>
            </div>
          </div>
        )}

        {/* ===================== TAB 4: BRANDING, LOGO & PWA ===================== */}
        {activeTab === 'branding' && (
          <div className="space-y-8">
            <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm space-y-6">
              <div>
                <h3 className="text-lg font-black text-gray-900">
                  Logo & Identité Visuelle Hypermarché
                </h3>
                <p className="text-xs text-gray-500">
                  Personnalisez l'emblème, les couleurs du moment et l'icône PWA mobile
                </p>
              </div>

              {/* Theme Palettes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {themePresets.map((preset) => {
                  const isCurrent = siteConfig.activeTheme === preset.id;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => {
                        updateSiteConfig({
                          activeTheme: preset.id,
                          primaryColor: preset.primary,
                          secondaryColor: preset.secondary,
                        });
                        showSaveSuccess();
                      }}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                        isCurrent
                          ? 'border-gray-900 ring-2 ring-gray-900 shadow-md bg-gray-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <div
                          className="w-6 h-6 rounded-full shadow-xs"
                          style={{ backgroundColor: preset.primary }}
                        />
                        <div
                          className="w-4 h-4 rounded-full shadow-xs"
                          style={{ backgroundColor: preset.secondary }}
                        />
                        {isCurrent && (
                          <span className="ml-auto text-[10px] font-black uppercase text-white bg-gray-900 px-2 py-0.5 rounded-full">
                            Actif
                          </span>
                        )}
                      </div>
                      <h4 className="font-black text-sm text-gray-900">{preset.name}</h4>
                      <p className="text-xs text-gray-500 mt-1 leading-snug">{preset.desc}</p>
                    </div>
                  );
                })}
              </div>

              {/* Logo customization */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-2">
                  <span className="text-xs font-bold text-gray-700 uppercase block">
                    URL du Logo Image Personnalisé (Optionnel)
                  </span>
                  <input
                    type="text"
                    placeholder="https://.../logo.png"
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl bg-white"
                    value={siteConfig.customLogoUrl || ''}
                    onChange={(e) => updateSiteConfig({ customLogoUrl: e.target.value })}
                  />
                  <p className="text-[11px] text-gray-500">
                    Laissez vide pour utiliser le logo Gomarché Goma agrandi officiel.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-2">
                  <span className="text-xs font-bold text-gray-700 uppercase block">
                    URL Icône PWA Mobile
                  </span>
                  <input
                    type="text"
                    placeholder="https://.../pwa-icon.png"
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl bg-white"
                    value={siteConfig.pwaIconUrl || ''}
                    onChange={(e) => updateSiteConfig({ pwaIconUrl: e.target.value })}
                  />
                  <p className="text-[11px] text-gray-500">
                    Icône installée sur les écrans d'accueil smartphones à Goma.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB 5: CURRENCY & EXCHANGE RATE ===================== */}
        {activeTab === 'currency' && (
          <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm space-y-6">
            <div>
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                <h3 className="text-lg font-black text-gray-900">
                  Configuration du Taux de Change Goma (USD / CDF)
                </h3>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Ajustez le taux de conversion officiel entre le Dollar ($) et le Franc Congolais (FC) :
              </p>
            </div>

            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 max-w-xl">
              <label className="block text-xs font-bold text-gray-700 uppercase mb-2">
                Taux Officiel : 1 USD ($) = Francs Congolais (CDF / FC)
              </label>
              <div className="flex items-center gap-3">
                <span className="text-base font-black text-gray-900">1 USD =</span>
                <input
                  type="number"
                  step="10"
                  min="1000"
                  max="5000"
                  className="w-40 px-4 py-2.5 rounded-xl border-2 border-emerald-500 font-mono font-bold text-lg bg-white text-gray-900 focus:outline-hidden"
                  value={siteConfig.exchangeRateUsdToCdf}
                  onChange={(e) => updateSiteConfig({ exchangeRateUsdToCdf: Number(e.target.value) })}
                />
                <span className="text-base font-black text-gray-900">FC</span>
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB 6: CATEGORIES & ASSIGNED AGENTS ===================== */}
        {activeTab === 'categories_agents' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-gray-900">
                  Rayons & Attribution d'un Agent par Catégorie
                </h3>
                <p className="text-xs text-gray-500">
                  Chaque rayon dispose de son agent dédié pour gérer les stocks et prix
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setEditingCategory(null);
                  setNewCatName('');
                  setNewCatDesc('');
                  setNewCatImage('');
                  setNewCatAgentName('');
                  setNewCatAgentEmail('');
                  setNewCatIsPromo(false);
                  setIsCatModalOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-gray-900 hover:bg-black text-white font-bold text-xs flex items-center gap-2 self-start sm:self-auto shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span>Nouveau rayon</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start gap-3 mb-3">
                      <img
                        src={cat.image}
                        alt={cat.name}
                        className="w-14 h-14 rounded-xl object-cover border border-gray-200 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-sm text-gray-900 truncate">{cat.name}</h4>
                          {cat.isPromoCategory && (
                            <span className="text-[9px] font-black uppercase bg-red-100 text-red-600 px-1.5 py-0.5 rounded">
                              Promo
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-500 line-clamp-2 mt-0.5">
                          {cat.description}
                        </p>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-100">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block mb-0.5">
                        Agent Responsable :
                      </span>
                      <p className="text-xs font-black text-emerald-950">
                        {cat.assignedAgentName || 'Agent Gomarché'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCategory(cat);
                        setNewCatName(cat.name);
                        setNewCatDesc(cat.description);
                        setNewCatImage(cat.image);
                        setNewCatAgentName(cat.assignedAgentName || '');
                        setNewCatAgentEmail(cat.assignedAgentEmail || '');
                        setNewCatIsPromo(!!cat.isPromoCategory);
                        setIsCatModalOpen(true);
                      }}
                      className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg text-xs font-bold flex items-center gap-1"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Modifier</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===================== TAB 7: PRODUCT CATALOG ===================== */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-gray-900">
                  Catalogue Produits Hypermarché
                </h3>
                <p className="text-xs text-gray-500">
                  Gestion centralisée de l'ensemble des articles
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setEditingProduct(null);
                  setNewProdName('');
                  setNewProdCategory(categories[0]?.id || '');
                  setNewProdBrand('Gomarché Sélection');
                  setNewProdDesc('');
                  setNewProdPriceUsd(4.5);
                  setNewProdDiscount(0);
                  setNewProdUnit('l’unité');
                  setNewProdImage('');
                  setNewProdStock(50);
                  setNewProdIsPromo(false);
                  setIsProdModalOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-gray-900 hover:bg-black text-white font-bold text-xs flex items-center gap-2 shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span>Ajouter un article</span>
              </button>
            </div>

            <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase font-bold text-[10px]">
                    <tr>
                      <th className="p-3.5">Produit</th>
                      <th className="p-3.5">Prix USD</th>
                      <th className="p-3.5">Prix CDF</th>
                      <th className="p-3.5">Remise</th>
                      <th className="p-3.5">Stock</th>
                      <th className="p-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {products.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50/70">
                        <td className="p-3.5 flex items-center gap-2.5">
                          <img
                            src={p.image}
                            alt={p.name}
                            className="w-10 h-10 object-contain rounded-lg bg-gray-50 p-1 border border-gray-200 shrink-0"
                          />
                          <div>
                            <span className="font-bold text-gray-900 block truncate max-w-[200px]">
                              {p.name}
                            </span>
                            <span className="text-[10px] text-gray-400 font-semibold">
                              {p.brand} • {p.unit}
                            </span>
                          </div>
                        </td>
                        <td className="p-3.5 font-bold text-gray-900">${p.priceUsd.toFixed(2)}</td>
                        <td className="p-3.5 font-semibold text-gray-700">
                          {convertUsdToCdf(p.priceUsd).toLocaleString('fr-FR')} FC
                        </td>
                        <td className="p-3.5">
                          {p.discountPercent ? (
                            <span className="bg-red-100 text-red-700 font-black px-2 py-0.5 rounded text-[10px]">
                              -{p.discountPercent}%
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="p-3.5 font-bold text-emerald-700">
                          {p.stockCount} en stock
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingProduct(p);
                              setNewProdName(p.name);
                              setNewProdCategory(p.categoryId);
                              setNewProdBrand(p.brand);
                              setNewProdDesc(p.description);
                              setNewProdPriceUsd(p.priceUsd);
                              setNewProdDiscount(p.discountPercent || 0);
                              setNewProdUnit(p.unit);
                              setNewProdImage(p.image);
                              setNewProdStock(p.stockCount);
                              setNewProdIsPromo(!!p.isPromo);
                              setIsProdModalOpen(true);
                            }}
                            className="p-1 text-gray-600 hover:text-gray-900 rounded"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB 8: PAYMENT APIS ===================== */}
        {activeTab === 'payment_apis' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-black text-gray-900">
                Passerelles & API Mobile Money (Goma)
              </h3>
              <p className="text-xs text-gray-500">
                Configuration des clés d'intégration pour validation instantanée automatique
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Airtel */}
              <div className="bg-white rounded-3xl p-5 border border-gray-200 space-y-3">
                <div className="flex items-center justify-between">
                  <AirtelMoneyLogo size="md" />
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                    Opérationnel
                  </span>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    Merchant ID Airtel Goma
                  </label>
                  <input
                    type="text"
                    className="w-full text-xs font-mono border border-gray-300 rounded-xl p-2 bg-gray-50"
                    value={siteConfig.paymentGateways.airtel.merchantId}
                    onChange={(e) => updatePaymentGateway('airtel', { merchantId: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    API Key
                  </label>
                  <input
                    type="text"
                    className="w-full text-xs font-mono border border-gray-300 rounded-xl p-2 bg-gray-50"
                    value={siteConfig.paymentGateways.airtel.apiKey}
                    onChange={(e) => updatePaymentGateway('airtel', { apiKey: e.target.value })}
                  />
                </div>
              </div>

              {/* M-Pesa */}
              <div className="bg-white rounded-3xl p-5 border border-gray-200 space-y-3">
                <div className="flex items-center justify-between">
                  <MpesaLogo size="md" />
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                    Opérationnel
                  </span>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    Shortcode Till M-Pesa Goma
                  </label>
                  <input
                    type="text"
                    className="w-full text-xs font-mono border border-gray-300 rounded-xl p-2 bg-gray-50"
                    value={siteConfig.paymentGateways.mpesa.merchantId}
                    onChange={(e) => updatePaymentGateway('mpesa', { merchantId: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    Passkey
                  </label>
                  <input
                    type="password"
                    className="w-full text-xs font-mono border border-gray-300 rounded-xl p-2 bg-gray-50"
                    value={siteConfig.paymentGateways.mpesa.passKey}
                    onChange={(e) => updatePaymentGateway('mpesa', { passKey: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB 9: ORDERS & DRIVERS ===================== */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <h3 className="text-lg font-black text-gray-900">
              Commandes & Suivi des Livraisons à Goma
            </h3>

            <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase font-bold text-[10px]">
                    <tr>
                      <th className="p-3.5">N° Commande</th>
                      <th className="p-3.5">Client & Quartier</th>
                      <th className="p-3.5">Total ($ / FC)</th>
                      <th className="p-3.5">Code Secret</th>
                      <th className="p-3.5">Statut</th>
                      <th className="p-3.5">Livreur Goma</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {orders.map((o) => (
                      <tr key={o.id} className="hover:bg-gray-50/70">
                        <td className="p-3.5 font-bold font-mono text-gray-900">{o.orderNumber}</td>
                        <td className="p-3.5">
                          <p className="font-bold text-gray-900">{o.customer.name}</p>
                          <p className="text-[10px] text-emerald-700 font-semibold">
                            Quartier {o.customer.quartierGoma}
                          </p>
                        </td>
                        <td className="p-3.5 font-bold text-gray-900">${o.totalUsd.toFixed(2)}</td>
                        <td className="p-3.5">
                          <span className="font-mono font-bold bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded">
                            {o.confirmationCode}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              o.status === 'delivered'
                                ? 'bg-emerald-100 text-emerald-800'
                                : o.status === 'cancelled'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {o.status === 'delivered' && 'Validé par code'}
                            {o.status === 'in_delivery' && 'En cours'}
                            {o.status === 'cancelled' && 'Annulé'}
                            {o.status === 'paid' && 'Payé'}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <select
                            aria-label="Assigner un livreur"
                            className="text-xs border border-gray-300 rounded-lg p-1 bg-white"
                            value={o.deliveryDriverId || ''}
                            onChange={(e) => assignDriverToOrder(o.id, e.target.value)}
                          >
                            <option value="">Sélectionner...</option>
                            {deliveryDrivers.map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.name}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB 10: SÉCURITÉ & ACCÈS ===================== */}
        {activeTab === 'security' && (
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-black text-gray-900">
                Sécurité & Contrôle d'Accès Gomarché
              </h3>
              <p className="text-xs text-gray-500">
                Gestion des identifiants Super Administrateur, intégration Google OAuth et comptes du personnel.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Box 1: Change Admin Password */}
              <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-xs space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">Mot de Passe Super Administrateur</h4>
                    <p className="text-xs text-gray-500">Compte : Mughenyakavale@gmail.com</p>
                  </div>
                </div>

                {adminPassError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                    <span>{adminPassError}</span>
                  </div>
                )}

                {adminPassMsg && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2">
                    <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>{adminPassMsg}</span>
                  </div>
                )}

                <form onSubmit={handleChangePassword} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Mot de passe actuel *
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="Mot de passe actuel (par défaut : admin)"
                      value={oldAdminPass}
                      onChange={(e) => setOldAdminPass(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs focus:outline-hidden focus:border-red-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Nouveau mot de passe *
                    </label>
                    <input
                      type="password"
                      required
                      minLength={4}
                      placeholder="Minimum 4 caractères"
                      value={newAdminPass}
                      onChange={(e) => setNewAdminPass(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs focus:outline-hidden focus:border-red-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Confirmer le nouveau mot de passe *
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="Confirmez le nouveau mot de passe"
                      value={confirmAdminPass}
                      onChange={(e) => setConfirmAdminPass(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs focus:outline-hidden focus:border-red-600"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>Mettre à jour mon mot de passe Admin</span>
                  </button>
                </form>
              </div>

              {/* Box 2: Google Sign-In & OAuth Config */}
              <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-xs space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
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
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">Intégration Google Sign-In & OAuth</h4>
                    <p className="text-xs text-gray-500">Google Identity Services (GSI)</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Client ID Google Cloud (Optionnel)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 636481156388-...apps.googleusercontent.com"
                      value={googleClientIdInput}
                      onChange={(e) => setGoogleClientIdInput(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-mono focus:outline-hidden focus:border-blue-600"
                    />
                    <p className="text-[11px] text-gray-400 mt-1">
                      Si configuré, le bouton One-Tap officiel Google Identity Services sera activé. Sinon, le module de connexion Google interactive intégré assure la synchronisation.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveGoogleClientId}
                    className="w-full py-2.5 bg-gray-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4 text-emerald-400" />
                    <span>Sauvegarder la configuration Google</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Box 3: Supermarket Staff Directory & Passwords */}
            <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-gray-900">Répertoire du Personnel & Rôles Employés</h4>
                  <p className="text-xs text-gray-500">
                    Ces collaborateurs ont un accès restreint selon leur fonction (Rayon ou Livraison).
                  </p>
                </div>
                <span className="text-xs font-bold bg-blue-50 text-blue-700 px-3 py-1 rounded-full border border-blue-200">
                  {users.filter((u) => u.role !== 'customer').length} Employés habilités
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                    <tr>
                      <th className="p-3">Employé</th>
                      <th className="p-3">Email de connexion</th>
                      <th className="p-3">Rôle</th>
                      <th className="p-3">Affectation</th>
                      <th className="p-3">Mot de passe</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {users
                      .filter((u) => u.role !== 'customer')
                      .map((staff) => (
                        <tr key={staff.id} className="hover:bg-gray-50/50">
                          <td className="p-3 font-bold text-gray-900">{staff.name}</td>
                          <td className="p-3 font-mono text-gray-700">{staff.email}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              staff.role === 'admin'
                                ? 'bg-red-100 text-red-800'
                                : staff.role === 'category_agent'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {staff.role === 'admin'
                                ? '👑 Super Admin'
                                : staff.role === 'category_agent'
                                ? '🏷️ Agent de Rayon'
                                : '🛵 Livreur Goma'}
                            </span>
                          </td>
                          <td className="p-3 text-gray-600">
                            {staff.assignedCategoryId
                              ? categories.find((c) => c.id === staff.assignedCategoryId)?.name || 'Rayon affecté'
                              : staff.role === 'delivery_driver'
                              ? 'Flotte Moto Goma'
                              : 'Direction Générale'}
                          </td>
                          <td className="p-3 font-mono text-gray-500">
                            {staff.role === 'admin' ? '•••••••• (Protégé)' : staff.password || 'Défini'}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {isCatModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-black text-gray-900">
              {editingCategory ? 'Modifier le Rayon' : 'Créer un Rayon'}
            </h3>
            <form onSubmit={handleSaveCategory} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nom du Rayon *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Épicerie & Boissons"
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  placeholder="Produits du terroir, frais..."
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl"
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                />
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <span className="text-xs font-bold text-emerald-900 block mb-1">
                  Agent dédié à ce rayon :
                </span>
                <input
                  type="text"
                  placeholder="Nom de l'agent"
                  className="w-full px-3 py-1.5 text-xs border border-emerald-300 rounded-lg bg-white"
                  value={newCatAgentName}
                  onChange={(e) => setNewCatAgentName(e.target.value)}
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCatModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-[#E2001A] text-white rounded-xl shadow-md"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Product Modal */}
      {isProdModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-black text-gray-900">
              {editingProduct ? 'Modifier l’Article' : 'Ajouter un Article'}
            </h3>
            <form onSubmit={handleSaveProduct} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nom *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Riz Parfumé 25kg"
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl"
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Prix ($ USD)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl font-bold"
                    value={newProdPriceUsd}
                    onChange={(e) => setNewProdPriceUsd(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Remise (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="90"
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl font-bold text-red-600"
                    value={newProdDiscount}
                    onChange={(e) => setNewProdDiscount(Number(e.target.value))}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Conditionnement / Unité</label>
                <input
                  type="text"
                  placeholder="Ex: sac 25kg, bidon 5L"
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl"
                  value={newProdUnit}
                  onChange={(e) => setNewProdUnit(e.target.value)}
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsProdModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-[#E2001A] text-white rounded-xl shadow-md"
                >
                  Valider
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
