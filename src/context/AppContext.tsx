import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  User,
  Category,
  Product,
  CartItem,
  Order,
  SiteConfig,
  Currency,
  GatewayKey,
  PaymentGatewayItemConfig,
} from '../types';
import { INITIAL_SITE_CONFIG } from '../data/mockData';
import { disablePush } from '../services/push';
import { api, ApiError, errorMessage } from '../services/api';
import { googleIdToken } from '../services/firebaseAuth';

export type AppView =
  | 'home'
  | 'promotions'
  | 'categories'
  | 'admin'
  | 'agent'
  | 'prep'
  | 'cashier'
  | 'delivery'
  | 'orders'
  | 'product_detail';

type AuthResult = { success: boolean; message?: string };
type Toast = { id: number; kind: 'success' | 'error'; message: string };

interface AppContextType {
  ready: boolean;
  currentUser: User | null;
  categories: Category[];
  products: Product[];
  cart: CartItem[];
  orders: Order[]; // commandes du client connecté
  workOrders: Order[]; // commandes visibles selon le rôle employé
  siteConfig: SiteConfig;
  currency: Currency;
  deliveryMode: 'delivery' | 'drive';
  selectedCategoryFilter: string | null;
  searchQuery: string;
  activeView: AppView;
  selectedProduct: Product | null;
  selectedOrder: Order | null;
  isCartOpen: boolean;
  isAuthOpen: boolean;
  isCheckoutOpen: boolean;

  setCurrency: (c: Currency) => void;
  setDeliveryMode: (mode: 'delivery' | 'drive') => void;
  setSelectedCategoryFilter: (catId: string | null) => void;
  setSearchQuery: (query: string) => void;
  setActiveView: (view: AppView) => void;
  setSelectedProduct: (p: Product | null) => void;
  setSelectedOrder: (o: Order | null) => void;
  setIsCartOpen: (open: boolean) => void;
  setIsAuthOpen: (open: boolean) => void;
  setIsCheckoutOpen: (open: boolean) => void;

  formatPrice: (usdAmount: number, forceCurrency?: Currency) => string;
  convertUsdToCdf: (usdAmount: number) => number;
  formatDualPrice: (usdAmount: number) => { primary: string; secondary: string };
  notify: (message: string, kind?: 'success' | 'error') => void;

  addToCart: (product: Product, qty?: number) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, qty: number) => void;
  clearCart: () => void;
  cartTotalUsd: number;
  cartTotalCdf: number;
  cartItemsCount: number;

  login: (email: string, password: string, extra?: object) => Promise<AuthResult>;
  register: (name: string, email: string, password: string, extra?: object) => Promise<AuthResult>;
  loginWithGoogle: () => Promise<AuthResult>;
  // Mot de passe oublié et confirmation d'adresse (liens reçus par e-mail).
  requestPasswordReset: (email: string, extra?: object) => Promise<AuthResult>;
  resetPassword: (token: string, password: string) => Promise<AuthResult>;
  resendVerification: () => Promise<AuthResult>;
  resetToken: string | null;
  setResetToken: (token: string | null) => void;
  logout: () => Promise<void>;
  updateProfile: (fields: Partial<Pick<User, 'name' | 'phone' | 'address' | 'commune'>>) => Promise<AuthResult>;
  homeViewFor: (user: User | null) => AppView;

  updateSiteConfig: (newConfig: Partial<SiteConfig>) => void;
  // Enregistrement immédiat avec retour d'erreur, pour les formulaires validés d'un bloc.
  saveSiteConfig: (patch: Partial<SiteConfig>) => Promise<AuthResult>;
  updatePaymentGateway: (gateway: GatewayKey, data: Partial<PaymentGatewayItemConfig>) => void;
  addCategory: (cat: Omit<Category, 'id'>) => Promise<boolean>;
  updateCategory: (cat: Category) => Promise<boolean>;
  deleteCategory: (id: string) => Promise<boolean>;
  addProduct: (prod: Omit<Product, 'id'>) => Promise<boolean>;
  updateProduct: (prod: Product) => Promise<boolean>;
  deleteProduct: (id: string) => Promise<boolean>;

  refreshOrders: () => Promise<void>;
  // Applique une action serveur sur une commande et met la liste à jour avec la réponse.
  orderAction: (orderId: string, action: string, body?: object) => Promise<Order>;
  trackOrder: (order: Order) => void;

  deferredPrompt: any;
  setDeferredPrompt: (p: any) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const getStored = <T,>(key: string, defaultVal: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultVal;
  } catch {
    return defaultVal;
  }
};

