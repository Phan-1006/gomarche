export type Role =
  | 'admin'
  | 'category_agent' // gère le catalogue de ses rayons
  | 'order_agent' // prépare (réclame) les commandes en magasin
  | 'cashier' // suit et valide les paiements
  | 'delivery_driver'
  | 'customer';

export type StaffRole = Exclude<Role, 'admin' | 'customer'>;

export const STAFF_ROLES: StaffRole[] = ['order_agent', 'delivery_driver', 'cashier', 'category_agent'];

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrateur',
  category_agent: 'Agent de rayon (catalogue)',
  order_agent: 'Agent préparateur de commandes',
  cashier: 'Agent caissier',
  delivery_driver: 'Livreur',
  customer: 'Client',
};

export type Currency = 'USD' | 'CDF';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  emailVerified?: boolean;
  avatar?: string;
  phone?: string;
  address?: string;
  commune?: string;
  assignedCategoryIds?: string[]; // rayons d'un agent de rayon (vide = tous)
  loyaltyPoints: number;
  hasPassword?: boolean;
}

// Employé nommé par l'admin via son adresse e-mail
export interface StaffMember {
  email: string;
  role: StaffRole;
  name: string;
  phone?: string;
  assignedCategoryIds?: string[];
  active: boolean;
  createdAt: number;
  // renseignés par le serveur
  hasAccount?: boolean;
  lastLoginAt?: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  iconName: string;
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

export type GatewayKey = 'airtel' | 'orange' | 'mpesa' | 'afrimoney';

export const METHOD_TO_GATEWAY: Record<PaymentMethod, GatewayKey> = {
  airtel_money: 'airtel',
  orange_money: 'orange',
  mpesa: 'mpesa',
  afrimoney: 'afrimoney',
};

// Informations publiques d'un opérateur. Aucune clé secrète ici : les secrets vivent dans les
// variables d'environnement du serveur.
export interface PaymentGatewayItemConfig {
  enabled: boolean;
  displayName?: string;
  merchantNumber: string; // numéro marchand vers lequel le client envoie l'argent
  merchantName: string; // nom affiché chez l'opérateur lors du transfert
  phonePrefix: string;
  customLogoUrl?: string;
  instructions?: string;
}

export type PaymentGatewayConfig = Record<GatewayKey, PaymentGatewayItemConfig>;

export type OrderStatus =
  | 'awaiting_payment'
  | 'confirmed' // paiement (ou garantie) validé, à préparer
  | 'preparing'
  | 'ready'
  | 'in_delivery'
  | 'delivered'
  | 'cancelled';

export interface OrderCustomerInfo {
  name: string;
  email: string;
  phone: string;
  address: string;
  quartierGoma: string;
  city: 'Goma';
  deliveryNotes?: string;
  coordinates?: LatLng;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface DeliverySlotConfig {
  id: string;
  label: string;
  startTime: string; // "HH:MM" heure de Goma
  endTime: string; // "HH:MM"
  priceUsd: number;
  isExpress?: boolean;
  active: boolean;
}

export interface DeliveryHoursConfig {
  start: string; // première livraison possible "HH:MM"
  end: string; // dernière livraison "HH:MM"
  prepMinutes: number; // délai minimal de préparation avant livraison
  expressMinutes: number; // délai promis en express
  daysAhead: number; // jours réservables à l'avance
  closedWeekdays: number[]; // 0 = dimanche
}

// Créneau concret (date + fenêtre) calculé par le serveur
export interface DeliveryOption {
  key: string; // `${date}|${slotId}`
  slotId: string;
  date: string; // YYYY-MM-DD (Goma)
  dayLabel: string; // "Aujourd'hui", "Demain", "lun. 5 oct."
  label: string;
  startTime: string;
  endTime: string;
  priceUsd: number;
  isExpress: boolean;
  recommended: boolean;
}

export type PaymentMode = 'prepaid' | 'cod';

export type PaymentPurpose = 'order_total' | 'delivery_deposit' | 'cod_balance';

export type PaymentStatus =
  | 'pending' // en attente du client
  | 'submitted' // référence envoyée, à vérifier par la caisse
  | 'confirmed'
  | 'rejected'
  | 'refund_due'
  | 'refunded';

export interface PaymentRecord {
  id: string;
  purpose: PaymentPurpose;
  method: PaymentMethod | 'cash';
  amountUsd: number;
  amountCdf: number;
  status: PaymentStatus;
  payerPhone?: string;
  transactionRef?: string;
  submittedAt?: number;
  confirmedAt?: number;
  confirmedByName?: string;
  collectedByDriverAt?: number; // espèces encaissées par le livreur
  note?: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  brand: string;
  unit: string;
  image: string;
  unitPriceUsd: number; // prix remisé figé à la commande
  quantity: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  createdAt: number;
  userId: string;
  customer: OrderCustomerInfo;
  items: OrderItem[];
  subtotalUsd: number;
  deliveryFeeUsd: number;
  totalUsd: number;
  exchangeRate: number; // taux figé à la commande
  totalCdf: number;
  paymentMode: PaymentMode;
  payments: PaymentRecord[];
  status: OrderStatus;
  deliveryMode: 'delivery' | 'drive';
  deliverySlotId: string;
  deliveryDate: string; // YYYY-MM-DD
  deliverySlotName: string;
  deliveryWindowStart: number; // timestamp
  deliveryWindowEnd: number;
  preparerId?: string;
  preparerName?: string;
  deliveryDriverId?: string;
  deliveryDriverName?: string;
  deliveryDriverPhone?: string;
  claimedByDriverAt?: number;
  departedAt?: number;
  deliveredAt?: number;
  cancelledAt?: number;
  cancelReason?: string;
  loyaltyPointsEarned: number;
  confirmationCode?: string; // visible uniquement par le client (et l'admin)
  driverLocation?: LatLng & { at: number; accuracy?: number };
  unreadHint?: number; // nb de messages de l'autre partie
  history: { at: number; status: OrderStatus; by: string }[];
}

export interface ChatMessage {
  id: string;
  orderId: string;
  senderId: string;
  senderName: string;
  senderRole: Role;
  text: string;
  at: number;
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
  storeLocation: LatLng;

  deliveryHours: DeliveryHoursConfig;
  deliverySlots: DeliverySlotConfig[];

  heroBanners: HeroBanner[];
  paymentGateways: PaymentGatewayConfig;
  codEnabled: boolean; // paiement à la livraison (garantie = frais de livraison)
  paymentTimeoutMinutes: number; // annulation auto d'une commande impayée
  maxActiveDeliveriesPerDriver: number;
  networkIcons: Record<GatewayKey, boolean>;

  // renseignés par le serveur (lecture seule)
  updatedAt?: number;
  turnstileSiteKey?: string;
  lensEnabled?: boolean;
}

export interface AuditEntry {
  id: string;
  at: number;
  actorEmail: string;
  action: string;
  detail: string;
}

export interface LensSuggestion {
  name?: string;
  brand?: string;
  description?: string;
  unit?: string;
  images: { url: string; thumb: string; source: string; title?: string }[];
}
