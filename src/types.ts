export type OrderMode = 'WHATSAPP' | 'WEBSITE' | 'BOTH';

export interface PaymentGateway {
  enabled: boolean;
  apiKey?: string;
  clientId?: string;
  secretKey?: string;
  accountDetails?: string;
  // Rich Bank Transfer Details
  accountTitle?: string;
  bankName?: string;
  accountNumber?: string;
  iban?: string;
  qrCodeUrl?: string;
  instructions?: string;
}


export interface PaymentSettings {
  stripe: PaymentGateway;
  paypal: PaymentGateway;
  bankTransfer: PaymentGateway;
  cod: PaymentGateway;
}

export interface AnalyticsSettings {
  googleAnalyticsId: string;
  googleSearchConsoleId: string;
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

export type SectionType = 'HERO' | 'FEATURED_PRODUCTS' | 'CATEGORIES' | 'BANNER' | 'TESTIMONIALS' | 'NEWSLETTER' | 'ABOUT' | 'HTML_CONTENT' | 'CATEGORY_SLIDER' | 'SALE_BANNER' | 'CUSTOMIZER';

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

export interface PrintifyProviderSettings {
  apiKey: string;
  shopId: string;
}

export interface PrintifyEditorSettings {
  selected: 'devsfolk' | 'alternative';
  devsfolkEnabled: boolean;
  alternativeEnabled: boolean;
}

export interface PrintifyAiPreviewSettings {
  provider: 'gemini' | 'openai' | 'qwen' | 'anthropic' | 'deepseek';
  apiKey: string;
  maxPreviewImages: number;
  pipelinePrompt: string;
}

export interface PrintifyPreviewSettings {
  selected: 'devsfolk' | 'ai';
  devsfolkEnabled: boolean;
  aiEnabled: boolean;
  aiConfig: PrintifyAiPreviewSettings;
}

export interface PrintifyCharges {
  templateBasePrice?: number;
  designFee: number;
  editFee: number;
  sizeFees: Record<string, number>;
  placementFees: Record<string, number>;
}

export interface PrintifySyncSettings {
  mode: 'manual' | 'scheduled' | 'webhook';
  scheduleInterval: 'daily' | 'weekly' | 'hourly';
  autoSyncEnabled: boolean;
  lastSyncAt?: string;
  lastSyncStatus?: 'success' | 'failed' | 'pending';
}

export interface PrintifySettings {
  enabled: boolean;
  providerSettings: PrintifyProviderSettings;
  editor: PrintifyEditorSettings;
  preview: PrintifyPreviewSettings;
  charges: PrintifyCharges;
  sync: PrintifySyncSettings;
}

export interface PrintifyCatalogTemplate {
  id: string;
  productId?: string;
  blueprintId: number;
  printProviderId?: number;
  title: string;
  category?: string;
  brand?: string;
  model?: string;
  tags?: string[];
  productStatus?: string;
  description: string;
  images: string[];
  mockups?: string[];
  variantImages?: Record<string, string[]>;
  providers: any[];
  variants: any[];
  printAreas: any[];
  shipping: any[];
  syncDetails?: any;
  baseCost?: number;
  retailPrice?: number;
  sellingPrice?: number;
  variantSellingPrices?: Record<string, number>;
  colors?: string[];
  sizes?: string[];
  syncStatus?: 'raw' | 'published';
  isEnabled: boolean;
  lastSynced: string;
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
  faviconUrl?: string;
  heroBannerUrl?: string;
  contactRequired?: 'phone' | 'email';
  phoneFormat?: 'pakistan' | 'usa' | 'uk' | 'any' | 'custom';
  customPhonePlaceholder?: string;
  // DevsFolk Customizable Options
  devsfolkBgColor?: string;
  devsfolkNavbarColor?: string;
  devsfolkFooterColor?: string;
  devsfolkCatRatioDesktop?: 'square' | 'portrait' | 'portrait-tall' | 'landscape' | 'landscape-wide';
  devsfolkCatRatioTablet?: 'square' | 'portrait' | 'portrait-tall' | 'landscape' | 'landscape-wide';
  devsfolkCatRatioMobile?: 'square' | 'portrait' | 'portrait-tall' | 'landscape' | 'landscape-wide';
  devsfolkInitialCategoriesCountDesktop?: 1 | 2 | 3 | 4 | 5 | 'all';
  devsfolkInitialCategoriesCountTablet?: 1 | 2 | 3 | 4 | 5 | 'all';
  devsfolkInitialCategoriesCountMobile?: 1 | 2 | 3 | 4 | 5 | 'all';
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
  // Printify Integration
  printifySettings?: PrintifySettings;
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
  options?: any[];
  image_url?: string;
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
  isPrintify?: boolean;
  printifyProductId?: string;
  printifyCatalogId?: string;
}

export interface Review {
  id: string;
  productId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: number;
}

export interface PrintifyCustomization {
  designId?: string;
  customImageUrl?: string;
  customText?: string;
  textColor?: string;
  fontFamily?: string;
  textPosition?: { x: number; y: number; rotate: number; scale: number };
  imagePosition?: { x: number; y: number; rotate: number; scale: number };
  previewUrl?: string;
  printifyBlueprintId?: number;
  printifyPrintProviderId?: number;
  printifyVariantId?: number;
  printifyPrintAreas?: any;
}

export interface OrderItem {
  productId: string;
  variantId?: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  color?: string;
  size?: string;
  customization?: PrintifyCustomization;
  isPrintify?: boolean;
  printifyProductId?: string;
  printifyCatalogId?: string;
  printifyBlueprintId?: number;
  printifyPrintProviderId?: number;
  printifyVariantId?: number;
  printifyPrintAreas?: any;
}

export interface Order {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  shippingAddress?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    country?: string;
    region?: string;
    address1?: string;
    address2?: string;
    city?: string;
    zip?: string;
  };
  items: OrderItem[];
  total: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED' | 'ABANDONED';
  createdAt: number;
  paymentMethod?: string;
  notes?: string;
  printifyOrderId?: string | null;
  printifySyncStatus?: 'NOT_REQUIRED' | 'PENDING' | 'SYNCED' | 'FAILED';
  printifyErrorLog?: string | null;
}