const setStored = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* stockage plein ou navigation privée : sans conséquence */
  }
};

// Un lien reçu par e-mail ne doit être traité qu'une fois, même si React monte l'application deux fois.
let mailLinkHandled = false;

// Anciennes clés où le navigateur conservait comptes, mots de passe et commandes.
const LEGACY_KEYS = [
  'gm_site_config_v2', 'gm_categories_v2', 'gm_products_v2', 'gm_users_v2', 'gm_current_user_v4',
  'gm_orders_v2', 'gm_activities_v2', 'gm_cart_v2', 'gm_custom_firebase_config',
];

const STAFF_VIEW: Partial<Record<User['role'], AppView>> = {
  admin: 'admin',
  category_agent: 'agent',
  order_agent: 'prep',
  cashier: 'cashier',
  delivery_driver: 'delivery',
};

const VIEW_ROLES: Partial<Record<AppView, User['role'][]>> = {
  admin: ['admin'],
  agent: ['admin', 'category_agent'],
  prep: ['admin', 'order_agent'],
  cashier: ['admin', 'cashier'],
  delivery: ['delivery_driver'],
};

type CartLine = { productId: string; quantity: number };
type CatalogCache = { config: SiteConfig; categories: Category[]; products: Product[] };

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Copie locale du catalogue : uniquement pour afficher la boutique instantanément au
  // démarrage. Elle est remplacée dès que le serveur répond et n'est jamais renvoyée vers lui.
  const cached = useMemo(() => getStored<CatalogCache | null>('gm_catalog_cache_v1', null), []);

  const [ready, setReady] = useState(false);
  const [siteConfig, setSiteConfig] = useState<SiteConfig>(cached?.config || INITIAL_SITE_CONFIG);
  const [categories, setCategories] = useState<Category[]>(cached?.categories || []);
  const [products, setProducts] = useState<Product[]>(cached?.products || []);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [cartLines, setCartLines] = useState<CartLine[]>(() => getStored('gm_cart_v3', []));
  const [orders, setOrders] = useState<Order[]>([]);
  const [workOrders, setWorkOrders] = useState<Order[]>([]);
  const [currency, setCurrency] = useState<Currency>(() => getStored('gm_currency_v2', 'USD'));

  const [deliveryMode, setDeliveryMode] = useState<'delivery' | 'drive'>('delivery');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeView, setActiveViewRaw] = useState<AppView>('home');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [resetToken, setResetToken] = useState<string | null>(null);
  // Commande à ouvrir après un appui sur une notification.
  const [orderLink, setOrderLink] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const notify = useCallback((message: string, kind: 'success' | 'error' = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev.slice(-2), { id, kind, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), kind === 'error' ? 6000 : 2500);
  }, []);

  // ---------------------------------------------------------------- synchronisation serveur

  // Modifications de configuration en cours d'envoi : tant qu'il y en a, la synchronisation
  // périodique ne doit pas écraser ce que l'admin est en train de saisir.
  const pendingConfig = useRef<Partial<SiteConfig>>({});
  const configTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const configBusy = () => configTimer.current !== null || Object.keys(pendingConfig.current).length > 0;

  const syncCatalog = useCallback(async () => {
    try {
      const data = await api<CatalogCache & { user: User | null }>('GET', '/bootstrap');
      if (!configBusy()) setSiteConfig(data.config);
      setCategories(data.categories);
      setProducts(data.products);
      setCurrentUser(data.user);
      setStored('gm_catalog_cache_v1', { config: data.config, categories: data.categories, products: data.products });
    } catch {
      /* hors ligne : on garde l'affichage courant, la prochaine tentative rattrapera */
    } finally {
      setReady(true);
    }
  }, []);

  const refreshOrders = useCallback(async () => {
    try {
      const data = await api<{ mine: Order[]; work: Order[] }>('GET', '/orders');
      setOrders(data.mine);
      setWorkOrders(data.work);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) setCurrentUser(null);
    }
  }, []);

  useEffect(() => {
    LEGACY_KEYS.forEach((k) => localStorage.removeItem(k));
    syncCatalog();
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') syncCatalog();
    }, 60_000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') syncCatalog();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [syncCatalog]);

  const userId = currentUser?.id;
  useEffect(() => {
    if (!userId) {
      setOrders([]);
      setWorkOrders([]);
      return;
    }
    refreshOrders();
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') refreshOrders();
    }, 8000);
    return () => clearInterval(interval);
  }, [userId, refreshOrders]);

  // Nom, icône d'onglet et icône d'application suivent la configuration du serveur. Le
  // paramètre de version force chaque appareil à recharger l'image quand l'admin la change.
  useEffect(() => {
    document.title = `${siteConfig.siteName} - Supermarché en Ligne`;
    const icon = siteConfig.pwaIconUrl || siteConfig.customLogoUrl;
    const version = siteConfig.updatedAt || 0;
    const setLink = (rel: string, href: string) => {
      let link = document.querySelector<HTMLLinkElement>(`link[rel='${rel}']`);
      if (!link) {
        link = document.createElement('link');
        link.rel = rel;
        document.head.appendChild(link);
      }
      link.href = href;
    };
    if (icon) {
      const href = `${icon}${icon.includes('?') ? '&' : '?'}v=${version}`;
      setLink('icon', href);
      setLink('apple-touch-icon', href);
    }
    setLink('manifest', `/manifest.webmanifest?v=${version}`);
    document.querySelector("meta[name='theme-color']")?.setAttribute('content', siteConfig.primaryColor);
  }, [siteConfig.siteName, siteConfig.pwaIconUrl, siteConfig.customLogoUrl, siteConfig.updatedAt, siteConfig.primaryColor]);

  useEffect(() => setStored('gm_cart_v3', cartLines), [cartLines]);
  useEffect(() => setStored('gm_currency_v2', currency), [currency]);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    // Une fois l'application installée, l'invite du navigateur n'est plus valable.
    const installed = () => setDeferredPrompt(null);
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installed);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installed);
    };
  }, []);

  // ---------------------------------------------------------------- prix

  const convertUsdToCdf = (usdAmount: number): number => Math.round(usdAmount * siteConfig.exchangeRateUsdToCdf);

  const formatPrice = (usdAmount: number, forceCurrency?: Currency): string => {
    if ((forceCurrency || currency) === 'CDF') return `${convertUsdToCdf(usdAmount).toLocaleString('fr-FR')} FC`;
    return `$ ${usdAmount.toFixed(2)}`;
  };

  const formatDualPrice = (usdAmount: number) => {
    const usd = `$ ${usdAmount.toFixed(2)}`;
    const cdf = `${convertUsdToCdf(usdAmount).toLocaleString('fr-FR')} FC`;
    return currency === 'USD' ? { primary: usd, secondary: cdf } : { primary: cdf, secondary: usd };
  };

  // ---------------------------------------------------------------- panier

  // Le panier ne retient que des identifiants : prix et stock affichés viennent toujours du
  // catalogue à jour, et un article retiré de la vente disparaît du panier.
  const cart: CartItem[] = useMemo(
    () =>
      cartLines.flatMap((line) => {
        const product = products.find((p) => p.id === line.productId);
        return product ? [{ product, quantity: line.quantity }] : [];
      }),
    [cartLines, products]
  );

  const addToCart = (product: Product, qty: number = 1) => {
    const inCart = cartLines.find((l) => l.productId === product.id)?.quantity || 0;
    if (inCart + qty > product.stockCount) {
      notify(product.stockCount > 0 ? `Stock limité : ${product.stockCount} disponible(s).` : 'Cet article est en rupture de stock.', 'error');
      return;
    }
    setCartLines((prev) =>
      prev.some((l) => l.productId === product.id)
        ? prev.map((l) => (l.productId === product.id ? { ...l, quantity: l.quantity + qty } : l))
        : [...prev, { productId: product.id, quantity: qty }]
    );
  };

  const removeFromCart = (productId: string) => setCartLines((prev) => prev.filter((l) => l.productId !== productId));

  const updateCartQuantity = (productId: string, qty: number) => {
    if (qty <= 0) return removeFromCart(productId);
    const stock = products.find((p) => p.id === productId)?.stockCount ?? qty;
    if (qty > stock) notify(`Stock limité : ${stock} disponible(s).`, 'error');
    setCartLines((prev) => prev.map((l) => (l.productId === productId ? { ...l, quantity: Math.min(qty, stock) } : l)));
  };

  const clearCart = () => setCartLines([]);

  const cartTotalUsd = cart.reduce(
    (sum, item) => sum + Math.round(item.product.priceUsd * (1 - (item.product.discountPercent || 0) / 100) * 100) / 100 * item.quantity,
    0
  );
  const cartTotalCdf = convertUsdToCdf(cartTotalUsd);
  const cartItemsCount = cart.reduce((count, item) => count + item.quantity, 0);

  // ---------------------------------------------------------------- comptes

  const homeViewFor = (user: User | null): AppView => (user && STAFF_VIEW[user.role]) || 'home';

  const openSession = (user: User): AuthResult => {
    setCurrentUser(user);
    setActiveViewRaw(homeViewFor(user));
    return { success: true };
  };

  const login = async (email: string, password: string, extra: object = {}): Promise<AuthResult> => {
    try {
      return openSession((await api<{ user: User }>('POST', '/auth/login', { email, password, ...extra })).user);
    } catch (e) {
      return { success: false, message: errorMessage(e) };
    }
  };

  const register = async (name: string, email: string, password: string, extra: object = {}): Promise<AuthResult> => {
    try {
      return openSession((await api<{ user: User }>('POST', '/auth/register', { name, email, password, ...extra })).user);
    } catch (e) {
      return { success: false, message: errorMessage(e) };
    }
  };

  const loginWithGoogle = async (): Promise<AuthResult> => {
    try {
      const idToken = await googleIdToken();
      return openSession((await api<{ user: User }>('POST', '/auth/google', { idToken })).user);
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        return { success: false, message: 'Connexion Google annulée.' };
      }
      if (err?.code === 'auth/popup-blocked') {
        return { success: false, message: 'Votre navigateur a bloqué la fenêtre Google. Autorisez les fenêtres pop-up pour ce site.' };
      }
      if (err?.code === 'auth/unauthorized-domain') {
        return {
          success: false,
          message: `Le domaine ${window.location.hostname} n’est pas encore autorisé dans Firebase (Authentication → Settings → Authorized domains).`,
        };
      }
      return { success: false, message: err instanceof ApiError ? err.message : 'Échec de la connexion avec Google.' };
    }
  };

  const requestPasswordReset = async (email: string, extra: object = {}): Promise<AuthResult> => {
    try {
      await api('POST', '/auth/forgot-password', { email, ...extra });
      return { success: true };
    } catch (e) {
      return { success: false, message: errorMessage(e) };
    }
  };

  const resetPassword = async (token: string, password: string): Promise<AuthResult> => {
    try {
      const result = openSession((await api<{ user: User }>('POST', '/auth/reset-password', { token, password })).user);
      setResetToken(null);
      return result;
    } catch (e) {
      return { success: false, message: errorMessage(e) };
    }
  };

  const resendVerification = async (): Promise<AuthResult> => {
    try {
      await api('POST', '/auth/resend-verification');
      return { success: true };
    } catch (e) {
      return { success: false, message: errorMessage(e) };
    }
  };

  // Liens reçus par e-mail : /?verify=… confirme l'adresse, /?reset=… ouvre le choix d'un
  // nouveau mot de passe. Le jeton est aussitôt retiré de la barre d'adresse.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verify = params.get('verify');
    const reset = params.get('reset');
    const order = params.get('order');
    if (!verify && !reset && !order) return;
    if (mailLinkHandled) return;
    mailLinkHandled = true;
    if (order) setOrderLink(order);
    params.delete('verify');
    params.delete('reset');
    params.delete('order');
    const query = params.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
    if (reset) {
      setResetToken(reset);
      setIsAuthOpen(true);
    } else if (verify) {
      api<{ user: User | null }>('POST', '/auth/verify-email', { token: verify })
        .then((data) => {
          if (data.user) setCurrentUser(data.user);
          notify('Adresse e-mail confirmée. Merci !');
        })
        .catch((e) => notify(errorMessage(e), 'error'));
    }
  }, []);

  // Application déjà ouverte : le service worker transmet la commande de la notification touchée.
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type !== 'open-order') return;
      const id = new URL(event.data.url, window.location.origin).searchParams.get('order');
      if (id) setOrderLink(id);
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, []);

  useEffect(() => {
    if (!orderLink || !currentUser) return;
    setSelectedOrderId(orderLink);
    setActiveViewRaw(currentUser.role === 'customer' ? 'orders' : homeViewFor(currentUser));
    setOrderLink(null);
  }, [orderLink, currentUser]);

  const logout = async () => {
    // Cet appareil ne doit plus recevoir les notifications du compte qui se déconnecte.
    await disablePush();
    await api('POST', '/auth/logout').catch(() => {});
    setCurrentUser(null);
    setSelectedOrderId(null);
    setActiveViewRaw('home');
  };

  const updateProfile: AppContextType['updateProfile'] = async (fields) => {
    try {
      setCurrentUser((await api<{ user: User }>('PUT', '/me', fields)).user);
      return { success: true };
    } catch (e) {
      return { success: false, message: errorMessage(e) };
    }
  };

  // Simple confort d'affichage : la vraie barrière est le serveur, qui refuse toute requête
  // d'un rôle non autorisé.
  const setActiveView = (view: AppView) => {
    const roles = VIEW_ROLES[view];
    if ((roles && (!currentUser || !roles.includes(currentUser.role))) || (view === 'orders' && !currentUser)) {
      setIsAuthOpen(true);
      return;
    }
    setActiveViewRaw(view);
  };

  // ---------------------------------------------------------------- administration

  const flushConfig = async () => {
    configTimer.current = null;
    const patch = pendingConfig.current;
    pendingConfig.current = {};
    try {
      const { config } = await api<{ config: SiteConfig }>('PUT', '/config', patch);
      if (!configBusy()) setSiteConfig(config);
    } catch (e) {
      notify(errorMessage(e), 'error');
      if (!configBusy()) syncCatalog();
    }
  };

  // Affichage immédiat, envoi groupé : taper dans un champ ne déclenche pas une requête par lettre.
  const updateSiteConfig = (newConfig: Partial<SiteConfig>) => {
    setSiteConfig((prev) => ({ ...prev, ...newConfig }));
    pendingConfig.current = { ...pendingConfig.current, ...newConfig };
    if (configTimer.current) clearTimeout(configTimer.current);
    configTimer.current = setTimeout(flushConfig, 700);
  };

  const saveSiteConfig = async (patch: Partial<SiteConfig>): Promise<AuthResult> => {
    try {
      const { config } = await api<{ config: SiteConfig }>('PUT', '/config', patch);
      setSiteConfig(config);
      return { success: true };
    } catch (e) {
      return { success: false, message: errorMessage(e) };
    }
  };

  const updatePaymentGateway = (gateway: GatewayKey, data: Partial<PaymentGatewayItemConfig>) => {
    const current = pendingConfig.current.paymentGateways || siteConfig.paymentGateways;
    updateSiteConfig({ paymentGateways: { ...current, [gateway]: { ...current[gateway], ...data } } });
  };

  const mutate = async (run: () => Promise<void>, success?: string): Promise<boolean> => {
    try {
      await run();
      if (success) notify(success);
      return true;
    } catch (e) {
      notify(errorMessage(e), 'error');
      return false;
    }
  };

  const addCategory = (cat: Omit<Category, 'id'>) =>
    mutate(async () => {
      const { category } = await api<{ category: Category }>('POST', '/categories', cat);
      setCategories((prev) => [...prev, category]);
    }, 'Rayon créé.');

  const updateCategory = (cat: Category) =>
    mutate(async () => {
      const { category } = await api<{ category: Category }>('PUT', `/categories/${cat.id}`, cat);
      setCategories((prev) => prev.map((c) => (c.id === category.id ? category : c)));
    }, 'Rayon mis à jour.');

  const deleteCategory = (id: string) =>
    mutate(async () => {
      await api('DELETE', `/categories/${id}`);
      setCategories((prev) => prev.filter((c) => c.id !== id));
    }, 'Rayon supprimé.');

  const addProduct = (prod: Omit<Product, 'id'>) =>
    mutate(async () => {
      const { product } = await api<{ product: Product }>('POST', '/products', prod);
      setProducts((prev) => [product, ...prev]);
    }, 'Produit publié.');

  const updateProduct = (prod: Product) =>
    mutate(async () => {
      const { product } = await api<{ product: Product }>('PUT', `/products/${prod.id}`, prod);
      setProducts((prev) => prev.map((p) => (p.id === product.id ? product : p)));
    }, 'Produit mis à jour.');

  const deleteProduct = (id: string) =>
    mutate(async () => {
      await api('DELETE', `/products/${id}`);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    }, 'Produit supprimé.');

  // ---------------------------------------------------------------- commandes

  const applyOrder = (order: Order) => {
    const replace = (list: Order[]) => list.map((o) => (o.id === order.id ? order : o));
    setOrders(replace);
    setWorkOrders(replace);
  };

  const orderAction = async (orderId: string, action: string, body?: object): Promise<Order> => {
    try {
      const { order } = await api<{ order: Order }>('POST', `/orders/${orderId}/${action}`, body ?? {});
      applyOrder(order);
      return order;
    } finally {
      // Qu'elle réussisse ou non (commande déjà prise par un collègue...), on se recale sur le serveur.
      refreshOrders();
    }
  };

  const trackOrder = (order: Order) => {
    setOrders((prev) => (prev.some((o) => o.id === order.id) ? prev : [order, ...prev]));
    setSelectedOrderId(order.id);
  };

  const selectedOrder = useMemo(
    () => (selectedOrderId ? orders.find((o) => o.id === selectedOrderId) || workOrders.find((o) => o.id === selectedOrderId) || null : null),
    [selectedOrderId, orders, workOrders]
  );

  return (
    <AppContext.Provider
      value={{
        ready,
        currentUser,
        categories,
        products,
        cart,
        orders,
        workOrders,
        siteConfig,
        currency,
        deliveryMode,
        selectedCategoryFilter,
        searchQuery,
        activeView,
        selectedProduct,
        selectedOrder,
        isCartOpen,
        isAuthOpen,
        isCheckoutOpen,

        setCurrency,
        setDeliveryMode,
        setSelectedCategoryFilter,
        setSearchQuery,
        setActiveView,
        setSelectedProduct,
        setSelectedOrder: (o) => setSelectedOrderId(o ? o.id : null),
        setIsCartOpen,
        setIsAuthOpen,
        setIsCheckoutOpen,

        formatPrice,
        convertUsdToCdf,
        formatDualPrice,
        notify,

        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        cartTotalUsd,
        cartTotalCdf,
        cartItemsCount,

        login,
        register,
        loginWithGoogle,
        requestPasswordReset,
        resetPassword,
        resendVerification,
        resetToken,
        setResetToken,
        logout,
        updateProfile,
        homeViewFor,

        updateSiteConfig,
        saveSiteConfig,
        updatePaymentGateway,
        addCategory,
        updateCategory,
        deleteCategory,
        addProduct,
        updateProduct,
        deleteProduct,

        refreshOrders,
        orderAction,
        trackOrder,

        deferredPrompt,
        setDeferredPrompt,
      }}
    >
      {children}
      <div className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-[70] flex flex-col items-center gap-2 pointer-events-none px-4 w-full max-w-md">
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.kind === 'error' ? 'alert' : 'status'}
            className={`px-4 py-3 rounded-2xl shadow-2xl text-sm font-bold text-white text-center ${
              t.kind === 'error' ? 'bg-red-600' : 'bg-emerald-600'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
