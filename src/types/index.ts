export type Role = 'admin' | 'category_agent' | 'delivery_driver' | 'customer';

export type Currency = 'USD' | 'CDF';

export interface UserActivity {
  id: string;
  userId: string;
  type: 'login' | 'order_placed' | 'payment_confirmed' | 'order_cancelled' | 'delivery_confirmed';
  title: string;
  description: string;
  timestamp: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  password?: string;
  avatar?: string;
  phone?: string;
  address?: string;
  commune?: string;
  assignedCategoryId?: string; // For category agent
  loyaltyPoints: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  iconName: string;
  assignedAgentId?: string;
  assignedAgentName?: string;
  assignedAgentEmail?: string;
  isPromoCategory?: boolean;
  displayOrder: number;
}

export interface Product {
  id: string;
  name: string;
  categoryId: string;
  brand: string;
  description: string;
  priceUsd: number;
  discountPercent?: number; // e.g. 20 for -20%
  unit: string; // e.g. "kg", "pièce", "bouteille 1.5L", "pack de 6"
  rating: number;
  reviewCount: number;
  image: string;
  inStock: boolean;
  stockCount: number;
  isPromo?: boolean;
  isFoodEssential?: boolean;
  isPopular?: boolean;
  isNewArrival?: boolean;
  barcode?: string;
  origin?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export type PaymentMethod = 'airtel_money' | 'orange_money' | 'mpesa' | 'afrimoney';

export interface PaymentGatewayConfig {
  airtel: {
    merchantId: string;
    apiKey: string;
    secretKey: string;
    webhookUrl: string;
    enabled: boolean;
    sandboxMode: boolean;
    phonePrefix: string;
  };
  orange: {
    merchantId: string;
    apiKey: string;
    secretKey: string;
    webhookUrl: string;
    enabled: boolean;
    sandboxMode: boolean;
    phonePrefix: string;
  };
  mpesa: {
    merchantId: string;
    apiKey: string;
    passKey: string;
    webhookUrl: string;
    enabled: boolean;
    sandboxMode: boolean;
    phonePrefix: string;
  };
  afrimoney: {
    merchantId: string;
    apiKey: string;
    secretKey: string;
    webhookUrl: string;
    enabled: boolean;
    sandboxMode: boolean;
    phonePrefix: string;
  };
}

export type OrderStatus = 'paid' | 'preparing' | 'in_delivery' | 'delivered' | 'cancelled';

export interface OrderCustomerInfo {
  name: string;
  email: string;
  phone: string;
  address: string;
  quartierGoma: string; // Exclusively Goma quartiers
  city: 'Goma';
  deliveryNotes?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface DeliverySlotConfig {
  id: string;
  label: string;
  timeRange: string;
  priceUsd: number;
  isExpress?: boolean;
  active: boolean;
}

export interface Order {
  id: string;
  orderNumber: string;
  date: string;
  createdAtTimestamp: number;
  customer: OrderCustomerInfo;
  items: CartItem[];
  subtotalUsd: number;
  subtotalCdf: number;
  deliveryFeeUsd: number;
  deliveryFeeCdf: number;
  totalUsd: number;
  totalCdf: number;
  paymentMethod: PaymentMethod;
  paymentStatus: 'pending' | 'completed' | 'failed';
  transactionRef: string;
  status: OrderStatus;
  deliveryDriverId?: string;
  deliveryDriverName?: string;
  deliveryDriverPhone?: string;
  deliveryMode: 'delivery' | 'drive';
  deliverySlotId: string;
  deliverySlotName: string;
  loyaltyPointsEarned: number;
  confirmationCode: string; // 6-digit secure handover PIN e.g. "GM-9412" or "841920"
  cancellationDeadlineTimestamp: number; // 24 hours after creation
  deliveredAtTimestamp?: number;
  confirmedByDriver?: boolean;
  cancelledAtTimestamp?: number;
  cancelReason?: string;
  driverCurrentLocation?: {
    lat: number;
    lng: number;
    estimatedMinutesRemaining: number;
  };
}

export interface HeroBanner {
  id: string;
  image: string;
  tag: string;
  title: string;
  subtitle: string;
  ctaText: string;
  categoryId?: string;
  badgeBg?: string;
}

export type ThemeStyle = 'classic_red' | 'emerald_fresh' | 'navy_modern' | 'warm_gold';

export interface SiteConfig {
  siteName: string;
  tagline: string;
  logoType: 'badge' | 'custom_url';
  customLogoUrl: string;
  pwaIconUrl: string;
  activeTheme: ThemeStyle;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  exchangeRateUsdToCdf: number; // e.g. 2850 CDF for 1 USD
  freeDeliveryThresholdUsd: number;
  
  // Store contact info editable by Admin
  storeAddress: string;
  storePhone: string;
  storeEmail: string;
  storeCity: string;
  storeOpeningHours: string;
  
  // Goma Delivery slots configured by Admin
  deliverySlots: DeliverySlotConfig[];
  
  heroBanners: HeroBanner[];
  paymentGateways: PaymentGatewayConfig;
  networkIcons: {
    airtel: boolean;
    orange: boolean;
    mpesa: boolean;
    afrimoney: boolean;
  };
  adminPassword?: string;
  googleClientId?: string;
}
