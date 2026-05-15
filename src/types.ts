export type OrderMode = 'WHATSAPP' | 'WEBSITE' | 'BOTH';

export interface PaymentGateway {
  enabled: boolean;
  apiKey?: string;
  clientId?: string;
  secretKey?: string;
  accountDetails?: string;
}

export interface PaymentSettings {
  stripe: PaymentGateway;
  paypal: PaymentGateway;
  bankTransfer: PaymentGateway;
  cod: PaymentGateway;
}

export interface AnalyticsSettings {
  googleAnalyticsId: string;
}

export type FeatureIcon = 'truck' | 'shield' | 'message-circle' | 'rotate-ccw' | 'zap' | 'credit-card' | 'gift' | 'badge-check';

export interface StoreFeature {
  id: string;
  title: string;
  subtitle?: string;
  icon: FeatureIcon;
  enabled: boolean;
}

export interface SocialLink {
  id: string;
  platform: string;
  url: string;
  enabled: boolean;
}

export interface DeviceConfig {
  headerStyle: 'standard' | 'minimal' | 'centered';
  headerTheme: 'light' | 'dark' | 'glass';
  isHeaderSticky: boolean;
  heroStyle: 'banner' | 'split' | 'minimal' | 'hidden';
  productGridCols: number;
  productCardStyle: 'grid' | 'list' | 'compact';
  showCategories: boolean;
  showFeatured: boolean;
  showNewsletter: boolean;
  footerStyle: 'simple' | 'detailed';
}

export type SectionType = 'HERO' | 'FEATURED_PRODUCTS' | 'CATEGORIES' | 'BANNER' | 'TESTIMONIALS' | 'NEWSLETTER' | 'ABOUT' | 'HTML_CONTENT' | 'CATEGORY_SLIDER' | 'SALE_BANNER';

export interface StoreSection {
  id: string;
  type: SectionType;
  title: string;
  subtitle?: string;
  enabled: boolean;
  order: number;
  config?: {
    height?: 'small' | 'medium' | 'large' | 'viewport' | 'thin';
    textAlign?: 'left' | 'center' | 'right';
    buttonText?: string;
    imageUrl?: string;
    gallery?: string[];
    backgroundColor?: string;
    textColor?: string;
    padding?: 'none' | 'small' | 'medium' | 'large';
    html?: string;
    isSlider?: boolean;
    showArrows?: boolean;
    autoPlay?: boolean;
    itemsPerRow?: number;
  };
}

export interface ThemeSettings {
  activeTemplate: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  fontSans: string;
  fontDisplay: string;
  shopName: string;
  shopDescription: string;
  currency: string;
  currencySymbol: string;
  whatsappNumber: string;
  orderMode: OrderMode;
  logoUrl?: string;
  heroBannerUrl?: string;
  // Device specific layouts
  desktop: DeviceConfig;
  tablet: DeviceConfig;
  mobile: DeviceConfig;
  // Payment Gateways
  paymentSettings: PaymentSettings;
  // Analytics
  analytics: AnalyticsSettings;
  trustFeatures: StoreFeature[];
  socialLinks: SocialLink[];
  // Dynamic sections
  sections: StoreSection[];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  order?: number;
  createdAt: number;
}

export interface ProductVariant {
  id: string;
  name: string;
  price: number;
  stock: number;
}

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  discountPrice?: number;
  images: string[];
  stock: number;
  isFeatured: boolean;
  order?: number;
  colors?: string[];
  sizes?: string[];
  variants?: ProductVariant[];
  createdAt: number;
}

export interface Review {
  id: string;
  productId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: number;
}

export interface OrderItem {
  productId: string;
  variantId?: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  items: OrderItem[];
  total: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED';
  createdAt: number;
}
