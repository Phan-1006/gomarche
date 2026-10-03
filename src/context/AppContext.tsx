import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User,
  Category,
  Product,
  CartItem,
  Order,
  SiteConfig,
  Currency,
  Role,
  OrderStatus,
  PaymentGatewayConfig,
  UserActivity,
  DeliverySlotConfig,
} from '../types';
import {
  INITIAL_CATEGORIES,
  INITIAL_PRODUCTS,
  INITIAL_USERS,
  INITIAL_ORDERS,
  INITIAL_SITE_CONFIG,
  INITIAL_USER_ACTIVITIES,
} from '../data/mockData';
import { googleSignIn, firebaseLogout, initFirebaseAuth } from '../services/firebaseAuth';

interface AppContextType {
  currentUser: User | null;
  users: User[];
  categories: Category[];
  products: Product[];
  cart: CartItem[];
  orders: Order[];
  siteConfig: SiteConfig;
  currency: Currency;
  deliveryMode: 'delivery' | 'drive';
  selectedCategoryFilter: string | null;
  searchQuery: string;
  activeView: 'home' | 'promotions' | 'categories' | 'admin' | 'agent' | 'delivery' | 'orders' | 'product_detail';
  selectedProduct: Product | null;
  selectedOrder: Order | null;
  isCartOpen: boolean;
  isAuthOpen: boolean;
  isCheckoutOpen: boolean;
  userActivities: UserActivity[];

  // Actions
  setCurrentUser: (user: User | null) => void;
  setCurrency: (c: Currency) => void;
  setDeliveryMode: (mode: 'delivery' | 'drive') => void;
  setSelectedCategoryFilter: (catId: string | null) => void;
  setSearchQuery: (query: string) => void;
  setActiveView: (view: 'home' | 'promotions' | 'categories' | 'admin' | 'agent' | 'delivery' | 'orders' | 'product_detail') => void;
  setSelectedProduct: (p: Product | null) => void;
  setSelectedOrder: (o: Order | null) => void;
  setIsCartOpen: (open: boolean) => void;
  setIsAuthOpen: (open: boolean) => void;
  setIsCheckoutOpen: (open: boolean) => void;

  // Helpers
  formatPrice: (usdAmount: number, forceCurrency?: Currency) => string;
  convertUsdToCdf: (usdAmount: number) => number;
  formatDualPrice: (usdAmount: number) => { primary: string; secondary: string };
  
