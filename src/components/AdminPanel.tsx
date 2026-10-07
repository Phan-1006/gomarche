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
import { Category, Product, ThemeStyle } from '../types';
import { uploadImageFile } from '../services/imageUpload';
import { errorMessage } from '../services/api';
import { isActiveOrder } from '../utils/orders';
import { ProductPhotoPicker } from './ProductPhotoPicker';
import { StaffShell } from './StaffShell';
import { ScheduleTab } from './admin/ScheduleTab';
import { HomeTab } from './admin/HomeTab';
import { PaymentsTab } from './admin/PaymentsTab';
import { OrdersTab } from './admin/OrdersTab';
import { StaffTab } from './admin/StaffTab';

export const AdminPanel: React.FC = () => {
  const {
    currentUser,
    siteConfig,
    updateSiteConfig,
    categories,
    addCategory,
    updateCategory,
    deleteCategory,
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    workOrders: orders,
    formatPrice,
    convertUsdToCdf,
    setActiveView,
    notify,
  } = useApp();

  const [activeTab, setActiveTab] = useState<
    'overview' | 'store_info' | 'home_page' | 'delivery_slots' | 'branding' | 'currency' | 'categories_agents' | 'products' | 'payment_apis' | 'orders' | 'security'
  >('overview');

  // Category modal
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [newCatImage, setNewCatImage] = useState('');
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

  const showSaveSuccess = () => notify('Modifications enregistrées.');

  // Chiffre d'affaires = paiements réellement validés par la caisse (hors commandes annulées).
  const totalRevenueUsd = orders
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => sum + o.payments.filter((p) => p.status === 'confirmed').reduce((s2, p) => s2 + p.amountUsd, 0), 0);
  const totalRevenueCdf = convertUsdToCdf(totalRevenueUsd);
  const totalOrdersCount = orders.length;
  const pendingOrdersCount = orders.filter(isActiveOrder).length;
  const toVerifyCount = orders.reduce((n, o) => n + o.payments.filter((p) => p.status === 'submitted').length, 0);
  const lowStock = products.filter((p) => p.stockCount <= 5);

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
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const fields = {
      name: newCatName,
      description: newCatDesc,
      image: newCatImage || editingCategory?.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80',
      isPromoCategory: newCatIsPromo,
    };
    const ok = editingCategory
      ? await updateCategory({ ...editingCategory, ...fields })
      : await addCategory({ ...fields, slug: '', iconName: 'Layers', displayOrder: categories.length + 1 });
    if (ok) {
      setIsCatModalOpen(false);
      setEditingCategory(null);
    }
  };

  // Product save
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const fields = {
      name: newProdName,
      categoryId: newProdCategory,
      brand: newProdBrand || 'Gomarché Sélection',
      description: newProdDesc,
      priceUsd: Number(newProdPriceUsd),
      discountPercent: Number(newProdDiscount),
      unit: newProdUnit,
      stockCount: Number(newProdStock),
      inStock: Number(newProdStock) > 0,
      isPromo: newProdIsPromo || Number(newProdDiscount) > 0,
    };
    const ok = editingProduct
      ? await updateProduct({ ...editingProduct, ...fields, image: newProdImage || editingProduct.image })
      : await addProduct({ ...fields, image: newProdImage, rating: 0, reviewCount: 0 });
    if (ok) {
      setIsProdModalOpen(false);
      setEditingProduct(null);
    }
  };

  const uploadTo = async (file: File, apply: (url: string) => void, setBusy: (b: boolean) => void) => {
    setBusy(true);
    try {
      apply(await uploadImageFile(file));
    } catch (err) {
      notify(errorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  if (currentUser?.role !== 'admin') {
    return (
      <StaffShell roles={['admin']} title="Administration" subtitle="">
        {null}
      </StaffShell>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100/70 pb-24">
      {/* Admin Top Header Banner */}
      <div className="bg-[#161A1D] text-white border-b border-gray-800">
        <div className="page-width mx-auto px-4 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {siteConfig.customLogoUrl ? (
              <img
                src={siteConfig.customLogoUrl}
                alt={siteConfig.siteName}
                className="h-12 max-w-[8.75rem] object-contain rounded-2xl bg-white/10 p-1 border border-white/10 shadow-lg"
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
                <span className="bg-red-600 text-white text-[0.625rem] font-black uppercase px-2 py-0.5 rounded-full">
                  Propriétaire
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Coordonnées, horaires de livraison, rayons, paiements, commandes et personnel
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
        <div className="page-width mx-auto px-4 flex items-center gap-1 overflow-x-auto no-scrollbar py-2">
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
            <span>Horaires de livraison</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('home_page')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 shrink-0 ${
              activeTab === 'home_page' ? 'bg-red-50 text-[#E2001A]' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Page d'accueil</span>
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
            <span>Rayons</span>
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
            <span>Paiements</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 shrink-0 ${
              activeTab === 'orders' ? 'bg-red-50 text-[#E2001A]' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Commandes ({pendingOrdersCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 shrink-0 ${
              activeTab === 'security' ? 'bg-red-50 text-[#E2001A]' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Lock className="w-4 h-4 text-red-600" />
            <span>Personnel & accès</span>
          </button>
        </div>
      </div>

      <div className="page-width mx-auto px-4 py-8">
        {/* ===================== TAB 1: OVERVIEW ===================== */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs">
                <span className="text-xs font-bold text-gray-500 uppercase">Encaissements validés</span>
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
                  {pendingOrdersCount} en cours • {toVerifyCount} paiement(s) à vérifier
                </p>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs">
                <span className="text-xs font-bold text-gray-500 uppercase">Rayons Actifs</span>
                <p className="text-2xl font-black text-gray-900 mt-1">{categories.length}</p>
                <p className="text-xs text-gray-500 mt-0.5">{products.length} articles • {lowStock.length} en stock faible</p>
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

        {activeTab === 'home_page' && <HomeTab />}

        {activeTab === 'delivery_slots' && <ScheduleTab />}

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
                          <span className="ml-auto text-[0.625rem] font-black uppercase text-white bg-gray-900 px-2 py-0.5 rounded-full">
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
                    <span className="text-[0.625rem] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
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
                          className="h-12 max-w-[8.75rem] object-contain rounded-lg border border-gray-100 p-1"
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
                        <span className="text-[0.625rem] text-gray-500 block truncate">
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
                        className="text-[0.6875rem] text-red-600 hover:text-red-800 font-bold px-2 py-1 rounded bg-red-50 hover:bg-red-100 transition-colors shrink-0"
                      >
                        Réinitialiser
                      </button>
                    )}
                  </div>

                  {/* Upload file or URL */}
                  <div className="space-y-2">
                    <label className="block text-[0.6875rem] font-semibold text-gray-700">
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
                          <span>Parcourir mes photos (PNG, JPG, WebP)</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        disabled={isUploadingLogo}
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          e.target.value = '';
                          if (file) uploadTo(file, (url) => updateSiteConfig({ customLogoUrl: url, logoType: 'custom_url' }), setIsUploadingLogo);
                        }}
                      />
                    </label>

                    <div className="pt-1">
                      <span className="text-[0.625rem] font-semibold text-gray-500 block mb-1">
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
                    <span className="text-[0.625rem] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
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
                        <span className="text-[0.625rem] text-gray-500 block truncate">
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
                        className="text-[0.6875rem] text-red-600 hover:text-red-800 font-bold px-2 py-1 rounded bg-red-50 hover:bg-red-100 transition-colors shrink-0"
                      >
                        Réinitialiser
                      </button>
                    )}
                  </div>

                  {/* Upload file or URL */}
                  <div className="space-y-2">
                    <label className="block text-[0.6875rem] font-semibold text-gray-700">
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
                        accept="image/jpeg,image/png,image/webp"
                        disabled={isUploadingPwaIcon}
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          e.target.value = '';
                          if (file) uploadTo(file, (url) => updateSiteConfig({ pwaIconUrl: url }), setIsUploadingPwaIcon);
                        }}
                      />
                    </label>

                    <div className="pt-1">
                      <span className="text-[0.625rem] font-semibold text-gray-500 block mb-1">
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
                  Rayons du magasin
                </h3>
                <p className="text-xs text-gray-500">
                  Les agents de rayon se nomment dans l’onglet « Personnel & accès »
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setEditingCategory(null);
                  setNewCatName('');
                  setNewCatDesc('');
                  setNewCatImage('');
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
                            <span className="text-[0.5625rem] font-black uppercase bg-red-100 text-red-600 px-1.5 py-0.5 rounded">
                              Promo
                            </span>
                          )}
                        </div>
                        <p className="text-[0.6875rem] text-gray-500 line-clamp-2 mt-0.5">
                          {cat.description}
                        </p>
                      </div>
                    </div>

                    <p className="text-xs font-bold text-gray-600">
                      {products.filter((p) => p.categoryId === cat.id).length} article(s)
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCategory(cat);
                        setNewCatName(cat.name);
                        setNewCatDesc(cat.description);
                        setNewCatImage(cat.image);
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
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase font-bold text-[0.625rem]">
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
                            <span className="font-bold text-gray-900 block truncate max-w-[12.5rem]">
                              {p.name}
                            </span>
                            <span className="text-[0.625rem] text-gray-400 font-semibold">
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
                            <span className="bg-red-100 text-red-700 font-black px-2 py-0.5 rounded text-[0.625rem]">
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

        {activeTab === 'payment_apis' && <PaymentsTab />}

        {activeTab === 'orders' && <OrdersTab />}

        {activeTab === 'security' && <StaffTab />}
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
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Image du rayon (lien https)</label>
                <input
                  type="url"
                  placeholder="https://.../rayon.jpg"
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl"
                  value={newCatImage}
                  onChange={(e) => setNewCatImage(e.target.value)}
                />
              </div>
              <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
                <input type="checkbox" checked={newCatIsPromo} onChange={(e) => setNewCatIsPromo(e.target.checked)} className="w-4 h-4 accent-red-600" />
                Rayon de promotions
              </label>
              {editingCategory && (
                <button
                  type="button"
                  onClick={async () => {
                    if (confirm(`Supprimer le rayon « ${editingCategory.name} » ?`) && (await deleteCategory(editingCategory.id))) {
                      setIsCatModalOpen(false);
                      setEditingCategory(null);
                    }
                  }}
                  className="text-xs font-bold text-red-600 hover:underline"
                >
                  Supprimer ce rayon
                </button>
              )}
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

              <ProductPhotoPicker
                image={newProdImage}
                onImage={setNewProdImage}
                productName={newProdName}
                onDetails={(d) => {
                  if (d.name && !newProdName.trim()) setNewProdName(d.name);
                  if (d.brand && !newProdBrand.trim()) setNewProdBrand(d.brand);
                  if (d.unit && (!newProdUnit.trim() || newProdUnit === 'le kg')) setNewProdUnit(d.unit);
                  if (d.description && !newProdDesc.trim()) setNewProdDesc(d.description);
                }}
              />

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
