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
  Database,
  ExternalLink,
  RefreshCw,
  Copy,
  CheckCircle2,
  Upload,
  Image as ImageIcon,
  Loader2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Category, Product, SiteConfig, User, Role, OrderStatus, ThemeStyle, DeliverySlotConfig } from '../types';
import { AirtelMoneyLogo, OrangeMoneyLogo, MpesaLogo, AfriMoneyLogo } from './MobileMoneyLogos';
import { uploadImageFile } from '../services/imageUpload';
import {
  getActiveFirebaseConfig,
  updateFirebaseConfig,
  resetFirebaseConfig,
  isUsingCustomFirebaseConfig,
  FirebaseAppConfig,
} from '../services/firebaseAuth';

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

  // Firebase Gomarché configuration state
  const initialFbConfig = getActiveFirebaseConfig();
  const [fbProjectId, setFbProjectId] = useState(initialFbConfig.projectId || '');
  const [fbApiKey, setFbApiKey] = useState(initialFbConfig.apiKey || '');
  const [fbAuthDomain, setFbAuthDomain] = useState(initialFbConfig.authDomain || '');
  const [fbAppId, setFbAppId] = useState(initialFbConfig.appId || '');
  const [fbStorageBucket, setFbStorageBucket] = useState(initialFbConfig.storageBucket || '');
  const [fbRawConfig, setFbRawConfig] = useState('');
  const [fbSuccessMsg, setFbSuccessMsg] = useState('');
  const [fbErrorMsg, setFbErrorMsg] = useState('');
  const [isCustomFb, setIsCustomFb] = useState(isUsingCustomFirebaseConfig());
  const [copiedDomainAdmin, setCopiedDomainAdmin] = useState<string | null>(null);

  const handleCopyDomainAdmin = (val: string) => {
    try {
      navigator.clipboard.writeText(val);
      setCopiedDomainAdmin(val);
      setTimeout(() => setCopiedDomainAdmin(null), 2500);
    } catch {
      // Fallback
    }
  };

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
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingPwaIcon, setIsUploadingPwaIcon] = useState(false);
  const [isUploadingProdImage, setIsUploadingProdImage] = useState(false);

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

  // Parse pasted raw Firebase config snippet
  const handleParseRawFirebase = (raw: string) => {
    setFbRawConfig(raw);
    setFbErrorMsg('');
    setFbSuccessMsg('');

    try {
      const extract = (key: string) => {
        const m = raw.match(new RegExp(`["']?${key}["']?\\s*:\\s*["']([^"']+)["']`));
        return m ? m[1].trim() : '';
      };

      const extractedApiKey = extract('apiKey');
      const extractedAuthDomain = extract('authDomain');
      const extractedProjectId = extract('projectId');
      const extractedStorageBucket = extract('storageBucket');
      const extractedAppId = extract('appId');

      if (extractedProjectId) setFbProjectId(extractedProjectId);
      if (extractedApiKey) setFbApiKey(extractedApiKey);
      if (extractedAuthDomain) setFbAuthDomain(extractedAuthDomain);
      if (extractedStorageBucket) setFbStorageBucket(extractedStorageBucket);
      if (extractedAppId) setFbAppId(extractedAppId);

      if (extractedProjectId || extractedApiKey) {
        setFbSuccessMsg('Informations extraites automatiquement avec succès ! Vérifiez et cliquez sur "Connecter le projet Gomarché" ci-dessous.');
      }
    } catch {
      // ignore
    }
  };

  const handleSaveFirebaseConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setFbErrorMsg('');
    setFbSuccessMsg('');

    if (!fbProjectId.trim() || !fbApiKey.trim()) {
      setFbErrorMsg('Le Project ID et la Clé API Firebase sont obligatoires.');
      return;
    }

    try {
      const newConfig: FirebaseAppConfig = {
        projectId: fbProjectId.trim(),
        apiKey: fbApiKey.trim(),
        authDomain: fbAuthDomain.trim() || `${fbProjectId.trim()}.firebaseapp.com`,
        storageBucket: fbStorageBucket.trim() || `${fbProjectId.trim()}.firebasestorage.app`,
        appId: fbAppId.trim() || `1:635390144818:web:${fbProjectId.trim()}`,
      };

      await updateFirebaseConfig(newConfig);
      setIsCustomFb(true);
      setFbSuccessMsg(`Projet Firebase "${fbProjectId.trim()}" appliqué avec succès ! La connexion Google utilisera désormais ce projet.`);
      showSaveSuccess();
    } catch (err: any) {
      setFbErrorMsg(err.message || 'Erreur lors de la mise à jour de la configuration Firebase.');
    }
  };

  const handleResetFirebaseConfig = async () => {
    try {
      await resetFirebaseConfig();
      const def = getActiveFirebaseConfig();
      setFbProjectId(def.projectId || '');
      setFbApiKey(def.apiKey || '');
      setFbAuthDomain(def.authDomain || '');
      setFbAppId(def.appId || '');
      setFbStorageBucket(def.storageBucket || '');
      setFbRawConfig('');
      setIsCustomFb(false);
      setFbSuccessMsg('Configuration réinitialisée vers le projet par défaut.');
      showSaveSuccess();
    } catch (err: any) {
      setFbErrorMsg(err.message || 'Impossible de réinitialiser.');
    }
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
            {siteConfig.customLogoUrl ? (
              <img
                src={siteConfig.customLogoUrl}
                alt={siteConfig.siteName}
                className="h-12 max-w-[140px] object-contain rounded-2xl bg-white/10 p-1 border border-white/10 shadow-lg"
              />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center text-white shadow-lg border border-red-500">
                <ShieldCheck className="w-6 h-6" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                  Pannel d'Administration <span translate="no" className="notranslate">Gomarché</span> Goma
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
                  Logo & Identité Visuelle Supermarché
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

              {/* Logo & App Icon customization */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
                {/* 1. Site Logo */}
                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-800 uppercase block">
                      Logo Officiel du Supermarché
                    </span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Synchronisé tous appareils
                    </span>
                  </div>

                  {/* Preview */}
                  <div className="p-3 bg-white rounded-xl border border-gray-200 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {siteConfig.customLogoUrl ? (
                        <img
                          src={siteConfig.customLogoUrl}
                          alt="Logo actuel"
                          className="h-12 max-w-[140px] object-contain rounded-lg border border-gray-100 p-1"
                        />
                      ) : (
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-2xl shadow-sm shrink-0"
                          style={{ backgroundColor: siteConfig.primaryColor || '#E2001A' }}
                        >
                          G
                        </div>
                      )}
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-gray-900 block truncate">
                          {siteConfig.customLogoUrl ? 'Logo personnalisé actif' : 'Logo Gomarché par défaut'}
                        </span>
                        <span className="text-[10px] text-gray-500 block truncate">
                          Visible sur Header, Drawer, Footer & Reçus
                        </span>
                      </div>
                    </div>

                    {siteConfig.customLogoUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          updateSiteConfig({ customLogoUrl: '' });
                          showSaveSuccess();
                        }}
                        className="text-[11px] text-red-600 hover:text-red-800 font-bold px-2 py-1 rounded bg-red-50 hover:bg-red-100 transition-colors shrink-0"
                      >
                        Réinitialiser
                      </button>
                    )}
                  </div>

                  {/* Upload file or URL */}
                  <div className="space-y-2">
                    <label className="block text-[11px] font-semibold text-gray-700">
                      Uploader une photo / logo depuis vos fichiers :
                    </label>
                    <label className="flex items-center justify-center gap-2 w-full py-2.5 px-3 bg-white border border-dashed border-gray-300 hover:border-gray-400 rounded-xl cursor-pointer text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors shadow-xs">
                      {isUploadingLogo ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                          <span>Téléversement sur le serveur...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 text-emerald-600" />
                          <span>Parcourir mes photos (PNG, JPG, SVG, WebP)</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        disabled={isUploadingLogo}
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setIsUploadingLogo(true);
                          try {
                            const url = await uploadImageFile(file, 'logo_gomarche');
                            if (url) {
                              updateSiteConfig({ customLogoUrl: url });
                              showSaveSuccess();
                            }
                          } finally {
                            setIsUploadingLogo(false);
                          }
                        }}
                      />
                    </label>

                    <div className="pt-1">
                      <span className="text-[10px] font-semibold text-gray-500 block mb-1">
                        Ou saisir un lien URL web alternatif :
                      </span>
                      <input
                        type="text"
                        placeholder="https://.../logo.png"
                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl bg-white"
                        value={siteConfig.customLogoUrl || ''}
                        onChange={(e) => updateSiteConfig({ customLogoUrl: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* 2. PWA App Icon */}
                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-800 uppercase block">
                      Icône Application Mobile (PWA & Écran d'accueil)
                    </span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Smartphone className="w-3 h-3" /> Android & iPhone
                    </span>
                  </div>

                  {/* Preview */}
                  <div className="p-3 bg-white rounded-xl border border-gray-200 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {siteConfig.pwaIconUrl ? (
                        <img
                          src={siteConfig.pwaIconUrl}
                          alt="Icône PWA"
                          className="w-12 h-12 rounded-2xl object-cover border border-gray-100 p-0.5 shadow-xs"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-2xl bg-[#E2001A] text-white flex items-center justify-center font-black text-xl shadow-xs">
                          GM
                        </div>
                      )}
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-gray-900 block truncate">
                          {siteConfig.pwaIconUrl ? 'Icône PWA personnalisée' : 'Icône PWA par défaut'}
                        </span>
                        <span className="text-[10px] text-gray-500 block truncate">
                          Installée sur l'écran d'accueil smartphones à Goma
                        </span>
                      </div>
                    </div>

                    {siteConfig.pwaIconUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          updateSiteConfig({ pwaIconUrl: '' });
                          showSaveSuccess();
                        }}
                        className="text-[11px] text-red-600 hover:text-red-800 font-bold px-2 py-1 rounded bg-red-50 hover:bg-red-100 transition-colors shrink-0"
                      >
                        Réinitialiser
                      </button>
                    )}
                  </div>

                  {/* Upload file or URL */}
                  <div className="space-y-2">
                    <label className="block text-[11px] font-semibold text-gray-700">
                      Uploader l'icône de l'application depuis cet appareil :
                    </label>
                    <label className="flex items-center justify-center gap-2 w-full py-2.5 px-3 bg-white border border-dashed border-gray-300 hover:border-gray-400 rounded-xl cursor-pointer text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors shadow-xs">
                      {isUploadingPwaIcon ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                          <span>Téléversement en cours...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 text-emerald-600" />
                          <span>Parcourir une image (carrée 512x512 recommandée)</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        disabled={isUploadingPwaIcon}
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setIsUploadingPwaIcon(true);
                          try {
                            const url = await uploadImageFile(file, 'pwa_icon');
                            if (url) {
                              updateSiteConfig({ pwaIconUrl: url });
                              showSaveSuccess();
                            }
                          } finally {
                            setIsUploadingPwaIcon(false);
                          }
                        }}
                      />
                    </label>

                    <div className="pt-1">
                      <span className="text-[10px] font-semibold text-gray-500 block mb-1">
                        Ou saisir un lien URL web alternatif :
                      </span>
                      <input
                        type="text"
                        placeholder="https://.../pwa-icon.png"
                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl bg-white"
                        value={siteConfig.pwaIconUrl || ''}
                        onChange={(e) => updateSiteConfig({ pwaIconUrl: e.target.value })}
                      />
                    </div>
                  </div>
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
                  Catalogue Produits Supermarché
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-3xl border border-gray-200">
              <div>
                <h3 className="text-lg font-black text-gray-900">
                  Passerelles & Opérateurs Mobile Money (Goma)
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Configurez les 4 opérateurs RDC (Airtel, Vodacom, Orange, AfriMoney), modifiez leurs logos, et ajustez leurs identifiants marchands.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  4 Opérateurs Supportés
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* OPERATOR 1: AIRTEL MONEY */}
              {(() => {
                const gateway = siteConfig.paymentGateways?.airtel || {
                  merchantId: 'AIRTEL_GOMARCHE_GOMA',
                  apiKey: '',
                  secretKey: '',
                  webhookUrl: '',
                  enabled: true,
                  sandboxMode: false,
                  phonePrefix: '097, 099, 098',
                  customLogoUrl: '',
                  displayName: 'Airtel Money RDC',
                  instructions: 'Validation instantanée par push USSD sur votre téléphone',
                };

                const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const url = await uploadImageFile(file, 'airtel_logo');
                    if (url) {
                      updatePaymentGateway('airtel', { customLogoUrl: url });
                      showSaveSuccess();
                    }
                  }
                };

                return (
                  <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-xs space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                      <div className="flex items-center gap-3">
                        <AirtelMoneyLogo size="md" customLogoUrl={gateway.customLogoUrl} />
                        <div>
                          <h4 className="text-sm font-black text-gray-900">{gateway.displayName || 'Airtel Money'}</h4>
                          <span className="text-[10px] text-gray-500 font-mono">Préfixes : {gateway.phonePrefix || '097, 099, 098'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updatePaymentGateway('airtel', { enabled: !gateway.enabled })}
                          className={`text-xs font-bold px-3 py-1 rounded-full transition-colors cursor-pointer ${
                            gateway.enabled
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-gray-100 text-gray-600 border border-gray-200'
                          }`}
                        >
                          {gateway.enabled ? '✓ Activé' : 'Désactivé'}
                        </button>
                      </div>
                    </div>

                    {/* Logo Customizer */}
                    <div className="bg-gray-50/80 p-3.5 rounded-2xl border border-gray-200 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black text-gray-700 flex items-center gap-1.5">
                          <ImageIcon className="w-3.5 h-3.5 text-red-600" />
                          <span>Logo Airtel Money</span>
                        </label>
                        {gateway.customLogoUrl && (
                          <button
                            type="button"
                            onClick={() => updatePaymentGateway('airtel', { customLogoUrl: '' })}
                            className="text-[11px] font-bold text-red-600 hover:underline"
                          >
                            Rétablir le logo officiel
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                            URL de l'image du logo
                          </label>
                          <input
                            type="text"
                            placeholder="https://.../logo.png"
                            className="w-full text-xs border border-gray-300 rounded-xl p-2 bg-white focus:outline-hidden focus:border-red-500"
                            value={gateway.customLogoUrl || ''}
                            onChange={(e) => updatePaymentGateway('airtel', { customLogoUrl: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                            Ou importer une image
                          </label>
                          <label className="flex items-center justify-center gap-1.5 w-full py-2 px-3 border border-dashed border-gray-300 rounded-xl text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 cursor-pointer transition-colors">
                            <Upload className="w-3.5 h-3.5 text-gray-500" />
                            <span>Choisir un fichier</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleLogoUpload}
                            />
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Form Fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">
                          Nom affiché
                        </label>
                        <input
                          type="text"
                          className="w-full border border-gray-300 rounded-xl p-2 bg-gray-50/50"
                          value={gateway.displayName || 'Airtel Money RDC'}
                          onChange={(e) => updatePaymentGateway('airtel', { displayName: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">
                          Merchant ID / Compte Goma
                        </label>
                        <input
                          type="text"
                          className="w-full font-mono border border-gray-300 rounded-xl p-2 bg-gray-50/50"
                          value={gateway.merchantId || ''}
                          onChange={(e) => updatePaymentGateway('airtel', { merchantId: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">
                          Clé API (Live)
                        </label>
                        <input
                          type="text"
                          className="w-full font-mono border border-gray-300 rounded-xl p-2 bg-gray-50/50"
                          value={gateway.apiKey || ''}
                          onChange={(e) => updatePaymentGateway('airtel', { apiKey: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">
                          Clé Secrète
                        </label>
                        <input
                          type="password"
                          className="w-full font-mono border border-gray-300 rounded-xl p-2 bg-gray-50/50"
                          value={gateway.secretKey || ''}
                          onChange={(e) => updatePaymentGateway('airtel', { secretKey: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* OPERATOR 2: VODACOM M-PESA */}
              {(() => {
                const gateway = siteConfig.paymentGateways?.mpesa || {
                  merchantId: 'VODA_MPESA_GOMA_883011',
                  apiKey: '',
                  passKey: '',
                  webhookUrl: '',
                  enabled: true,
                  sandboxMode: false,
                  phonePrefix: '081, 082, 083',
                  customLogoUrl: '',
                  displayName: 'Vodacom M-Pesa',
                  instructions: 'Paiement sécurisé instantané avec confirmation PIN M-Pesa',
                };

                const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const url = await uploadImageFile(file, 'mpesa_logo');
                    if (url) {
                      updatePaymentGateway('mpesa', { customLogoUrl: url });
                      showSaveSuccess();
                    }
                  }
                };

                return (
                  <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-xs space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                      <div className="flex items-center gap-3">
                        <MpesaLogo size="md" customLogoUrl={gateway.customLogoUrl} />
                        <div>
                          <h4 className="text-sm font-black text-gray-900">{gateway.displayName || 'Vodacom M-Pesa'}</h4>
                          <span className="text-[10px] text-gray-500 font-mono">Préfixes : {gateway.phonePrefix || '081, 082, 083'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updatePaymentGateway('mpesa', { enabled: !gateway.enabled })}
                          className={`text-xs font-bold px-3 py-1 rounded-full transition-colors cursor-pointer ${
                            gateway.enabled
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-gray-100 text-gray-600 border border-gray-200'
                          }`}
                        >
                          {gateway.enabled ? '✓ Activé' : 'Désactivé'}
                        </button>
                      </div>
                    </div>

                    {/* Logo Customizer */}
                    <div className="bg-gray-50/80 p-3.5 rounded-2xl border border-gray-200 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black text-gray-700 flex items-center gap-1.5">
                          <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Logo Vodacom M-Pesa</span>
                        </label>
                        {gateway.customLogoUrl && (
                          <button
                            type="button"
                            onClick={() => updatePaymentGateway('mpesa', { customLogoUrl: '' })}
                            className="text-[11px] font-bold text-red-600 hover:underline"
                          >
                            Rétablir le logo officiel
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                            URL de l'image du logo
                          </label>
                          <input
                            type="text"
                            placeholder="https://.../logo.png"
                            className="w-full text-xs border border-gray-300 rounded-xl p-2 bg-white focus:outline-hidden focus:border-emerald-500"
                            value={gateway.customLogoUrl || ''}
                            onChange={(e) => updatePaymentGateway('mpesa', { customLogoUrl: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                            Ou importer une image
                          </label>
                          <label className="flex items-center justify-center gap-1.5 w-full py-2 px-3 border border-dashed border-gray-300 rounded-xl text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 cursor-pointer transition-colors">
                            <Upload className="w-3.5 h-3.5 text-gray-500" />
                            <span>Choisir un fichier</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleLogoUpload}
                            />
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Form Fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">
                          Nom affiché
                        </label>
                        <input
                          type="text"
                          className="w-full border border-gray-300 rounded-xl p-2 bg-gray-50/50"
                          value={gateway.displayName || 'Vodacom M-Pesa'}
                          onChange={(e) => updatePaymentGateway('mpesa', { displayName: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">
                          Shortcode Till / Merchant ID Goma
                        </label>
                        <input
                          type="text"
                          className="w-full font-mono border border-gray-300 rounded-xl p-2 bg-gray-50/50"
                          value={gateway.merchantId || ''}
                          onChange={(e) => updatePaymentGateway('mpesa', { merchantId: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">
                          Clé API / App Key
                        </label>
                        <input
                          type="text"
                          className="w-full font-mono border border-gray-300 rounded-xl p-2 bg-gray-50/50"
                          value={gateway.apiKey || ''}
                          onChange={(e) => updatePaymentGateway('mpesa', { apiKey: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">
                          Passkey M-Pesa
                        </label>
                        <input
                          type="password"
                          className="w-full font-mono border border-gray-300 rounded-xl p-2 bg-gray-50/50"
                          value={gateway.passKey || ''}
                          onChange={(e) => updatePaymentGateway('mpesa', { passKey: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* OPERATOR 3: ORANGE MONEY */}
              {(() => {
                const gateway = siteConfig.paymentGateways?.orange || {
                  merchantId: 'OM_GOMARCHE_GOMA_001',
                  apiKey: '',
                  secretKey: '',
                  webhookUrl: '',
                  enabled: true,
                  sandboxMode: false,
                  phonePrefix: '084, 085, 089',
                  customLogoUrl: '',
                  displayName: 'Orange Money RDC',
                  instructions: 'Validation immédiate par notification Orange Money',
                };

                const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const url = await uploadImageFile(file, 'orange_logo');
                    if (url) {
                      updatePaymentGateway('orange', { customLogoUrl: url });
                      showSaveSuccess();
                    }
                  }
                };

                return (
                  <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-xs space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                      <div className="flex items-center gap-3">
                        <OrangeMoneyLogo size="md" customLogoUrl={gateway.customLogoUrl} />
                        <div>
                          <h4 className="text-sm font-black text-gray-900">{gateway.displayName || 'Orange Money'}</h4>
                          <span className="text-[10px] text-gray-500 font-mono">Préfixes : {gateway.phonePrefix || '084, 085, 089'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updatePaymentGateway('orange', { enabled: !gateway.enabled })}
                          className={`text-xs font-bold px-3 py-1 rounded-full transition-colors cursor-pointer ${
                            gateway.enabled
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-gray-100 text-gray-600 border border-gray-200'
                          }`}
                        >
                          {gateway.enabled ? '✓ Activé' : 'Désactivé'}
                        </button>
                      </div>
                    </div>

                    {/* Logo Customizer */}
                    <div className="bg-gray-50/80 p-3.5 rounded-2xl border border-gray-200 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black text-gray-700 flex items-center gap-1.5">
                          <ImageIcon className="w-3.5 h-3.5 text-orange-500" />
                          <span>Logo Orange Money</span>
                        </label>
                        {gateway.customLogoUrl && (
                          <button
                            type="button"
                            onClick={() => updatePaymentGateway('orange', { customLogoUrl: '' })}
                            className="text-[11px] font-bold text-red-600 hover:underline"
                          >
                            Rétablir le logo officiel
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                            URL de l'image du logo
                          </label>
                          <input
                            type="text"
                            placeholder="https://.../logo.png"
                            className="w-full text-xs border border-gray-300 rounded-xl p-2 bg-white focus:outline-hidden focus:border-orange-500"
                            value={gateway.customLogoUrl || ''}
                            onChange={(e) => updatePaymentGateway('orange', { customLogoUrl: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                            Ou importer une image
                          </label>
                          <label className="flex items-center justify-center gap-1.5 w-full py-2 px-3 border border-dashed border-gray-300 rounded-xl text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 cursor-pointer transition-colors">
                            <Upload className="w-3.5 h-3.5 text-gray-500" />
                            <span>Choisir un fichier</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleLogoUpload}
                            />
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Form Fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">
                          Nom affiché
                        </label>
                        <input
                          type="text"
                          className="w-full border border-gray-300 rounded-xl p-2 bg-gray-50/50"
                          value={gateway.displayName || 'Orange Money RDC'}
                          onChange={(e) => updatePaymentGateway('orange', { displayName: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">
                          Merchant ID / Compte Goma
                        </label>
                        <input
                          type="text"
                          className="w-full font-mono border border-gray-300 rounded-xl p-2 bg-gray-50/50"
                          value={gateway.merchantId || ''}
                          onChange={(e) => updatePaymentGateway('orange', { merchantId: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">
                          Clé API / Token
                        </label>
                        <input
                          type="text"
                          className="w-full font-mono border border-gray-300 rounded-xl p-2 bg-gray-50/50"
                          value={gateway.apiKey || ''}
                          onChange={(e) => updatePaymentGateway('orange', { apiKey: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">
                          Clé Secrète Orange
                        </label>
                        <input
                          type="password"
                          className="w-full font-mono border border-gray-300 rounded-xl p-2 bg-gray-50/50"
                          value={gateway.secretKey || ''}
                          onChange={(e) => updatePaymentGateway('orange', { secretKey: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* OPERATOR 4: AFRIMONEY */}
              {(() => {
                const gateway = siteConfig.paymentGateways?.afrimoney || {
                  merchantId: 'AFRIMONEY_GOMARCHE_GOMA',
                  apiKey: '',
                  secretKey: '',
                  webhookUrl: '',
                  enabled: true,
                  sandboxMode: false,
                  phonePrefix: '090, 091',
                  customLogoUrl: '',
                  displayName: 'Africell AfriMoney',
                  instructions: 'Validation immédiate par SMS ou USSD Africell',
                };

                const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const url = await uploadImageFile(file, 'afrimoney_logo');
                    if (url) {
                      updatePaymentGateway('afrimoney', { customLogoUrl: url });
                      showSaveSuccess();
                    }
                  }
                };

                return (
                  <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-xs space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                      <div className="flex items-center gap-3">
                        <AfriMoneyLogo size="md" customLogoUrl={gateway.customLogoUrl} />
                        <div>
                          <h4 className="text-sm font-black text-gray-900">{gateway.displayName || 'Africell AfriMoney'}</h4>
                          <span className="text-[10px] text-gray-500 font-mono">Préfixes : {gateway.phonePrefix || '090, 091'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updatePaymentGateway('afrimoney', { enabled: !gateway.enabled })}
                          className={`text-xs font-bold px-3 py-1 rounded-full transition-colors cursor-pointer ${
                            gateway.enabled
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-gray-100 text-gray-600 border border-gray-200'
                          }`}
                        >
                          {gateway.enabled ? '✓ Activé' : 'Désactivé'}
                        </button>
                      </div>
                    </div>

                    {/* Logo Customizer */}
                    <div className="bg-gray-50/80 p-3.5 rounded-2xl border border-gray-200 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black text-gray-700 flex items-center gap-1.5">
                          <ImageIcon className="w-3.5 h-3.5 text-purple-600" />
                          <span>Logo AfriMoney</span>
                        </label>
                        {gateway.customLogoUrl && (
                          <button
                            type="button"
                            onClick={() => updatePaymentGateway('afrimoney', { customLogoUrl: '' })}
                            className="text-[11px] font-bold text-red-600 hover:underline"
                          >
                            Rétablir le logo officiel
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                            URL de l'image du logo
                          </label>
                          <input
                            type="text"
                            placeholder="https://.../logo.png"
                            className="w-full text-xs border border-gray-300 rounded-xl p-2 bg-white focus:outline-hidden focus:border-purple-500"
                            value={gateway.customLogoUrl || ''}
                            onChange={(e) => updatePaymentGateway('afrimoney', { customLogoUrl: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                            Ou importer une image
                          </label>
                          <label className="flex items-center justify-center gap-1.5 w-full py-2 px-3 border border-dashed border-gray-300 rounded-xl text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 cursor-pointer transition-colors">
                            <Upload className="w-3.5 h-3.5 text-gray-500" />
                            <span>Choisir un fichier</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleLogoUpload}
                            />
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Form Fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">
                          Nom affiché
                        </label>
                        <input
                          type="text"
                          className="w-full border border-gray-300 rounded-xl p-2 bg-gray-50/50"
                          value={gateway.displayName || 'Africell AfriMoney'}
                          onChange={(e) => updatePaymentGateway('afrimoney', { displayName: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">
                          Merchant ID / Compte Goma
                        </label>
                        <input
                          type="text"
                          className="w-full font-mono border border-gray-300 rounded-xl p-2 bg-gray-50/50"
                          value={gateway.merchantId || ''}
                          onChange={(e) => updatePaymentGateway('afrimoney', { merchantId: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">
                          Clé API / Token
                        </label>
                        <input
                          type="text"
                          className="w-full font-mono border border-gray-300 rounded-xl p-2 bg-gray-50/50"
                          value={gateway.apiKey || ''}
                          onChange={(e) => updatePaymentGateway('afrimoney', { apiKey: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">
                          Clé Secrète AfriMoney
                        </label>
                        <input
                          type="password"
                          className="w-full font-mono border border-gray-300 rounded-xl p-2 bg-gray-50/50"
                          value={gateway.secretKey || ''}
                          onChange={(e) => updatePaymentGateway('afrimoney', { secretKey: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                );
              })()}
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

              {/* Box 2: Firebase & Google Sign-In Config */}
              <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                      <Database className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">Projet Firebase & Connexion Google</h4>
                      <p className="text-xs text-gray-500">Lier le projet Firebase « gomarche »</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Projet {fbProjectId || 'gomarche-c2476'} actif
                  </span>
                </div>

                {/* Status explanation */}
                <div className="p-3.5 rounded-2xl text-xs space-y-1.5 border bg-emerald-50/60 border-emerald-200 text-emerald-900">
                  <p className="font-bold flex items-center gap-1.5">
                    ✅ Connecté au projet officiel Gomarché ({fbProjectId || 'gomarche-c2476'}) :
                  </p>
                  <p className="text-[11px] leading-relaxed">
                    La connexion Google s'exécute désormais sous le projet Firebase <strong>gomarche-c2476</strong>. Le projet « objets perdus » est totalement déconnecté et n'est plus utilisé.
                  </p>
                </div>

                {fbErrorMsg && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                    <span>{fbErrorMsg}</span>
                  </div>
                )}

                {fbSuccessMsg && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2">
                    <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>{fbSuccessMsg}</span>
                  </div>
                )}

                {/* Quick Paste Auto-Import */}
                <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-200 space-y-2">
                  <label className="block text-xs font-bold text-gray-800">
                    ⚡ Remplissage rapide : Coller le code Firebase Web
                  </label>
                  <p className="text-[11px] text-gray-500">
                    Copiez le bloc <code className="bg-gray-200 px-1 rounded text-[10px]">const firebaseConfig = &#123; ... &#125;</code> depuis la console Firebase et collez-le ici :
                  </p>
                  <textarea
                    rows={3}
                    placeholder="apiKey: '...', authDomain: 'gomarche.firebaseapp.com', projectId: 'gomarche', ..."
                    value={fbRawConfig}
                    onChange={(e) => handleParseRawFirebase(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-gray-300 bg-white focus:outline-hidden focus:border-amber-500"
                  />
                </div>

                {/* Form fields */}
                <form onSubmit={handleSaveFirebaseConfig} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Firebase Project ID *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: gomarche ou gomarche-12345"
                        value={fbProjectId}
                        onChange={(e) => setFbProjectId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-mono focus:outline-hidden focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Clé API Web (apiKey) *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: AIzaSy..."
                        value={fbApiKey}
                        onChange={(e) => setFbApiKey(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-mono focus:outline-hidden focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Auth Domain
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: gomarche.firebaseapp.com"
                        value={fbAuthDomain}
                        onChange={(e) => setFbAuthDomain(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-mono focus:outline-hidden focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        App ID
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: 1:123456789:web:abcdef..."
                        value={fbAppId}
                        onChange={(e) => setFbAppId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-mono focus:outline-hidden focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <button
                      type="submit"
                      className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      <span>Connecter le projet Gomarché</span>
                    </button>

                    {isCustomFb && (
                      <button
                        type="button"
                        onClick={handleResetFirebaseConfig}
                        className="py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Réinitialiser</span>
                      </button>
                    )}
                  </div>
                </form>

                {/* Instructions accordion / guide */}
                <div className="border-t border-gray-200 pt-3 text-[11px] text-gray-500 space-y-1">
                  <div className="flex items-center justify-between font-bold text-gray-700">
                    <span>Où trouver ces identifiants dans Firebase ?</span>
                    <a
                      href="https://console.firebase.google.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline inline-flex items-center gap-0.5"
                    >
                      Ouvrir Firebase Console <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <ol className="list-decimal list-inside space-y-0.5 text-gray-500 pl-1">
                    <li>Allez sur <strong>console.firebase.google.com</strong> et ouvrez votre projet <strong>gomarche</strong>.</li>
                    <li>Cliquez sur l'engrenage ⚙️ <em>Paramètres du projet</em> en haut à gauche.</li>
                    <li>Dans l'onglet <em>Général</em>, descendez à la section <em>Vos applications</em> (icône Web <code>&lt;/&gt;</code>).</li>
                    <li>Copiez le bloc de code et collez-le dans la case ci-dessus !</li>
                  </ol>
                </div>
              </div>

              {/* Box 2.5: Authorized Domains for Firebase Authentication */}
              <div className="bg-amber-50/70 rounded-3xl p-6 border-2 border-amber-200/80 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-xs">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-amber-950">
                        Domaines Autorisés Firebase (Erreur auth/unauthorized-domain)
                      </h4>
                      <p className="text-xs text-amber-800">
                        Requis pour autoriser la connexion Google sur votre site et en production
                      </p>
                    </div>
                  </div>
                  <a
                    href="https://console.firebase.google.com/project/gomarche-c2476/authentication/settings"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
                  >
                    <span>Ouvrir les Paramètres Firebase</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                <div className="p-3.5 bg-white rounded-2xl border border-amber-200 text-xs text-gray-700 space-y-3">
                  <p className="leading-relaxed">
                    Si le message <code className="bg-red-50 text-red-700 px-1.5 py-0.5 rounded font-mono font-bold text-[11px]">Firebase: Error (auth/unauthorized-domain)</code> apparaît lors du clic sur Google, c'est que l'adresse web de votre site n'est pas encore enregistrée dans la console Firebase du projet <strong>gomarche-c2476</strong>.
                  </p>

                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-gray-900 block">
                      Copiez ces domaines et ajoutez-les dans Firebase :
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {/* Vercel production domain */}
                      <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl border border-gray-200">
                        <div>
                          <span className="text-[10px] text-gray-400 font-bold block uppercase">Production Vercel</span>
                          <code className="text-xs font-mono font-bold text-gray-800">gomarche.vercel.app</code>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyDomainAdmin('gomarche.vercel.app')}
                          className="px-3 py-1.5 text-[11px] font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          {copiedDomainAdmin === 'gomarche.vercel.app' ? (
                            <>
                              <Check className="w-3.5 h-3.5" /> Copié !
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" /> Copier
                            </>
                          )}
                        </button>
                      </div>

                      {/* Current Preview domain */}
                      <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl border border-gray-200">
                        <div className="min-w-0 pr-2">
                          <span className="text-[10px] text-gray-400 font-bold block uppercase">Domaine Actuel</span>
                          <code className="text-xs font-mono font-bold text-gray-800 truncate block">
                            {typeof window !== 'undefined' ? window.location.hostname : 'localhost'}
                          </code>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyDomainAdmin(typeof window !== 'undefined' ? window.location.hostname : 'localhost')}
                          className="px-3 py-1.5 text-[11px] font-bold bg-gray-800 hover:bg-gray-900 text-white rounded-lg flex items-center gap-1 transition-colors shrink-0 cursor-pointer"
                        >
                          {copiedDomainAdmin === (typeof window !== 'undefined' ? window.location.hostname : 'localhost') ? (
                            <>
                              <Check className="w-3.5 h-3.5" /> Copié !
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" /> Copier
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-amber-100/50 p-3 rounded-xl border border-amber-200 space-y-1">
                    <span className="font-bold text-amber-950 block text-xs">
                      Procédure rapide (30 secondes dans Firebase) :
                    </span>
                    <ol className="list-decimal list-inside space-y-0.5 text-[11px] text-amber-900 pl-1">
                      <li>Ouvrez <a href="https://console.firebase.google.com/project/gomarche-c2476/authentication/settings" target="_blank" rel="noopener noreferrer" className="font-bold underline text-blue-700">la console Firebase &gt; Authentication &gt; Paramètres</a>.</li>
                      <li>Dans l'onglet <strong>Paramètres</strong>, descendez à la section <strong>Domaines autorisés</strong>.</li>
                      <li>Cliquez sur <strong>Ajouter un domaine</strong>, collez <code className="bg-white px-1 py-0.5 rounded font-mono font-bold">gomarche.vercel.app</code> et enregistrez.</li>
                      <li>Faites de même avec le domaine actuel si vous testez en direct.</li>
                    </ol>
                  </div>
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
                <label className="block text-xs font-bold text-gray-700 mb-1">Nom du produit *</label>
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
                  <label className="block text-xs font-bold text-gray-700 mb-1">Rayon / Catégorie *</label>
                  <select
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl bg-white font-semibold"
                    value={newProdCategory}
                    onChange={(e) => setNewProdCategory(e.target.value)}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Marque</label>
                  <input
                    type="text"
                    placeholder="Ex: Gomarché Sélection"
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl"
                    value={newProdBrand}
                    onChange={(e) => setNewProdBrand(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Prix ($ USD)</label>
                  <input
                    type="number"
                    step="0.05"
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
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Stock</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl font-bold text-emerald-700"
                    value={newProdStock}
                    onChange={(e) => setNewProdStock(Number(e.target.value))}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Conditionnement / Unité</label>
                <input
                  type="text"
                  placeholder="Ex: sac 25kg, bidon 5L, le kg"
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl"
                  value={newProdUnit}
                  onChange={(e) => setNewProdUnit(e.target.value)}
                />
              </div>

              {/* Photo du produit: Upload or Link */}
              <div className="space-y-2 pt-1 border-t border-gray-100">
                <label className="block text-xs font-bold text-gray-700">Photo du produit</label>
                {newProdImage && (
                  <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-xl border border-gray-200">
                    <img
                      src={newProdImage}
                      alt="Aperçu"
                      className="w-12 h-12 rounded-lg object-contain bg-white border border-gray-200 p-0.5"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="text-[11px] font-bold text-gray-800 block truncate">Photo enregistrée</span>
                      <span className="text-[10px] text-gray-500 block truncate">{newProdImage}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNewProdImage('')}
                      className="p-1 text-red-500 hover:text-red-700"
                      title="Supprimer la photo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <label className="flex items-center justify-center gap-2 w-full py-2.5 px-3 bg-white border border-dashed border-gray-300 hover:border-gray-400 rounded-xl cursor-pointer text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors shadow-xs">
                  {isUploadingProdImage ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                      <span>Téléversement de la photo...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 text-emerald-600" />
                      <span>Uploader une photo depuis cet appareil</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    disabled={isUploadingProdImage}
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setIsUploadingProdImage(true);
                      try {
                        const url = await uploadImageFile(file, 'produit');
                        if (url) {
                          setNewProdImage(url);
                        }
                      } finally {
                        setIsUploadingProdImage(false);
                      }
                    }}
                  />
                </label>

                <div>
                  <span className="text-[10px] text-gray-500 block mb-1 font-semibold">
                    Ou coller une URL d'image alternative :
                  </span>
                  <input
                    type="text"
                    placeholder="https://.../produit.jpg"
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl"
                    value={newProdImage}
                    onChange={(e) => setNewProdImage(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl"
                  placeholder="Détails, conservation, origine..."
                  value={newProdDesc}
                  onChange={(e) => setNewProdDesc(e.target.value)}
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
                  className="px-5 py-2.5 text-xs font-bold bg-[#E2001A] text-white rounded-xl shadow-md hover:bg-red-700"
                >
                  Enregistrer l'article
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