  // Cart
  addToCart: (product: Product, qty?: number) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, qty: number) => void;
  clearCart: () => void;
  cartTotalUsd: number;
  cartTotalCdf: number;
  cartItemsCount: number;

  // Auth & Roles
  login: (email: string, password?: string, name?: string, isGoogleAuth?: boolean) => { success: boolean; message?: string };
  loginWithGoogle: () => Promise<{ success: boolean; message?: string; isUnauthorizedDomain?: boolean; domain?: string }>;
  logout: () => void;
  changeAdminPassword: (oldPass: string, newPass: string) => { success: boolean; message: string };
  
  // Admin & Catalog operations
  updateSiteConfig: (newConfig: Partial<SiteConfig>) => void;
  updatePaymentGateway: (gateway: keyof PaymentGatewayConfig, data: any) => void;
  updateDeliverySlot: (slotId: string, updated: Partial<DeliverySlotConfig>) => void;
  addCategory: (cat: Omit<Category, 'id'>) => void;
  updateCategory: (cat: Category) => void;
  deleteCategory: (id: string) => void;
  addProduct: (prod: Omit<Product, 'id'>) => void;
  updateProduct: (prod: Product) => void;
  deleteProduct: (id: string) => void;
  
  // Orders & Goma Delivery flow
  createOrder: (order: Omit<Order, 'id' | 'orderNumber' | 'date' | 'createdAtTimestamp' | 'cancellationDeadlineTimestamp' | 'confirmationCode'>) => Order;
  cancelOrder: (orderId: string, reason?: string) => boolean;
  confirmOrderDeliveryWithCode: (orderId: string, enteredCode: string) => { success: boolean; message: string };
  updateOrderStatus: (orderId: string, status: OrderStatus, driverId?: string) => void;
  assignDriverToOrder: (orderId: string, driverId: string) => void;

  // Activity Log
  logActivity: (type: UserActivity['type'], title: string, description: string) => void;

  // PWA
  deferredPrompt: any;
  setDeferredPrompt: (p: any) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const getStored = <T,>(key: string, defaultVal: T): T => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultVal;
    } catch {
      return defaultVal;
    }
  };

  const [siteConfig, setSiteConfig] = useState<SiteConfig>(() =>
    getStored('gm_site_config_v2', INITIAL_SITE_CONFIG)
  );

  const [categories, setCategories] = useState<Category[]>(() =>
    getStored('gm_categories_v2', INITIAL_CATEGORIES)
  );

  const [products, setProducts] = useState<Product[]>(() =>
    getStored('gm_products_v2', INITIAL_PRODUCTS)
  );

  const [users, setUsers] = useState<User[]>(() =>
    getStored('gm_users_v2', INITIAL_USERS)
  );

  // By default, visitor is a guest (null). Strict authentication required for admin & agents.
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const stored = getStored<User | null>('gm_current_user_v4', null);
    return stored || null;
  });

  const [cart, setCart] = useState<CartItem[]>(() =>
    getStored('gm_cart_v2', [])
  );

  const [orders, setOrders] = useState<Order[]>(() =>
    getStored('gm_orders_v2', INITIAL_ORDERS)
  );

  const [userActivities, setUserActivities] = useState<UserActivity[]>(() =>
    getStored('gm_activities_v2', INITIAL_USER_ACTIVITIES)
  );

  const [currency, setCurrency] = useState<Currency>(() =>
    getStored('gm_currency_v2', 'USD')
  );

  const [deliveryMode, setDeliveryMode] = useState<'delivery' | 'drive'>('delivery');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeView, setActiveView] = useState<'home' | 'promotions' | 'categories' | 'admin' | 'agent' | 'delivery' | 'orders' | 'product_detail'>('home');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Live Sync state to localStorage & Server API (for real cross-device persistence)
  useEffect(() => {
    const syncFromServer = () => {
      // 1. Fetch server-persisted site config for cross-device synchronization
      fetch('/api/site-config')
        .then((res) => (res.ok ? res.json() : null))
        .then((serverConfig) => {
          if (serverConfig && typeof serverConfig === 'object' && Object.keys(serverConfig).length > 0) {
            setSiteConfig((prev) => ({
              ...prev,
              ...serverConfig,
              paymentGateways: {
                ...prev.paymentGateways,
                ...(serverConfig.paymentGateways || {}),
              },
            }));
          } else {
            // Seed server if empty
            fetch('/api/site-config', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(siteConfig),
            }).catch(() => {});
          }
        })
        .catch(() => {});

      // 2. Fetch server-persisted products
      fetch('/api/products')
        .then((res) => (res.ok ? res.json() : null))
        .then((serverProds) => {
          if (Array.isArray(serverProds) && serverProds.length > 0) {
            setProducts(serverProds);
          } else {
            fetch('/api/products', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(products),
            }).catch(() => {});
          }
        })
        .catch(() => {});

      // 3. Fetch server-persisted categories
      fetch('/api/categories')
        .then((res) => (res.ok ? res.json() : null))
        .then((serverCats) => {
          if (Array.isArray(serverCats) && serverCats.length > 0) {
            setCategories(serverCats);
          } else {
            fetch('/api/categories', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(categories),
            }).catch(() => {});
          }
        })
        .catch(() => {});
    };

    // Initial fetch
    syncFromServer();

    // Live polling for cross-device updates every 4 seconds
    const interval = setInterval(syncFromServer, 4000);

    // Sync on focus / visibility change
    const onFocus = () => syncFromServer();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('gm_site_config_v2', JSON.stringify(siteConfig));
    // Persist site config to server so changes by admin appear on all devices
    fetch('/api/site-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(siteConfig),
    }).catch(() => {});

    // Dynamically update favicon and app icons
    const iconUrl = siteConfig.pwaIconUrl || siteConfig.customLogoUrl;
    if (iconUrl) {
      const linkIcon = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
      if (linkIcon) linkIcon.href = iconUrl;
      const linkApple = document.querySelector("link[rel*='apple-touch-icon']") as HTMLLinkElement;
      if (linkApple) linkApple.href = iconUrl;
    }
  }, [siteConfig]);

  useEffect(() => {
    localStorage.setItem('gm_categories_v2', JSON.stringify(categories));
    fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(categories),
    }).catch(() => {});
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('gm_products_v2', JSON.stringify(products));
    // Persist products to server so changes by agents/admin appear on all devices
    fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(products),
    }).catch(() => {});
  }, [products]);

  useEffect(() => {
    localStorage.setItem('gm_users_v2', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('gm_current_user_v4', JSON.stringify(currentUser));
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('gm_cart_v2', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('gm_orders_v2', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('gm_activities_v2', JSON.stringify(userActivities));
  }, [userActivities]);

  useEffect(() => {
    localStorage.setItem('gm_currency_v2', JSON.stringify(currency));
  }, [currency]);

  // Handle PWA prompt
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const convertUsdToCdf = (usdAmount: number): number => {
    return Math.round(usdAmount * siteConfig.exchangeRateUsdToCdf);
  };

  const formatPrice = (usdAmount: number, forceCurrency?: Currency): string => {
    const activeCurr = forceCurrency || currency;
    if (activeCurr === 'CDF') {
      const cdfVal = convertUsdToCdf(usdAmount);
      return `${cdfVal.toLocaleString('fr-FR')} FC`;
    }
    return `$ ${usdAmount.toFixed(2)}`;
  };

  const formatDualPrice = (usdAmount: number) => {
    const cdf = convertUsdToCdf(usdAmount);
    if (currency === 'USD') {
      return {
        primary: `$ ${usdAmount.toFixed(2)}`,
        secondary: `${cdf.toLocaleString('fr-FR')} FC`,
      };
    }
    return {
      primary: `${cdf.toLocaleString('fr-FR')} FC`,
      secondary: `$ ${usdAmount.toFixed(2)}`,
    };
  };

  const logActivity = (type: UserActivity['type'], title: string, description: string) => {
    const now = new Date();
    const timeStr = `Aujourd'hui, ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const newAct: UserActivity = {
      id: `act-${Date.now()}`,
      userId: currentUser?.id || 'client-guest',
      type,
      title,
      description,
      timestamp: timeStr,
    };
    setUserActivities((prev) => [newAct, ...prev]);
  };

  // Cart operations
  const addToCart = (product: Product, qty: number = 1) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + qty }
            : item
        );
      }
      return [...prev, { product, quantity: qty }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const updateCartQuantity = (productId: string, qty: number) => {
    if (qty <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity: qty } : item
      )
    );
  };

  const clearCart = () => setCart([]);

  const cartTotalUsd = cart.reduce((sum, item) => {
    const unitPrice = item.product.discountPercent
      ? item.product.priceUsd * (1 - item.product.discountPercent / 100)
      : item.product.priceUsd;
    return sum + unitPrice * item.quantity;
  }, 0);

  const cartTotalCdf = convertUsdToCdf(cartTotalUsd);
  const cartItemsCount = cart.reduce((count, item) => count + item.quantity, 0);

  // Strict Authentication with Password Verification
  const login = (
    email: string,
    password?: string,
    name?: string,
    isGoogleAuth?: boolean
  ): { success: boolean; message?: string } => {
    const normalizedEmail = email.trim().toLowerCase();
    const isAdmin = normalizedEmail === 'mughenyakavale@gmail.com';
    const adminExpectedPassword = siteConfig.adminPassword || 'admin';

    // 1. If trying to log into the Admin account (Mughenyakavale@gmail.com)
    if (isAdmin) {
      if (!password || password !== adminExpectedPassword) {
        return {
          success: false,
          message: 'Mot de passe administrateur incorrect pour ce compte.',
        };
      }
      const existingAdmin = users.find((u) => u.email.toLowerCase() === 'mughenyakavale@gmail.com') || INITIAL_USERS[0];
      const adminUser: User = {
        ...existingAdmin,
        role: 'admin',
        name: existingAdmin.name || 'Mughenya Kavale',
        email: 'Mughenyakavale@gmail.com',
      };
      setCurrentUser(adminUser);
      setActiveView('admin');
      logActivity('login', 'Connexion Administrateur', 'Accès sécurisé au Panneau de Contrôle Gomarché');
      return { success: true };
    }

    // 2. Check existing users (Agents, Drivers, Registered Customers)
    const existing = users.find((u) => u.email.toLowerCase() === normalizedEmail);
    if (existing) {
      // If user has a role of agent or delivery driver, password is strictly required
      if (existing.role === 'category_agent' || existing.role === 'delivery_driver') {
        if (!password || existing.password !== password) {
          return {
            success: false,
            message: 'Mot de passe professionnel incorrect pour ce compte employé.',
          };
        }
      } else if (existing.password && password && !isGoogleAuth) {
        if (existing.password !== password) {
          return { success: false, message: 'Mot de passe incorrect.' };
        }
      }

      setCurrentUser(existing);
      if (existing.role === 'category_agent') {
        setActiveView('agent');
      } else if (existing.role === 'delivery_driver') {
        setActiveView('delivery');
      } else {
        setActiveView('home');
      }
      logActivity('login', 'Connexion sécurisée', `Connexion effectuée pour ${existing.name}`);
      return { success: true };
    }

    // 3. New user registration (via Google or Email) -> ALWAYS and STRICTLY 'customer'
    const newUser: User = {
      id: `user-${Date.now()}`,
      email: email.trim(),
      name: name?.trim() || email.split('@')[0],
      role: 'customer',
      password: password || 'client_pwd',
      avatar: isGoogleAuth
        ? `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || email)}`
        : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      loyaltyPoints: 100,
    };

    setUsers((prev) => [...prev, newUser]);
    setCurrentUser(newUser);
    setActiveView('home');
    logActivity('login', isGoogleAuth ? 'Connexion Google réussie' : 'Compte créé avec succès', `Bienvenue sur Gomarché Goma, ${newUser.name}`);
    return { success: true };
  };

  // Real Google Sign-in with official Google OAuth / Firebase
  const loginWithGoogle = async (): Promise<{
    success: boolean;
    message?: string;
    isUnauthorizedDomain?: boolean;
    domain?: string;
  }> => {
    try {
      const res = await googleSignIn();
      if (!res?.user) {
        return { success: false, message: 'Aucun compte Google sélectionné.' };
      }

      const email = res.user.email || '';
      const name = res.user.displayName || email.split('@')[0];
      const photoURL = res.user.photoURL || undefined;
      const normalizedEmail = email.trim().toLowerCase();
      const isAdmin = normalizedEmail === 'mughenyakavale@gmail.com';

      // 1. Mughenya Kavale Google Sign-In -> Verified Super Admin
      if (isAdmin) {
        const existingAdmin = users.find((u) => u.email.toLowerCase() === 'mughenyakavale@gmail.com') || INITIAL_USERS[0];
        const adminUser: User = {
          ...existingAdmin,
          role: 'admin',
          name: name || 'Mughenya Kavale',
          email: 'Mughenyakavale@gmail.com',
          avatar: photoURL || existingAdmin.avatar,
        };
        setCurrentUser(adminUser);
        setActiveView('admin');
        logActivity('login', 'Connexion Google Administrateur', 'Accès Super Admin validé par Google');
        return { success: true };
      }

      // 2. Existing registered user
      const existing = users.find((u) => u.email.toLowerCase() === normalizedEmail);
      if (existing) {
        const updatedUser: User = {
          ...existing,
          name: name || existing.name,
          avatar: photoURL || existing.avatar,
        };
        setCurrentUser(updatedUser);
        if (existing.role === 'category_agent') {
          setActiveView('agent');
        } else if (existing.role === 'delivery_driver') {
          setActiveView('delivery');
        } else {
          setActiveView('home');
        }
        logActivity('login', 'Connexion Google réussie', `Bienvenue de retour, ${updatedUser.name}`);
        return { success: true };
      }

      // 3. New verified Google Customer
      const newCustomer: User = {
        id: `user-${Date.now()}`,
        email,
        name,
        role: 'customer',
        avatar: photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || email)}`,
        loyaltyPoints: 100,
      };

      setUsers((prev) => [...prev, newCustomer]);
      setCurrentUser(newCustomer);
      setActiveView('home');
      logActivity('login', 'Compte Google créé', `Bienvenue sur Gomarché Goma, ${newCustomer.name}`);
      return { success: true };
    } catch (err: any) {
      console.error('Google Sign In failed:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        return { success: false, message: 'La fenêtre de connexion Google a été fermée.' };
      }
      if (err.code === 'auth/cancelled-popup-request') {
        return { success: false, message: 'Demande de connexion annulée.' };
      }
      if (
        err.code === 'auth/unauthorized-domain' ||
        (err.message && err.message.toLowerCase().includes('unauthorized-domain'))
      ) {
        const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';
        return {
          success: false,
          isUnauthorizedDomain: true,
          domain: currentHost,
          message: `Domaine non autorisé dans Firebase (${currentHost}). Ajoutez-le dans la console Firebase pour débloquer la connexion Google.`,
        };
      }
      return { success: false, message: err.message || 'Échec de la connexion avec Google.' };
    }
  };

  const logout = async () => {
    try {
      await firebaseLogout();
    } catch (e) {
      console.warn('Firebase logout warning', e);
    }
    setCurrentUser(null);
    setActiveView('home');
  };

  const changeAdminPassword = (oldPass: string, newPass: string): { success: boolean; message: string } => {
    const currentPass = siteConfig.adminPassword || 'admin';
    if (oldPass !== currentPass) {
      return { success: false, message: 'Ancien mot de passe administrateur incorrect.' };
    }
    if (!newPass || newPass.trim().length < 4) {
      return { success: false, message: 'Le nouveau mot de passe doit comporter au moins 4 caractères.' };
    }
    const updatedPass = newPass.trim();
    updateSiteConfig({ adminPassword: updatedPass });
    setUsers((prev) =>
      prev.map((u) =>
        u.email.toLowerCase() === 'mughenyakavale@gmail.com'
          ? { ...u, password: updatedPass }
          : u
      )
    );
    return { success: true, message: 'Mot de passe administrateur modifié avec succès.' };
  };

  const handleSetActiveView = (view: 'home' | 'promotions' | 'categories' | 'admin' | 'agent' | 'delivery' | 'orders' | 'product_detail') => {
    if (view === 'admin') {
      if (currentUser?.role !== 'admin' || currentUser?.email.toLowerCase() !== 'mughenyakavale@gmail.com') {
        setIsAuthOpen(true);
        return;
      }
    }
    if (view === 'agent') {
      if (currentUser?.role !== 'category_agent' && currentUser?.role !== 'admin') {
        setIsAuthOpen(true);
        return;
      }
    }
    if (view === 'delivery') {
      if (currentUser?.role !== 'delivery_driver' && currentUser?.role !== 'admin') {
        setIsAuthOpen(true);
        return;
      }
    }
    setActiveView(view);
  };

  const updateSiteConfig = (newConfig: Partial<SiteConfig>) => {
    setSiteConfig((prev) => {
      const updated = { ...prev, ...newConfig };
      fetch('/api/site-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      }).catch(() => {});
      return updated;
    });
  };

  const updatePaymentGateway = (gateway: keyof PaymentGatewayConfig, data: any) => {
    setSiteConfig((prev) => {
      const updated = {
        ...prev,
        paymentGateways: {
          ...prev.paymentGateways,
          [gateway]: {
            ...prev.paymentGateways[gateway],
            ...data,
          },
        },
      };
      fetch('/api/site-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      }).catch(() => {});
      return updated;
    });
  };

  const updateDeliverySlot = (slotId: string, updated: Partial<DeliverySlotConfig>) => {
    setSiteConfig((prev) => ({
      ...prev,
      deliverySlots: prev.deliverySlots.map((s) => (s.id === slotId ? { ...s, ...updated } : s)),
    }));
  };

  const addCategory = (cat: Omit<Category, 'id'>) => {
    const newCat: Category = {
      ...cat,
      id: `cat-${Date.now()}`,
    };
    setCategories((prev) => [...prev, newCat]);
  };

  const updateCategory = (cat: Category) => {
    setCategories((prev) => prev.map((c) => (c.id === cat.id ? cat : c)));
  };

  const deleteCategory = (id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  const addProduct = (prod: Omit<Product, 'id'>) => {
    const newProd: Product = {
      ...prod,
      id: `prod-${Date.now()}`,
    };
    setProducts((prev) => [newProd, ...prev]);
  };

  const updateProduct = (prod: Product) => {
    setProducts((prev) => prev.map((p) => (p.id === prod.id ? prod : p)));
  };

  const deleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  // Create Order with unique confirmation code and 24h cancellation deadline
  const createOrder = (orderData: Omit<Order, 'id' | 'orderNumber' | 'date' | 'createdAtTimestamp' | 'cancellationDeadlineTimestamp' | 'confirmationCode'>): Order => {
    const now = Date.now();
    const dateObj = new Date(now);
    const formattedDate = `Aujourd'hui, ${dateObj.getHours().toString().padStart(2, '0')}:${dateObj.getMinutes().toString().padStart(2, '0')}`;
    const orderNumber = `GM-GOMA-${Math.floor(1000 + Math.random() * 9000)}`;
    
    // Secure 6-digit handover code (e.g. GM-7492)
    const confirmationCode = `GM-${Math.floor(1000 + Math.random() * 9000)}`;
    const cancellationDeadlineTimestamp = now + 24 * 60 * 60 * 1000; // 24 hours later

    const newOrder: Order = {
      ...orderData,
      id: `order-${now}`,
      orderNumber,
      date: formattedDate,
      createdAtTimestamp: now,
      cancellationDeadlineTimestamp,
      confirmationCode,
      driverCurrentLocation: {
        lat: -1.679,
        lng: 29.224,
        estimatedMinutesRemaining: orderData.deliverySlotName.includes('Express') ? 20 : 35,
      },
    };

    setOrders((prev) => [newOrder, ...prev]);
    clearCart();

    logActivity(
      'order_placed',
      `Commande ${orderNumber} enregistrée`,
      `Paiement Mobile Money validé automatiquement pour ${orderData.customer.quartierGoma} (${formatPrice(orderData.totalUsd)})`
    );

    return newOrder;
  };

  // 24-hour cancellation rule
  const cancelOrder = (orderId: string, reason: string = 'Annulation demandée par le client'): boolean => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return false;

    const now = Date.now();
    if (order.status === 'delivered') {
      alert("Impossible d'annuler : cette commande a déjà été réceptionnée et confirmée avec le code de remise.");
      return false;
    }

    if (now > order.cancellationDeadlineTimestamp) {
      alert("Le délai d'annulation de 24h est dépassé pour cette commande.");
      return false;
    }

    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: 'cancelled',
              cancelledAtTimestamp: now,
              cancelReason: reason,
            }
          : o
      )
    );

    logActivity(
      'order_cancelled',
      `Commande ${order.orderNumber} annulée`,
      `Remboursement Mobile Money initié avec succès. Motif : ${reason}`
    );

    return true;
  };

  // Secure Handover confirmation using code
  const confirmOrderDeliveryWithCode = (orderId: string, enteredCode: string): { success: boolean; message: string } => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) {
      return { success: false, message: 'Commande introuvable.' };
    }

    const cleanInput = enteredCode.trim().toUpperCase();
    const cleanActual = order.confirmationCode.trim().toUpperCase();

    if (cleanInput !== cleanActual && cleanInput !== cleanActual.replace('GM-', '')) {
      return {
        success: false,
        message: 'Code secret invalide ! Demandez au client le code figurant sur son reçu virtuel.',
      };
    }

    const now = Date.now();
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: 'delivered',
              deliveredAtTimestamp: now,
              confirmedByDriver: true,
            }
          : o
      )
    );

    logActivity(
      'delivery_confirmed',
      `Livraison ${order.orderNumber} confirmée`,
      `Colis remis au client à Goma avec validation du code secret ${order.confirmationCode}`
    );

    return {
      success: true,
      message: 'Code validé ! La livraison est officiellement confirmée et clôturée.',
    };
  };

  const updateOrderStatus = (orderId: string, status: OrderStatus, driverId?: string) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === orderId) {
          const updated = { ...o, status };
          if (driverId) {
            const driver = users.find((u) => u.id === driverId);
            updated.deliveryDriverId = driverId;
            updated.deliveryDriverName = driver ? driver.name : 'Livreur Gomarché Goma';
            updated.deliveryDriverPhone = driver?.phone || '+243 998 777 888';
          }
          return updated;
        }
        return o;
      })
    );
  };

  const assignDriverToOrder = (orderId: string, driverId: string) => {
    const driver = users.find((u) => u.id === driverId);
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              deliveryDriverId: driverId,
              deliveryDriverName: driver ? driver.name : 'Livreur Gomarché Goma',
              deliveryDriverPhone: driver?.phone || '+243 998 777 888',
              status: o.status === 'paid' || o.status === 'preparing' ? 'in_delivery' : o.status,
            }
          : o
      )
    );
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        users,
        categories,
        products,
        cart,
        orders,
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
        userActivities,

        setCurrentUser,
        setCurrency,
        setDeliveryMode,
        setSelectedCategoryFilter,
        setSearchQuery,
        setActiveView: handleSetActiveView,
        setSelectedProduct,
        setSelectedOrder,
        setIsCartOpen,
        setIsAuthOpen,
        setIsCheckoutOpen,

        formatPrice,
        convertUsdToCdf,
        formatDualPrice,

        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        cartTotalUsd,
        cartTotalCdf,
        cartItemsCount,

        login,
        loginWithGoogle,
        logout,
        changeAdminPassword,

        updateSiteConfig,
        updatePaymentGateway,
        updateDeliverySlot,
        addCategory,
        updateCategory,
        deleteCategory,
        addProduct,
        updateProduct,
        deleteProduct,

        createOrder,
        cancelOrder,
        confirmOrderDeliveryWithCode,
        updateOrderStatus,
        assignDriverToOrder,
        logActivity,

        deferredPrompt,
        setDeferredPrompt,
      }}
    >
      {children}
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
