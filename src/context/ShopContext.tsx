import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ThemeSettings, Product, Category, Order, OrderItem, ProductVariant, Review, StoreFeature, SocialLink, PrintifyCustomization, PrintifyCatalogTemplate, StoreSection } from '../types';
import { TEMPLATES } from '../lib/templates';
import { hasSupabaseConfig, supabase } from '../lib/supabase';

interface CartItem extends OrderItem {
  image: string;
  color?: string;
  size?: string;
}

interface PendingWebsiteOrder {
  order: Order;
  paymentMethod?: string;
}

interface ShopContextType {
  settings: ThemeSettings;
  updateSettings: (newSettings: Partial<ThemeSettings>) => void;
  applyTemplate: (templateId: string) => void;
  products: Product[];
  addProduct: (product: Omit<Product, 'id' | 'createdAt'>) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  upsertPrintifyShopProducts: (productPayloads: Array<Omit<Product, 'id' | 'createdAt'>>) => Promise<{ importedCount: number; updatedCount: number }>;
  printifyCatalog: PrintifyCatalogTemplate[];
  upsertPrintifyCatalogTemplates: (templates: PrintifyCatalogTemplate[], options?: { replaceVisible?: boolean }) => Promise<void>;
  updatePrintifyCatalogTemplate: (id: string, updates: Partial<PrintifyCatalogTemplate>) => Promise<void>;
  deletePrintifyCatalogTemplate: (id: string) => Promise<void>;
  clearPrintifyCatalog: () => Promise<void>;
  categories: Category[];
  addCategory: (category: Omit<Category, 'id' | 'createdAt'>) => void;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  orders: Order[];
  updateOrderStatus: (id: string, status: Order['status']) => void;
  updateOrderPrintifySync: (id: string, updates: Pick<Order, 'printifySyncStatus' | 'printifyOrderId' | 'printifyErrorLog'>) => void;
  refreshOrders: () => Promise<void>;
  cart: CartItem[];
  addToCart: (product: Product, variant?: ProductVariant, quantity?: number, options?: { color?: string; size?: string; customization?: PrintifyCustomization }) => void;
  removeFromCart: (productId: string, variantId?: string, customization?: PrintifyCustomization) => void;
  updateCartQuantity: (productId: string, variantId: string | undefined, quantity: number, customization?: PrintifyCustomization) => void;
  clearCart: () => void;
  placeOrder: (customerData: Omit<Order, 'id' | 'items' | 'total' | 'status' | 'createdAt'>, mode: 'WHATSAPP' | 'WEBSITE', paymentMethod?: string) => void;
  cartTotal: number;
  loading: boolean;
  reviews: Review[];
  addReview: (review: Omit<Review, 'id' | 'createdAt'>) => void;
  deleteReview: (id: string) => void;
  wishlist: string[];
  toggleWishlist: (productId: string) => void;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const DEFAULT_DEVICE_CONFIG: ThemeSettings['desktop'] = {
  headerStyle: 'standard',
  headerTheme: 'glass',
  isHeaderSticky: true,
  heroStyle: 'banner',
  productGridCols: 3,
  productCardStyle: 'grid',
  showCategories: true,
  showFeatured: true,
  showNewsletter: true,
  footerStyle: 'detailed',
};

const DEFAULT_SETTINGS: ThemeSettings = {
  activeTemplate: 'devsfolk',
  primaryColor: '#000000',
  secondaryColor: '#6366f1',
  backgroundColor: '#ffffff',
  fontSans: 'Inter',
  fontDisplay: 'Outfit',
  shopName: '',
  shopDescription: '',
  currency: 'USD',
  currencySymbol: '$',
  whatsappNumber: '',
  orderMode: 'WEBSITE',
  contactRequired: 'phone',
  phoneFormat: 'pakistan',
  customPhonePlaceholder: '',
  devsfolkBgColor: '#ffffff',
  devsfolkNavbarColor: '#ffffff',
  devsfolkFooterColor: '#f9fafb',
  devsfolkCatRatioDesktop: 'square',
  devsfolkCatRatioTablet: 'square',
  devsfolkCatRatioMobile: 'square',
  devsfolkInitialCategoriesCountDesktop: 4,
  devsfolkInitialCategoriesCountTablet: 3,
  devsfolkInitialCategoriesCountMobile: 1,
  paymentSettings: {
    stripe: { enabled: false, apiKey: '', secretKey: '' },
    paypal: { enabled: false, clientId: '' },
    bankTransfer: { 
      enabled: false, 
      accountDetails: '',
      accountTitle: '',
      bankName: '',
      accountNumber: '',
      iban: '',
      qrCodeUrl: '',
      instructions: ''
    },
    cod: { enabled: true },
  },
  analytics: {
    googleAnalyticsId: '',
    googleSearchConsoleId: '',
  },
  trustFeatures: [],
  socialLinks: [],
  desktop: { ...DEFAULT_DEVICE_CONFIG, productGridCols: 4 },
  tablet: { ...DEFAULT_DEVICE_CONFIG, productGridCols: 2, headerStyle: 'minimal' },
  mobile: { ...DEFAULT_DEVICE_CONFIG, productGridCols: 1, headerStyle: 'minimal', heroStyle: 'minimal' },
  sections: [
    { id: 'cat-slider', type: 'CATEGORY_SLIDER', title: 'Top Categories', enabled: true, order: 0, config: { isSlider: true, showArrows: true } },
    { id: 'sale-banner', type: 'SALE_BANNER', title: 'Season Sale', enabled: true, order: 1, config: { height: 'thin', imageUrl: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&q=80&w=2000' } },
    { id: 'featured', type: 'FEATURED_PRODUCTS', title: 'New Arrivals', enabled: true, order: 2 },
    { id: 'about', type: 'ABOUT', title: 'DevsFolk Story', enabled: true, order: 3 },
  ],
  printifySettings: {
    enabled: false,
    providerSettings: { apiKey: '', shopId: '' },
    editor: { selected: 'devsfolk', devsfolkEnabled: true, alternativeEnabled: false },
    preview: { selected: 'devsfolk', devsfolkEnabled: true, aiEnabled: false, aiConfig: { provider: 'gemini', apiKey: '', maxPreviewImages: 2, pipelinePrompt: 'Generate a photorealistic product mockup with soft studio lighting, neutral background, and a slight shadow beneath the product. Show the design clearly on the product surface.' } },
    charges: { 
      templateBasePrice: 14.99,
      designFee: 0, 
      editFee: 0, 
      sizeFees: {}, 
      placementFees: {},
      editorCharges: {
        textOnly: 5.00,
        designOnly: 10.00,
        textAndDesign: 12.00,
        areaMultiplier: {
          enabled: false,
          threshold: 50,
          surcharge: 3.00,
        },
      },
    },
    sync: { mode: 'scheduled', scheduleInterval: 'daily', autoSyncEnabled: true },
  },
};

const SAMPLE_CATEGORIES: Category[] = [
  { id: 'cat_skincare', name: 'Elite Skincare', slug: 'skincare', description: 'Transformative solutions for radiant, youthful skin.', imageUrl: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&q=80&w=800', order: 0, createdAt: Date.now() },
  { id: 'cat_haircare', name: 'Luxury Haircare', slug: 'haircare', description: 'Professional-grade treatments for stunning hair.', imageUrl: 'https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&q=80&w=800', order: 1, createdAt: Date.now() },
  { id: 'cat_makeup', name: 'Artistry Makeup', slug: 'makeup', description: 'Discover your perfect look with premium cosmetics.', imageUrl: 'https://images.unsplash.com/photo-1522338221030-424d67364b63?auto=format&fit=crop&q=80&w=800', order: 2, createdAt: Date.now() },
  { id: 'cat_fragrance', name: 'Signature Scent', slug: 'fragrance', description: 'Captivating fragrances for every moment.', imageUrl: 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&q=80&w=800', order: 3, createdAt: Date.now() },
  { id: 'cat_bodycare', name: 'Botanical Body', slug: 'body-care', description: 'Indulgent care for your skin from head to toe.', imageUrl: 'https://images.unsplash.com/photo-1552046122-03184de85e08?auto=format&fit=crop&q=80&w=800', order: 4, createdAt: Date.now() },
  { id: 'cat_men', name: 'Men\'s Grooming', slug: 'mens-grooming', description: 'Refined essentials for the modern man.', imageUrl: 'https://images.unsplash.com/photo-1567113463300-102a7eb3cb26?auto=format&fit=crop&q=80&w=800', order: 5, createdAt: Date.now() },
  { id: 'cat_tools', name: 'Beauty Tech', slug: 'beauty-tools', description: 'Advanced tools for professional results at home.', imageUrl: 'https://images.unsplash.com/photo-1596462502278-27bfdc4033c8?auto=format&fit=crop&q=80&w=800', order: 6, createdAt: Date.now() },
  { id: 'cat_suncare', name: 'Sun Armor', slug: 'sun-care', description: 'Superior protection for sun-kissed skin.', imageUrl: 'https://images.unsplash.com/photo-1526947425960-985c9991db01?auto=format&fit=crop&q=80&w=800', order: 7, createdAt: Date.now() },
  { id: 'cat_organic', name: 'Pure Organic', slug: 'natural-beauty', description: 'Clean, green beauty powered by nature.', imageUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=800', order: 8, createdAt: Date.now() },
  { id: 'cat_luxury', name: 'Gold Standard', slug: 'luxury-beauty', description: 'The pinnacle of beauty craftsmanship.', imageUrl: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&q=80&w=800', order: 9, createdAt: Date.now() },
  { id: 'cat_printify', name: 'Custom Merch', slug: 'custom-merch', description: 'Design your own premium custom print-on-demand products.', imageUrl: '/custom-tee-mockup.png', order: 10, createdAt: Date.now() },
];

const SAMPLE_PRODUCTS: Product[] = [
  { id: 'p_skin_1', categoryId: 'cat_skincare', name: 'Vitamin C Glow Serum', slug: 'vitamin-c-glow-serum', description: 'A potent serum that brightens skin tone and reduces signs of aging with pure Vitamin C and Ferulic acid.', price: 68, discountPrice: 55, images: ['https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=800', 'https://images.unsplash.com/photo-1620917670397-dc7bc43e8116?auto=format&fit=crop&q=80&w=800'], stock: 45, isFeatured: true, order: 0, createdAt: Date.now() },
  { id: 'p_skin_2', categoryId: 'cat_skincare', name: 'Hyaluronic Hydrating Jelly', slug: 'hyaluronic-hydrating-jelly', description: 'Intense 72-hour hydration in a lightweight, non-greasy jelly format. Suitable for all skin types.', price: 42, images: ['https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&q=80&w=800'], stock: 120, isFeatured: false, order: 1, createdAt: Date.now() },
  { id: 'p_hair_1', categoryId: 'cat_haircare', name: 'Keratin Repair Mask', slug: 'keratin-repair-mask', description: 'Deep conditioning treatment that reconstructs damaged hair fibers and restores shine.', price: 35, images: ['https://images.unsplash.com/photo-1527799822367-a233b47b0ee6?auto=format&fit=crop&q=80&w=800'], stock: 85, isFeatured: true, order: 0, createdAt: Date.now() },
  { id: 'p_hair_2', categoryId: 'cat_haircare', name: 'Argan Oil Shine Serum', slug: 'argan-oil-shine-serum', description: 'Pure Moroccan argan oil to eliminate frizz and provide a mirror-like finish.', price: 28, images: ['https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?auto=format&fit=crop&q=80&w=800'], stock: 60, isFeatured: false, order: 1, createdAt: Date.now() },
  { id: 'p_makeup_1', categoryId: 'cat_makeup', name: 'Velvet Matte Lipstick', slug: 'velvet-matte-lipstick', description: 'High-pigment color with a weightless, comfortable matte finish. Available in 12 signature shades.', price: 24, images: ['https://images.unsplash.com/photo-1586776977607-310e9c725c37?auto=format&fit=crop&q=80&w=800', 'https://images.unsplash.com/photo-1571450669798-fcb4c543f6a4?auto=format&fit=crop&q=80&w=800'], stock: 200, colors: ['#8B0000', '#FFB6C1', '#D2691E'], isFeatured: true, order: 0, createdAt: Date.now() },
  { id: 'p_makeup_2', categoryId: 'cat_makeup', name: 'Luminous Finish Foundation', slug: 'luminous-finish-foundation', description: 'Building coverage with a natural, healthy glow. SPF 15 included.', price: 48, images: ['https://images.unsplash.com/photo-1599733589046-10c005739ef0?auto=format&fit=crop&q=80&w=800'], stock: 75, isFeatured: false, order: 1, createdAt: Date.now() },
  { id: 'p_frag_1', categoryId: 'cat_fragrance', name: 'Midnight Jasmine EDP', slug: 'midnight-jasmine-edp', description: 'A seductive floral fragrance with notes of black jasmine, patchouli, and vanilla.', price: 95, images: ['https://images.unsplash.com/photo-1594125355930-9499699f43c3?auto=format&fit=crop&q=80&w=800'], stock: 30, isFeatured: true, order: 0, createdAt: Date.now() },
  { id: 'p_frag_2', categoryId: 'cat_fragrance', name: 'Oud Wood Intense', slug: 'oud-wood-intense', description: 'Rich, smokey and undeniably bold. A masterpiece of oriental fragrance.', price: 155, images: ['https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&q=80&w=800'], stock: 15, isFeatured: false, order: 1, createdAt: Date.now() },
  { id: 'p_body_1', categoryId: 'cat_bodycare', name: 'Whipped Shea Body Butter', slug: 'whipped-shea-body-butter', description: 'Intense nourishment for dry skin with organic shea butter and coconut oil.', price: 22, images: ['https://images.unsplash.com/photo-1552046122-03184de85e08?auto=format&fit=crop&q=80&w=800'], stock: 150, isFeatured: true, order: 0, createdAt: Date.now() },
  { id: 'p_body_2', categoryId: 'cat_bodycare', name: 'Coco-Coffee Body Scrub', slug: 'coco-coffee-body-scrub', description: 'Exfoliate and energize with roasted coffee grounds and organic cold-pressed coconut oil.', price: 18, images: ['https://images.unsplash.com/photo-1590156206651-95078519bc16?auto=format&fit=crop&q=80&w=800'], stock: 90, isFeatured: false, order: 1, createdAt: Date.now() },
  { id: 'p_men_1', categoryId: 'cat_men', name: 'Beard Growth Oil', slug: 'beard-growth-oil', description: 'Formulated with biotin and castor oil to promote thicker, fuller beard growth.', price: 26, images: ['https://images.unsplash.com/photo-1626285861696-9f0bf5a49c6d?auto=format&fit=crop&q=80&w=800'], stock: 55, isFeatured: true, order: 0, createdAt: Date.now() },
  { id: 'p_men_2', categoryId: 'cat_men', name: 'Hydrating Post-Shave Balm', slug: 'post-shave-balm', description: 'Soothes razor burn and hydrates the skin with aloe vera and Vitamin E.', price: 19.5, images: ['https://images.unsplash.com/photo-1556229167-9bf14a42861e?auto=format&fit=crop&q=80&w=800'], stock: 80, isFeatured: false, order: 1, createdAt: Date.now() },
  { id: 'p_tool_1', categoryId: 'cat_tools', name: 'Ionic Facial Steamer', slug: 'ionic-facial-steamer', description: 'Professional nano-ionic steam technology for deep pore cleansing and hydration.', price: 89, images: ['https://images.unsplash.com/photo-1596462502278-27bfdc4033c8?auto=format&fit=crop&q=80&w=800'], stock: 25, isFeatured: true, order: 0, createdAt: Date.now() },
  { id: 'p_tool_2', categoryId: 'cat_tools', name: 'Rose Quartz Roller Set', slug: 'rose-quartz-roller-set', description: 'Premium massage tools to reduce puffiness and promote lymphatic drainage.', price: 38, images: ['https://images.unsplash.com/photo-1616683693504-3ee7e1da76b8?auto=format&fit=crop&q=80&w=800'], stock: 110, isFeatured: false, order: 1, createdAt: Date.now() },
  { id: 'p_sun_1', categoryId: 'cat_suncare', name: 'Invisible Shield SPF 50', slug: 'invisible-shield-spf50', description: 'Completely clear, weightless sunscreen that acts as a perfect primer under makeup.', price: 34, images: ['https://images.unsplash.com/photo-1526947425960-985c9991db01?auto=format&fit=crop&q=80&w=800'], stock: 200, isFeatured: true, order: 0, createdAt: Date.now() },
  { id: 'p_sun_2', categoryId: 'cat_suncare', name: 'After-Sun Cooling Gel', slug: 'after-sun-cooling-gel', description: 'Instant relief for sun-exposed skin with 99% pure aloe vera and cucumber extract.', price: 15, images: ['https://images.unsplash.com/photo-1552046122-03184de85e08?auto=format&fit=crop&q=80&w=800'], stock: 75, isFeatured: false, order: 1, createdAt: Date.now() },
  { id: 'p_org_1', categoryId: 'cat_organic', name: 'Pure Rosehip Oil', slug: 'pure-rosehip-oil', description: '100% organic, cold-pressed rosehip oil rich in fatty acids and Vitamin A.', price: 32, images: ['https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?auto=format&fit=crop&q=80&w=800'], stock: 65, isFeatured: true, order: 0, createdAt: Date.now() },
  { id: 'p_org_2', categoryId: 'cat_organic', name: 'Vegan Bamboo Cleanser', slug: 'vegan-bamboo-cleanser', description: 'Ultra-gentle daily cleanser powered by fermented bamboo water and green tea.', price: 26, images: ['https://images.unsplash.com/photo-1556229030-5ef73db95d73?auto=format&fit=crop&q=80&w=800'], stock: 95, isFeatured: false, order: 1, createdAt: Date.now() },
  { id: 'p_lux_1', categoryId: 'cat_luxury', name: '24K Gold Face Oil', slug: '24k-gold-face-oil', description: 'Luxurious blend of rare oils infused with genuine 24-karat gold flakes for ultimate radiance.', price: 185, images: ['https://images.unsplash.com/photo-1616683693504-3ee7e1da76b8?auto=format&fit=crop&q=80&w=800', 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&q=80&w=800'], stock: 12, isFeatured: true, order: 0, createdAt: Date.now() },
  { id: 'p_lux_2', categoryId: 'cat_luxury', name: 'Imperial Caviar Cream', slug: 'imperial-caviar-cream', description: 'Revitalizing moisturizer that harnesses the power of black caviar to firm and lift.', price: 245, images: ['https://images.unsplash.com/photo-1550524513-3bfc90df48da?auto=format&fit=crop&q=80&w=800'], stock: 8, isFeatured: true, order: 1, createdAt: Date.now() },
  {
    id: 'p_printify_tee',
    categoryId: 'cat_printify',
    name: 'Custom Unisex Jersey Tee',
    slug: 'custom-unisex-tee',
    description: 'This classic unisex jersey short sleeve tee fits like a well-loved favorite. Soft cotton and quality print make users fall in love with it over and over again. Customize it with your own designs or logo overlays!',
    price: 24.99,
    images: ['/custom-tee-mockup.png'],
    stock: 500,
    colors: ['#FFFFFF', '#111827', '#EF4444', '#3B82F6', '#10B981'],
    sizes: ['S', 'M', 'L', 'XL', '2XL'],
    isFeatured: true,
    order: 0,
    createdAt: Date.now(),
    isPrintify: true,
    printifyProductId: 'printify_tee_123',
    printifyCatalogId: 'printify_catalog_tee_123'
  }
];

const PRINTIFY_CATEGORY: Category = {
  id: 'cat_printify',
  name: 'Custom Merch',
  slug: 'custom-merch',
  description: 'Design your own premium custom print-on-demand products.',
  imageUrl: '/custom-tee-mockup.png',
  order: 10,
  createdAt: Date.now(),
};

const SETTINGS_STORAGE_KEY = 'devsfolk_settings';
const PRODUCTS_STORAGE_KEY = 'devsfolk_products';
const CATEGORIES_STORAGE_KEY = 'devsfolk_categories';
const ORDERS_STORAGE_KEY = 'devsfolk_orders';
const PENDING_ORDERS_STORAGE_KEY = 'devsfolk_pending_orders';
const REVIEWS_STORAGE_KEY = 'devsfolk_reviews';
const CART_STORAGE_KEY = 'devsfolk_cart';
const WISHLIST_STORAGE_KEY = 'devsfolk_wishlist';
const PRINTIFY_CATALOG_STORAGE_KEY = 'devsfolk_printify_catalog';

const ShopContext = createContext<ShopContextType | undefined>(undefined);

const isMissingSupabaseRelationError = (message = '', relation: string) => (
  message.includes(relation) &&
  (message.includes('schema cache') || message.includes('does not exist') || message.includes('relation'))
);

const compactPrintifyCatalogForStorage = (templates: PrintifyCatalogTemplate[]) => (
  templates
    .filter((template) => template.isEnabled || template.providers.length > 0 || template.variants.length > 0)
    .map((template) => ({
      ...template,
      description: template.description?.slice(0, 500) || '',
      images: template.images.slice(0, 3),
      providers: template.providers.slice(0, 3),
      variants: template.variants.slice(0, 25),
      printAreas: template.printAreas.slice(0, 5),
      shipping: [],
    }))
);

const savePrintifyCatalogLocally = (templates: PrintifyCatalogTemplate[]) => {
  try {
    localStorage.setItem(PRINTIFY_CATALOG_STORAGE_KEY, JSON.stringify(compactPrintifyCatalogForStorage(templates)));
  } catch (error) {
    console.warn('Printify catalog local cache skipped because browser storage quota is full.', error);
    try {
      localStorage.removeItem(PRINTIFY_CATALOG_STORAGE_KEY);
    } catch {
      // Safe ignore
    }
  }
};

const readLocalJson = <T,>(key: string, fallback: T): T => {
  const saved = localStorage.getItem(key);
  if (saved) {
    try {
      return JSON.parse(saved) as T;
    } catch {
      return fallback;
    }
  }

  // Seamless legacy key migration
  const legacyKey = key.replace('devsfolk_', 'omnistore_');
  const legacySaved = localStorage.getItem(legacyKey);
  if (legacySaved) {
    try {
      localStorage.setItem(key, legacySaved);
      localStorage.removeItem(legacyKey);
      return JSON.parse(legacySaved) as T;
    } catch {
      return fallback;
    }
  }

  return fallback;
};

const normalizeHexColor = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed.startsWith('#')) {
    return null;
  }

  const hex = trimmed.slice(1);
  if (hex.length === 3) {
    return hex
      .split('')
      .map((char) => char + char)
      .join('');
  }

  if (hex.length === 6) {
    return hex;
  }

  return null;
};

const sanitizeColorValue = (value: string | undefined, fallback: string) => {
  if (!value) {
    return fallback;
  }

  const normalized = normalizeHexColor(value);
  return normalized ? `#${normalized}` : fallback;
};

const getPrimaryContrastColor = (value: string) => {
  const normalized = normalizeHexColor(value);
  if (!normalized) {
    return '#ffffff';
  }

  const red = parseInt(normalized.slice(0, 2), 16);
  const green = parseInt(normalized.slice(2, 4), 16);
  const blue = parseInt(normalized.slice(4, 6), 16);
  const brightness = (red * 299 + green * 587 + blue * 114) / 1000;

  return brightness >= 160 ? '#111111' : '#ffffff';
};

const getPrimaryBorderColor = (value: string) => {
  return getPrimaryContrastColor(value) === '#111111' ? 'rgba(17, 17, 17, 0.16)' : 'rgba(255, 255, 255, 0.24)';
};

const applyCssVariables = (updated: ThemeSettings) => {
  document.documentElement.style.setProperty('--primary', updated.primaryColor);
  document.documentElement.style.setProperty('--primary-foreground', getPrimaryContrastColor(updated.primaryColor));
  document.documentElement.style.setProperty('--primary-border', getPrimaryBorderColor(updated.primaryColor));
  document.documentElement.style.setProperty('--secondary', updated.secondaryColor);
  document.documentElement.style.setProperty('--background', updated.backgroundColor);
  document.documentElement.style.setProperty('--font-sans', updated.fontSans);
  document.documentElement.style.setProperty('--font-display', updated.fontDisplay);
};

const getMergedSections = (raw?: Partial<ThemeSettings> | null): StoreSection[] => {
  const sections = raw?.sections || DEFAULT_SETTINGS.sections;
  const printifyEnabled = raw?.printifySettings?.enabled ?? DEFAULT_SETTINGS.printifySettings!.enabled;

  if (!printifyEnabled || sections.some((section) => section.type === 'CUSTOMIZER')) {
    return sections;
  }

  return [
    ...sections,
    {
      id: 'printify-customizer',
      type: 'CUSTOMIZER',
      title: 'Design Your Own',
      subtitle: 'Choose a custom product and personalize it in our live editor.',
      enabled: true,
      order: Math.max(...sections.map((section) => section.order), 0) + 1,
    },
  ];
};

const mergeSettings = (raw?: Partial<ThemeSettings> | null): ThemeSettings => ({
  ...DEFAULT_SETTINGS,
  ...raw,
  primaryColor: sanitizeColorValue(raw?.primaryColor, DEFAULT_SETTINGS.primaryColor),
  secondaryColor: sanitizeColorValue(raw?.secondaryColor, DEFAULT_SETTINGS.secondaryColor),
  backgroundColor: sanitizeColorValue(raw?.backgroundColor, DEFAULT_SETTINGS.backgroundColor),
  paymentSettings: {
    stripe: {
      ...DEFAULT_SETTINGS.paymentSettings.stripe,
      ...(raw?.paymentSettings?.stripe || {}),
    },
    paypal: {
      ...DEFAULT_SETTINGS.paymentSettings.paypal,
      ...(raw?.paymentSettings?.paypal || {}),
    },
    bankTransfer: {
      ...DEFAULT_SETTINGS.paymentSettings.bankTransfer,
      ...(raw?.paymentSettings?.bankTransfer || {}),
    },
    cod: {
      ...DEFAULT_SETTINGS.paymentSettings.cod,
      ...(raw?.paymentSettings?.cod || {}),
    },
  },
  analytics: {
    ...DEFAULT_SETTINGS.analytics,
    ...(raw?.analytics || {}),
  },
  trustFeatures: (raw?.trustFeatures || DEFAULT_SETTINGS.trustFeatures).map((feature, index) => ({
    ...DEFAULT_SETTINGS.trustFeatures[index % DEFAULT_SETTINGS.trustFeatures.length],
    ...feature,
  })) as StoreFeature[],
  socialLinks: (raw?.socialLinks || DEFAULT_SETTINGS.socialLinks).map((link, index) => ({
    ...DEFAULT_SETTINGS.socialLinks[index % DEFAULT_SETTINGS.socialLinks.length],
    ...link,
  })) as SocialLink[],
  desktop: {
    ...DEFAULT_SETTINGS.desktop,
    ...(raw?.desktop || {}),
  },
  tablet: {
    ...DEFAULT_SETTINGS.tablet,
    ...(raw?.tablet || {}),
  },
  mobile: {
    ...DEFAULT_SETTINGS.mobile,
    ...(raw?.mobile || {}),
  },
  sections: getMergedSections(raw),
  printifySettings: {
    enabled: raw?.printifySettings?.enabled ?? DEFAULT_SETTINGS.printifySettings!.enabled,
    providerSettings: {
      ...DEFAULT_SETTINGS.printifySettings!.providerSettings,
      ...(raw?.printifySettings?.providerSettings || {}),
    },
    editor: {
      ...DEFAULT_SETTINGS.printifySettings!.editor,
      ...(raw?.printifySettings?.editor || {}),
    },
    preview: {
      ...DEFAULT_SETTINGS.printifySettings!.preview,
      ...(raw?.printifySettings?.preview || {}),
      aiConfig: {
        ...DEFAULT_SETTINGS.printifySettings!.preview.aiConfig,
        ...(raw?.printifySettings?.preview?.aiConfig || {}),
      },
    },
    charges: {
      ...DEFAULT_SETTINGS.printifySettings!.charges,
      ...(raw?.printifySettings?.charges || {}),
      sizeFees: {
        ...DEFAULT_SETTINGS.printifySettings!.charges.sizeFees,
        ...(raw?.printifySettings?.charges?.sizeFees || {}),
      },
      placementFees: {
        ...DEFAULT_SETTINGS.printifySettings!.charges.placementFees,
        ...(raw?.printifySettings?.charges?.placementFees || {}),
      },
    },
    sync: {
      ...DEFAULT_SETTINGS.printifySettings!.sync,
      ...(raw?.printifySettings?.sync || {}),
    },
  },
});

const redactPublicSettings = (settings: ThemeSettings): ThemeSettings => ({
  ...settings,
  printifySettings: settings.printifySettings
    ? {
        ...settings.printifySettings,
        providerSettings: {
          ...settings.printifySettings.providerSettings,
          apiKey: '',
        },
        preview: {
          ...settings.printifySettings.preview,
          aiConfig: {
            ...settings.printifySettings.preview.aiConfig,
            apiKey: '',
          },
        },
      }
    : settings.printifySettings,
});

const mapCategoryRow = (row: any): Category => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  description: row.description,
  imageUrl: row.image_url,
  order: row.display_order ?? 0,
  createdAt: row.created_at ?? Date.now(),
});

const mapProductRow = (row: any): Product => {
  const variants = row.variants || [];
  const printifyMeta = Array.isArray(variants)
    ? variants.find((variant: any) => variant?.id === '__printify_meta')
    : null;
  const printifyData = printifyMeta?.printify || {};

  return {
    id: row.id,
    categoryId: row.category_id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    price: Number(row.price),
    discountPrice: row.discount_price == null ? undefined : Number(row.discount_price),
    images: row.images || [],
    stock: row.stock ?? 0,
    isFeatured: Boolean(row.is_featured),
    order: row.display_order ?? 0,
    colors: row.colors || [],
    sizes: row.sizes || [],
    variants: Array.isArray(variants) ? variants.filter((variant: any) => variant?.id !== '__printify_meta') : [],
    createdAt: row.created_at ?? Date.now(),
    isPrintify: Boolean(row.is_printify) || Boolean(printifyData.isPrintify),
    printifyProductId: row.printify_product_id ?? printifyData.printifyProductId ?? undefined,
    printifyCatalogId: row.printify_catalog_id ?? printifyData.printifyCatalogId ?? undefined,
  };
};

const mapPrintifyCatalogRow = (row: any): PrintifyCatalogTemplate => ({
  id: row.id,
  productId: row.product_id ?? undefined,
  blueprintId: Number(row.blueprint_id ?? row.id?.replace('bp_', '') ?? 0),
  title: row.title,
  category: row.category ?? undefined,
  brand: row.brand ?? undefined,
  model: row.model ?? undefined,
  tags: row.tags || [],
  productStatus: row.product_status ?? undefined,
  description: row.description ?? '',
  images: row.images || [],
  mockups: row.mockups || [],
  variantImages: row.variant_images || {},
  providers: row.providers || [],
  variants: row.variants || [],
  printAreas: row.print_areas || [],
  shipping: row.shipping || [],
  syncDetails: row.sync_details || {},
  baseCost: row.base_cost == null ? undefined : Number(row.base_cost),
  retailPrice: row.retail_price == null ? undefined : Number(row.retail_price),
  sellingPrice: row.selling_price == null ? row.retail_price == null ? undefined : Number(row.retail_price) : Number(row.selling_price),
  variantSellingPrices: row.variant_selling_prices || {},
  colors: row.colors || [],
  sizes: row.sizes || [],
  colorMockups: row.color_mockups || {},
  syncStatus: row.sync_status || (row.is_enabled ? 'published' : 'raw'),
  printProviderId: row.print_provider_id == null ? undefined : Number(row.print_provider_id),
  isEnabled: row.is_enabled ?? row.sync_status === 'published',
  lastSynced: row.last_synced ?? new Date().toISOString(),
});

const mapReviewRow = (row: any): Review => ({
  id: row.id,
  productId: row.product_id,
  userName: row.user_name,
  rating: row.rating,
  comment: row.comment,
  createdAt: row.created_at ?? Date.now(),
});

const orderHasPrintifyItems = (items: any[] = []) => items.some((item) => (
  item?.isPrintify ||
  item?.printifyProductId ||
  item?.printifyCatalogId ||
  item?.printifyBlueprintId ||
  item?.customization?.printifyBlueprintId ||
  item?.customization?.previewUrl ||
  item?.customization?.customText ||
  item?.customization?.customImageUrl
));

const getLegacyPrintifySyncMeta = (items: any[] = []) => {
  const meta = items.find((item) => item?.productId === '__printify_sync_meta')?.printifySync;
  return meta && typeof meta === 'object' ? meta : null;
};

const getLegacyShippingAddressMeta = (items: any[] = []) => {
  const shippingAddress = items.find((item) => item?.productId === '__shipping_address_meta')?.shippingAddress;
  return shippingAddress && typeof shippingAddress === 'object' ? shippingAddress : null;
};

const stripLegacyOrderMeta = (items: any[] = []) => items.filter((item) => (
  item?.productId !== '__printify_sync_meta' &&
  item?.productId !== '__shipping_address_meta'
));

const mapOrderRow = (row: any): Order => {
  const rawItems = row.items || [];
  const legacyPrintifySync = getLegacyPrintifySyncMeta(rawItems);
  const legacyShippingAddress = getLegacyShippingAddressMeta(rawItems);
  const items = stripLegacyOrderMeta(rawItems);

  return {
    id: row.id,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerPhone: row.customer_phone,
    customerAddress: row.customer_address,
    shippingAddress: legacyShippingAddress ?? undefined,
    items,
    total: Number(row.total),
    status: row.status,
    createdAt: row.created_at ?? Date.now(),
    paymentMethod: row.payment_method,
    printifyOrderId: row.printify_order_id ?? legacyPrintifySync?.printifyOrderId ?? null,
    printifySyncStatus: row.printify_sync_status ?? legacyPrintifySync?.printifySyncStatus ?? (orderHasPrintifyItems(items) ? 'PENDING' : undefined),
    printifyErrorLog: row.printify_error_log ?? legacyPrintifySync?.printifyErrorLog ?? (orderHasPrintifyItems(items) ? 'Queued for Printify fulfillment bridge.' : null),
  };
};

const toCategoryRow = (category: Category) => ({
  id: category.id,
  name: category.name,
  slug: category.slug,
  description: category.description,
  image_url: category.imageUrl,
  display_order: category.order ?? 0,
  created_at: category.createdAt,
});

const toProductRow = (product: Product) => ({
  id: product.id,
  category_id: product.categoryId,
  name: product.name,
  slug: product.slug,
  description: product.description,
  price: product.price,
  discount_price: product.discountPrice ?? null,
  images: product.images,
  stock: product.stock,
  is_featured: product.isFeatured,
  display_order: product.order ?? 0,
  colors: product.colors || [],
  sizes: product.sizes || [],
  variants: product.variants || [],
  created_at: product.createdAt,
  is_printify: product.isPrintify ?? false,
  printify_product_id: product.printifyProductId ?? null,
  printify_catalog_id: product.printifyCatalogId ?? null,
});

const toLegacyProductRow = (product: Product) => {
  const variants = (product.variants || []).filter((variant: any) => variant?.id !== '__printify_meta');

  return {
    id: product.id,
    category_id: product.categoryId,
    name: product.name,
    slug: product.slug,
    description: product.description,
    price: product.price,
    discount_price: product.discountPrice ?? null,
    images: product.images,
    stock: product.stock,
    is_featured: product.isFeatured,
    display_order: product.order ?? 0,
    colors: product.colors || [],
    sizes: product.sizes || [],
    variants: product.isPrintify
      ? [
          ...variants,
          {
            id: '__printify_meta',
            name: 'Printify Metadata',
            price: product.price,
            stock: 0,
            printify: {
              isPrintify: true,
              printifyProductId: product.printifyProductId ?? null,
              printifyCatalogId: product.printifyCatalogId ?? null,
            },
          },
        ]
      : variants,
    created_at: product.createdAt,
  };
};

const toPrintifyCatalogRow = (template: PrintifyCatalogTemplate) => {
  const row = {
    id: template.id,
    product_id: template.productId ?? null,
    blueprint_id: template.blueprintId,
    title: template.title,
    category: template.category ?? null,
    brand: template.brand ?? null,
    model: template.model ?? null,
    tags: template.tags || [],
    product_status: template.productStatus ?? null,
    description: template.description,
    images: template.images,
    mockups: template.mockups || [],
    variant_images: template.variantImages || {},
    providers: template.providers,
    variants: template.variants,
    print_areas: template.printAreas,
    shipping: template.shipping,
    sync_details: template.syncDetails || {},
    base_cost: template.baseCost ?? null,
    retail_price: template.retailPrice ?? template.sellingPrice ?? null,
    selling_price: template.sellingPrice ?? template.retailPrice ?? null,
    variant_selling_prices: template.variantSellingPrices || {},
    colors: template.colors || [],
    sizes: template.sizes || [],
    color_mockups: template.colorMockups || {},
    sync_status: template.syncStatus || (template.isEnabled ? 'published' : 'raw'),
    print_provider_id: template.printProviderId ?? null,
    is_enabled: template.isEnabled,
    last_synced: template.lastSynced,
  };
  
  // Log the colorMockups field for debugging
  if (Object.keys(template.colorMockups || {}).length > 0) {
    console.log('[toPrintifyCatalogRow] Template with colorMockups:', template.id, template.colorMockups);
  }
  
  return row;
};

const normalizeTemplateImage = (image: any) => {
  if (!image) return '';
  if (typeof image === 'string') return image;
  return image.src || image.url || image.preview_url || '';
};

const templateToProduct = (template: PrintifyCatalogTemplate): Product => {
  const images = template.images.map(normalizeTemplateImage).filter(Boolean);
  const fallbackPrice = Number(template.sellingPrice ?? template.retailPrice ?? template.baseCost ?? 0);
  const templateVariants = (template.variants || [])
    .map((variant: any) => ({
      id: String(variant.id || variant.variant_id || variant.printify_variant_id || ''),
      name: variant.title || variant.name || variant.options?.title || `Variant ${variant.id || variant.variant_id || ''}`,
      price: Number(template.variantSellingPrices?.[String(variant.id || variant.variant_id || variant.printify_variant_id || '')] ?? fallbackPrice),
      stock: variant.is_available === false || variant.is_enabled === false ? 0 : 999,
      options: variant.options || [],
      ...(variant.image_url ? { image_url: variant.image_url } : {}),
    }))
    .filter((variant) => variant.id);

  return {
    id: `printify_template_${template.id}`,
    categoryId: PRINTIFY_CATEGORY.id,
    name: template.title,
    slug: `printify-template-${template.blueprintId}`,
    description: template.description || `${template.brand || 'Printify'} customizable blank template.`,
    price: fallbackPrice,
    images: images.length > 0 ? images : ['/custom-tee-mockup.png'],
    stock: 999,
    isFeatured: false,
    variants: templateVariants,
    createdAt: Date.now(),
    isPrintify: true,
    printifyProductId: `template_${template.blueprintId}`,
    printifyCatalogId: String(template.blueprintId),
  };
};

const toReviewRow = (review: Review) => ({
  id: review.id,
  product_id: review.productId,
  user_name: review.userName,
  rating: review.rating,
  comment: review.comment,
  created_at: review.createdAt,
});

const toOrderRow = (order: Order, paymentMethod?: string) => ({
  id: order.id,
  customer_name: order.customerName,
  customer_email: order.customerEmail,
  customer_phone: order.customerPhone,
  customer_address: order.customerAddress,
  items: order.shippingAddress
    ? [
        ...stripLegacyOrderMeta(order.items),
        {
          productId: '__shipping_address_meta',
          name: 'Shipping Address Metadata',
          price: 0,
          quantity: 0,
          shippingAddress: order.shippingAddress,
        },
      ]
    : order.items,
  total: order.total,
  status: order.status,
  payment_method: paymentMethod ?? order.paymentMethod ?? null,
  created_at: order.createdAt,
  printify_order_id: order.printifyOrderId ?? null,
  printify_sync_status: order.printifySyncStatus ?? 'NOT_REQUIRED',
  printify_error_log: order.printifyErrorLog ?? null,
});

const toLegacyOrderRow = (order: Order, paymentMethod?: string) => ({
  id: order.id,
  customer_name: order.customerName,
  customer_email: order.customerEmail,
  customer_phone: order.customerPhone,
  customer_address: order.customerAddress,
  items: order.shippingAddress
    ? [
        ...stripLegacyOrderMeta(order.items),
        {
          productId: '__shipping_address_meta',
          name: 'Shipping Address Metadata',
          price: 0,
          quantity: 0,
          shippingAddress: order.shippingAddress,
        },
      ]
    : order.items,
  total: order.total,
  status: order.status,
  payment_method: paymentMethod ?? order.paymentMethod ?? null,
  created_at: order.createdAt,
});

const createId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export const ShopProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<ThemeSettings>(DEFAULT_SETTINGS);
  const [products, setProducts] = useState<Product[]>([]);
  const [printifyCatalog, setPrintifyCatalog] = useState<PrintifyCatalogTemplate[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(hasSupabaseConfig);
  const loading = dataLoading || authLoading;

  const reportSyncSuccess = (message: string) => {
    console.info(`[DevsFolk Sync] ${message}`);
  };

  const reportSyncError = (message: string, error?: unknown) => {
    console.error(`[DevsFolk Sync] ${message}`, error);
  };

  const syncCatalogFromSupabase = async () => {
    if (!supabase) {
      return;
    }

    const [settingsResult, categoriesResult, productsResult, reviewsResult, printifyCatalogResult] = await Promise.all([
      supabase.from('store_settings').select('value').eq('id', 'default').maybeSingle(),
      supabase.from('categories').select('*').order('display_order', { ascending: true }),
      supabase.from('products').select('*').order('display_order', { ascending: true }),
      supabase.from('reviews').select('*').order('created_at', { ascending: false }),
      supabase.from('printify_catalog').select('*').order('title', { ascending: true }),
    ]);

    if (settingsResult.error) {
      reportSyncError('Failed to load store settings from Supabase.', settingsResult.error.message);
    } else {
      const rawSettings = (settingsResult.data?.value ?? {}) as Partial<ThemeSettings>;
      const remoteSettings = mergeSettings(rawSettings);
      setSettings(remoteSettings);
      applyCssVariables(remoteSettings);
    }

    if (categoriesResult.error) {
      reportSyncError('Failed to load categories from Supabase.', categoriesResult.error.message);
    } else {
      const remoteCategories = (categoriesResult.data ?? []).map(mapCategoryRow);
      setCategories(remoteCategories);
    }

    if (productsResult.error) {
      reportSyncError('Failed to load products from Supabase.', productsResult.error.message);
    } else {
      const remoteProducts = (productsResult.data ?? []).map(mapProductRow);
      setProducts(remoteProducts);
    }

    if (reviewsResult.error) {
      reportSyncError('Failed to load reviews from Supabase.', reviewsResult.error.message);
    } else {
      const remoteReviews = (reviewsResult.data ?? []).map(mapReviewRow);
      setReviews(remoteReviews);
    }

    if (printifyCatalogResult.error) {
      reportSyncError('Failed to load Printify catalog from Supabase.', printifyCatalogResult.error.message);
    } else {
      const remoteCatalog = (printifyCatalogResult.data ?? []).map(mapPrintifyCatalogRow);
      
      console.log('[ShopContext] Fetched printifyCatalog from Supabase, count:', remoteCatalog.length);
      if (remoteCatalog.length > 0) {
        const bp440 = remoteCatalog.find(t => t.id === 'bp_440');
        console.log('[ShopContext] bp_440 template found?', !!bp440);
        if (bp440) {
          console.log('[ShopContext] bp_440.variants:', bp440.variants);
          console.log('[ShopContext] bp_440 keys:', Object.keys(bp440));
        }
      }
      
      setPrintifyCatalog(remoteCatalog);
      savePrintifyCatalogLocally(remoteCatalog);
    }
  };

  const maybePromoteLocalStoreToSupabase = async () => {
    if (!supabase) {
      return;
    }

    const rawLocalSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
    const rawLocalCategories = localStorage.getItem(CATEGORIES_STORAGE_KEY);
    const rawLocalProducts = localStorage.getItem(PRODUCTS_STORAGE_KEY);
    const rawLocalReviews = localStorage.getItem(REVIEWS_STORAGE_KEY);

    if (!rawLocalSettings && !rawLocalCategories && !rawLocalProducts && !rawLocalReviews) {
      return;
    }

    const [settingsResult, categoriesResult, productsResult, reviewsResult] = await Promise.all([
      supabase.from('store_settings').select('value').eq('id', 'default').maybeSingle(),
      supabase.from('categories').select('id'),
      supabase.from('products').select('id'),
      supabase.from('reviews').select('id'),
    ]);

    if (settingsResult.error || categoriesResult.error || productsResult.error || reviewsResult.error) {
      reportSyncError('Could not verify current Supabase store state before publishing local data.', {
        settings: settingsResult.error?.message,
        categories: categoriesResult.error?.message,
        products: productsResult.error?.message,
        reviews: reviewsResult.error?.message,
      });
      return;
    }

    const remoteSettingsIsEmpty = Object.keys((settingsResult.data?.value ?? {}) as Record<string, unknown>).length === 0;
    const remoteCategoriesEmpty = (categoriesResult.data ?? []).length === 0;
    const remoteProductsEmpty = (productsResult.data ?? []).length === 0;
    const remoteReviewsEmpty = (reviewsResult.data ?? []).length === 0;

    try {
      if (remoteSettingsIsEmpty && rawLocalSettings) {
        const localSettings = redactPublicSettings(mergeSettings(JSON.parse(rawLocalSettings) as Partial<ThemeSettings>));
        const { error } = await supabase.from('store_settings').upsert({
          id: 'default',
          value: localSettings,
          updated_at: new Date().toISOString(),
        });
        if (error) {
          throw new Error(`Settings publish failed: ${error.message}`);
        }
      }

      if (remoteCategoriesEmpty && rawLocalCategories) {
        const localCategories = JSON.parse(rawLocalCategories) as Category[];
        if (localCategories.length > 0) {
          const { error } = await supabase.from('categories').upsert(localCategories.map(toCategoryRow));
          if (error) {
            throw new Error(`Categories publish failed: ${error.message}`);
          }
        }
      }

      if (remoteProductsEmpty && rawLocalProducts) {
        const localProducts = JSON.parse(rawLocalProducts) as Product[];
        if (localProducts.length > 0) {
          const { error } = await supabase.from('products').upsert(localProducts.map(toProductRow));
          if (error) {
            throw new Error(`Products publish failed: ${error.message}`);
          }
        }
      }

      if (remoteReviewsEmpty && rawLocalReviews) {
        const localReviews = JSON.parse(rawLocalReviews) as Review[];
        if (localReviews.length > 0) {
          const { error } = await supabase.from('reviews').upsert(localReviews.map(toReviewRow));
          if (error) {
            throw new Error(`Reviews publish failed: ${error.message}`);
          }
        }
      }

      await syncCatalogFromSupabase();
      reportSyncSuccess('Local dashboard data was published to Supabase for all devices.');
    } catch (error) {
      reportSyncError('Failed to publish existing local dashboard data to Supabase.', error);
    }
  };

  const syncOrdersFromSupabase = async () => {
    if (!supabase) {
      return;
    }

    const { data: orderRows, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !orderRows) {
      if (error) {
        console.error('Failed to load orders:', error.message);
      }
      return;
    }

    const remoteOrders = orderRows.map(mapOrderRow);
    setOrders(remoteOrders);
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(remoteOrders));
  };

  const flushPendingOrdersToSupabase = async () => {
    if (!supabase) {
      return;
    }

    const pendingOrders = readLocalJson<PendingWebsiteOrder[]>(PENDING_ORDERS_STORAGE_KEY, []);
    if (pendingOrders.length === 0) {
      return;
    }

    const remainingOrders: PendingWebsiteOrder[] = [];
    let syncedAnyOrders = false;

    for (const pendingOrder of pendingOrders) {
      let { error } = await supabase
        .from('orders')
        .insert(toOrderRow(pendingOrder.order, pendingOrder.paymentMethod));

      if (error) {
        if (error.message.includes('printify_order_id') || error.message.includes('printify_sync_status') || error.message.includes('printify_error_log')) {
          const legacyResult = await supabase
            .from('orders')
            .insert(toLegacyOrderRow(pendingOrder.order, pendingOrder.paymentMethod));
          error = legacyResult.error;
        }

        if (!error) {
          syncedAnyOrders = true;
          continue;
        }

        if (error.code === '23505') {
          syncedAnyOrders = true;
          continue;
        }

        reportSyncError('Failed to sync website order to Supabase.', error.message);
        remainingOrders.push(pendingOrder);
        continue;
      }

      syncedAnyOrders = true;
    }

    localStorage.setItem(PENDING_ORDERS_STORAGE_KEY, JSON.stringify(remainingOrders));

    if (syncedAnyOrders) {
      reportSyncSuccess('Website orders synced to Supabase.');
    }
  };

  useEffect(() => {
    const initialize = async () => {
      const hasLocalSettings = localStorage.getItem(SETTINGS_STORAGE_KEY) !== null;
      const hasLocalProducts = localStorage.getItem(PRODUCTS_STORAGE_KEY) !== null;
      const hasLocalCategories = localStorage.getItem(CATEGORIES_STORAGE_KEY) !== null;
      const hasLocalReviews = localStorage.getItem(REVIEWS_STORAGE_KEY) !== null;

      const localSettings = mergeSettings(hasLocalSettings ? readLocalJson<Partial<ThemeSettings> | null>(SETTINGS_STORAGE_KEY, null) : null);
      let localProducts = hasLocalProducts
        ? readLocalJson<Product[]>(PRODUCTS_STORAGE_KEY, [])
        : SAMPLE_PRODUCTS;

      // Auto-migrate or ensure custom Printify product exists in the list
      if (localProducts.length > 0 && !localProducts.some(p => p.isPrintify)) {
        const samplePrintifyTee = SAMPLE_PRODUCTS.find(p => p.isPrintify);
        if (samplePrintifyTee) {
          localProducts = [...localProducts, samplePrintifyTee];
          localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(localProducts));
        }
      }
      const localCategories = hasLocalCategories
        ? readLocalJson<Category[]>(CATEGORIES_STORAGE_KEY, [])
        : SAMPLE_CATEGORIES;
      const localOrders = readLocalJson<Order[]>(ORDERS_STORAGE_KEY, []);
      const localReviews = hasLocalReviews ? readLocalJson<Review[]>(REVIEWS_STORAGE_KEY, []) : [];
      const localPrintifyCatalog = readLocalJson<PrintifyCatalogTemplate[]>(PRINTIFY_CATALOG_STORAGE_KEY, []);
      const localCart = readLocalJson<CartItem[]>(CART_STORAGE_KEY, []);
      const localWishlist = readLocalJson<string[]>(WISHLIST_STORAGE_KEY, []);

      if (hasSupabaseConfig) {
        // Production mode: Bypasses stale local caches. Load fresh from Supabase.
        setSettings(mergeSettings(null));
        setProducts([]);
        setPrintifyCatalog([]);
        setCategories([]);
        setReviews([]);
        setOrders([]);
      } else {
        // Offline / Local development fallback mode
        setSettings(localSettings);
        setProducts(localProducts);
        setPrintifyCatalog(localPrintifyCatalog);
        setCategories(localCategories);
        setReviews(localReviews);
        setOrders(localOrders);
      }

      setCart(localCart);
      setWishlist(localWishlist);
      applyCssVariables(hasSupabaseConfig ? mergeSettings(null) : localSettings);

      if (!supabase) {
        setDataLoading(false);
        setAuthLoading(false);
        return;
      }

      try {
        await syncCatalogFromSupabase();
        await flushPendingOrdersToSupabase();
      } catch (error) {
        reportSyncError('Failed to hydrate storefront data from Supabase.', error);
      } finally {
        setDataLoading(false);
      }
    };

    void initialize();
  }, []);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let mounted = true;

    const applyAdminState = (sessionExists: boolean) => {
      if (!mounted) {
        return;
      }

      setIsAdmin(sessionExists);

      if (sessionExists) {
        window.setTimeout(() => {
          if (mounted) {
            void syncOrdersFromSupabase();
            void maybePromoteLocalStoreToSupabase();
          }
        }, 0);
      } else {
        setOrders(readLocalJson<Order[]>(ORDERS_STORAGE_KEY, []));
      }
    };

    const initializeAuth = async () => {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (!mounted) {
        return;
      }

      if (sessionError) {
        console.error('Failed to restore admin session:', sessionError.message);
      }

      const hasSession = Boolean(sessionData.session);
      applyAdminState(hasSession);
      setAuthLoading(false);
    };

    void initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) {
        return;
      }
      applyAdminState(Boolean(session));
      setAuthLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!supabase || !isAdmin) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void syncOrdersFromSupabase();
    }, 5000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isAdmin]);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const handleOnline = () => {
      void flushPendingOrdersToSupabase();
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void flushPendingOrdersToSupabase();

        if (isAdmin) {
          void syncOrdersFromSupabase();
        }
      }
    };

    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isAdmin]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.storageArea !== localStorage) {
        return;
      }

      if (event.key === ORDERS_STORAGE_KEY) {
        setOrders(readLocalJson<Order[]>(ORDERS_STORAGE_KEY, []));
      }

      if (event.key === PRODUCTS_STORAGE_KEY) {
        setProducts(readLocalJson<Product[]>(PRODUCTS_STORAGE_KEY, SAMPLE_PRODUCTS));
      }

      if (event.key === PRINTIFY_CATALOG_STORAGE_KEY) {
        setPrintifyCatalog(readLocalJson<PrintifyCatalogTemplate[]>(PRINTIFY_CATALOG_STORAGE_KEY, []));
      }

      if (event.key === CATEGORIES_STORAGE_KEY) {
        setCategories(readLocalJson<Category[]>(CATEGORIES_STORAGE_KEY, SAMPLE_CATEGORIES));
      }

      if (event.key === SETTINGS_STORAGE_KEY) {
        const syncedSettings = mergeSettings(readLocalJson<Partial<ThemeSettings> | null>(SETTINGS_STORAGE_KEY, null));
        setSettings(syncedSettings);
        applyCssVariables(syncedSettings);
      }
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'categories' },
        () => {
          void syncCatalogFromSupabase();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => {
          void syncCatalogFromSupabase();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'store_settings' },
        () => {
          void syncCatalogFromSupabase();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reviews' },
        () => {
          void syncCatalogFromSupabase();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!supabase || !isAdmin) {
      return;
    }

    const syncIfActive = () => {
      if (document.visibilityState === 'visible') {
        void syncOrdersFromSupabase();
      }
    };

    window.addEventListener('focus', syncIfActive);
    document.addEventListener('visibilitychange', syncIfActive);

    return () => {
      window.removeEventListener('focus', syncIfActive);
      document.removeEventListener('visibilitychange', syncIfActive);
    };
  }, [isAdmin]);

  const updateSettings = (newSettings: Partial<ThemeSettings>) => {
    const updated = mergeSettings({ ...settings, ...newSettings });
    const publicSettings = redactPublicSettings(updated);
    setSettings(updated);
    if (!supabase) {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(publicSettings));
    }
    applyCssVariables(updated);

    if (supabase) {
      void (async () => {
        const { error } = await supabase.from('store_settings').upsert({
          id: 'default',
          value: publicSettings,
          updated_at: new Date().toISOString(),
        });

        if (error) {
          reportSyncError('Failed to save store settings to Supabase.', error.message);
          return;
        }

        reportSyncSuccess('Store settings saved to Supabase.');
      })();
    }
  };

  const applyTemplate = (templateId: string) => {
    const template = TEMPLATES.find((item) => item.id === templateId);
    if (!template) {
      return;
    }

    updateSettings({
      ...template.settings,
      desktop: { ...settings.desktop, ...template.settings.desktop },
      tablet: { ...settings.tablet, ...template.settings.tablet },
      mobile: { ...settings.mobile, ...template.settings.mobile },
      activeTemplate: template.id,
    } as ThemeSettings);
  };

  const addProduct = (product: Omit<Product, 'id' | 'createdAt'>) => {
    const newProduct: Product = { ...product, id: createId('p'), createdAt: Date.now() };
    const updated = [newProduct, ...products];
    setProducts(updated);
    if (!supabase) {
      localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(updated));
    }

    if (supabase) {
      void (async () => {
        const { error } = await supabase.from('products').insert(toProductRow(newProduct));
        if (error) {
          reportSyncError('Failed to create product in Supabase.', error.message);
          return;
        }
        reportSyncSuccess('Product created in Supabase.');
      })();
    }
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    const updated = products.map((product) => (product.id === id ? { ...product, ...updates } : product));
    const product = updated.find((item) => item.id === id);
    setProducts(updated);
    if (!supabase) {
      localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(updated));
    }

    if (supabase && product) {
      void (async () => {
        const { error } = await supabase.from('products').upsert(toProductRow(product));
        if (error) {
          reportSyncError('Failed to update product in Supabase.', error.message);
          return;
        }
        reportSyncSuccess('Product updated in Supabase.');
      })();
    }
  };

  const deleteProduct = async (id: string) => {
    const updated = products.filter((product) => product.id !== id);
    setProducts(updated);
    if (!supabase) {
      localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(updated));
      return;
    }

    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      reportSyncError('Failed to delete product from Supabase.', error.message);
      throw new Error(`Failed to delete template products: ${error.message}`);
    }
    reportSyncSuccess('Product removed from Supabase.');
  };

  const upsertPrintifyShopProducts = async (productPayloads: Array<Omit<Product, 'id' | 'createdAt'>>) => {
    if (productPayloads.length === 0) {
      return { importedCount: 0, updatedCount: 0 };
    }

    const categoryExists = categories.some((category) => category.id === PRINTIFY_CATEGORY.id);
    if (!categoryExists) {
      const updatedCategories = [...categories, PRINTIFY_CATEGORY].sort((a, b) => (a.order || 0) - (b.order || 0));
      setCategories(updatedCategories);

      if (!supabase) {
        localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(updatedCategories));
      } else {
        const { error } = await supabase.from('categories').upsert(toCategoryRow(PRINTIFY_CATEGORY));
        if (error) {
          throw new Error(`Failed to create Printify category: ${error.message}`);
        }
      }
    }

    let importedCount = 0;
    let updatedCount = 0;
    const nextProducts = [...products];
    const rowsToUpsert: Product[] = [];

    productPayloads.forEach((payload) => {
      const existingIndex = nextProducts.findIndex(
        (product) =>
          product.printifyProductId === payload.printifyProductId ||
          product.slug === payload.slug,
      );

      if (existingIndex >= 0) {
        const existingProduct = nextProducts[existingIndex];
        const updatedProduct: Product = {
          ...existingProduct,
          ...payload,
          id: existingProduct.id,
          createdAt: existingProduct.createdAt,
        };
        nextProducts[existingIndex] = updatedProduct;
        rowsToUpsert.push(updatedProduct);
        updatedCount++;
        return;
      }

      const newProduct: Product = {
        ...payload,
        id: createId('p'),
        createdAt: Date.now(),
      };
      nextProducts.unshift(newProduct);
      rowsToUpsert.push(newProduct);
      importedCount++;
    });

    setProducts(nextProducts);

    if (!supabase) {
      localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(nextProducts));
    } else {
      const slugsToUpsert = [...new Set(rowsToUpsert.map((product) => product.slug).filter(Boolean))];
      if (slugsToUpsert.length > 0) {
        const { data: existingRows, error: existingRowsError } = await supabase
          .from('products')
          .select('id, slug, created_at')
          .in('slug', slugsToUpsert);

        if (existingRowsError) {
          throw new Error(`Failed to check existing Printify shop products: ${existingRowsError.message}`);
        }

        const existingBySlug = new Map((existingRows || []).map((row: any) => [row.slug, row]));
        rowsToUpsert.forEach((product) => {
          const existingRow = existingBySlug.get(product.slug);
          if (existingRow?.id) {
            product.id = existingRow.id;
            product.createdAt = existingRow.created_at ?? product.createdAt;
          }
        });
      }

      const { error } = await supabase.from('products').upsert(rowsToUpsert.map(toProductRow), { onConflict: 'id' });
      if (error) {
        if (error.message.includes('is_printify') || error.message.includes('printify_product_id') || error.message.includes('printify_catalog_id')) {
          const legacyResult = await supabase.from('products').upsert(rowsToUpsert.map(toLegacyProductRow), { onConflict: 'id' });
          if (legacyResult.error) {
            throw new Error(`Failed to save Printify shop products: ${legacyResult.error.message}`);
          }
        } else {
          throw new Error(`Failed to save Printify shop products: ${error.message}`);
        }
      }
    }

    return { importedCount, updatedCount };
  };

  const upsertPrintifyCatalogTemplates = async (templates: PrintifyCatalogTemplate[], options?: { replaceVisible?: boolean }) => {
    if (templates.length === 0) {
      return;
    }

    const byId = new Map<string, PrintifyCatalogTemplate>(printifyCatalog.map((template) => [template.id, template]));
    const visibleTemplateIds = new Set(templates.map((template) => template.id));
    if (options?.replaceVisible) {
      byId.forEach((template, id) => {
        if (!visibleTemplateIds.has(id)) {
          byId.set(id, { ...template, isEnabled: false });
        }
      });
    }
    templates.forEach((template) => {
      const previous = byId.get(template.id);
      byId.set(template.id, {
        ...previous,
        ...template,
        syncStatus: template.syncStatus || previous?.syncStatus || 'raw',
        isEnabled: template.syncStatus === 'published' || template.isEnabled === true,
      });
    });
    const updated = Array.from(byId.values()).sort((a, b) => a.title.localeCompare(b.title));
    const publishedTemplates = updated.filter((template) => (template.syncStatus || (template.isEnabled ? 'published' : 'raw')) === 'published' && template.isEnabled);
    const selectedTemplateProductIds = new Set(publishedTemplates.map((template) => `printify_template_${template.id}`));

    setPrintifyCatalog(updated);
    savePrintifyCatalogLocally(updated);

    if (supabase) {
      let hasCatalogTable = true;
      
      // Log the payload being sent to Supabase for debugging
      const catalogRows = updated.map(toPrintifyCatalogRow);
      console.log('[Supabase Upsert] Sending payload:', catalogRows.length, 'templates');
      console.log('[Supabase Upsert] Sample payload:', catalogRows[0]);
      
      const { error } = await supabase.from('printify_catalog').upsert(catalogRows);
      if (error) {
        console.error('[Supabase Upsert Error] Full error object:', error);
        console.error('[Supabase Upsert Error] Message:', error.message);
        console.error('[Supabase Upsert Error] Details:', error.details);
        console.error('[Supabase Upsert Error] Hint:', error.hint);
        console.error('[Supabase Upsert Error] Code:', error.code);
        
        if (isMissingSupabaseRelationError(error.message, 'printify_catalog')) {
          hasCatalogTable = false;
        } else {
          reportSyncError('Failed to save Printify catalog templates to Supabase.', error.message);
          alert(`❌ Database Save Failed!\n\nError: ${error.message}\n\nDetails: ${error.details || 'No details'}\n\nHint: ${error.hint || 'No hint'}\n\nCheck console for full error.`);
          return;
        }
      } else {
        console.log('[Supabase Upsert] SUCCESS - Templates saved to database');
      }

      try {
        const categoryExists = categories.some((category) => category.id === PRINTIFY_CATEGORY.id);
        if (!categoryExists) {
          const { error: categoryError } = await supabase.from('categories').upsert(toCategoryRow(PRINTIFY_CATEGORY));
          if (categoryError) {
            reportSyncError('Failed to create Printify category for templates.', categoryError.message);
            return;
          }
          setCategories((currentCategories) => (
            currentCategories.some((category) => category.id === PRINTIFY_CATEGORY.id)
              ? currentCategories
              : [...currentCategories, PRINTIFY_CATEGORY].sort((a, b) => (a.order || 0) - (b.order || 0))
          ));
        }

        const mappedProducts = publishedTemplates.map((template) => templateToProduct(template));
        if (mappedProducts.length > 0) {
          const { error: productError } = await supabase.from('products').upsert(mappedProducts.map(toProductRow));
          if (productError) {
            if (productError.message.includes('is_printify') || productError.message.includes('printify_product_id') || productError.message.includes('printify_catalog_id')) {
              const legacyResult = await supabase.from('products').upsert(mappedProducts.map(toLegacyProductRow));
              if (legacyResult.error) {
                reportSyncError('Failed to publish Printify templates to products table (legacy layout).', legacyResult.error.message);
                return;
              }
            } else {
              reportSyncError('Failed to publish Printify templates to products table.', productError.message);
              return;
            }
          }
        }

        setProducts((currentProducts) => {
          const byProductId = new Map<string, Product>(currentProducts.map((product) => [product.id, product]));
          if (options?.replaceVisible) {
            byProductId.forEach((product, id) => {
              if (
                (id.startsWith('printify_template_') || product.printifyProductId?.startsWith('template_')) &&
                !selectedTemplateProductIds.has(id)
              ) {
                byProductId.delete(id);
              }
            });
          }
          mappedProducts.forEach((product) => {
            const existing = byProductId.get(product.id);
            byProductId.set(product.id, existing ? { ...existing, ...product, createdAt: existing.createdAt } : product);
          });
          return Array.from(byProductId.values());
        });

        if (options?.replaceVisible) {
          const obsoleteProductIds = products
            .filter((product) => (
              (product.id.startsWith('printify_template_') || product.printifyProductId?.startsWith('template_')) &&
              !selectedTemplateProductIds.has(product.id)
            ))
            .map((product) => product.id);
          if (obsoleteProductIds.length > 0) {
            await supabase.from('products').delete().in('id', obsoleteProductIds);
          }
        }

        if (hasCatalogTable) {
          reportSyncSuccess('Printify catalog templates saved. Published templates synced to products table.');
        } else {
          reportSyncSuccess('Printify templates published through product fallback.');
        }
      } catch (prodSyncErr: any) {
        reportSyncError('Failed to synchronize templates to products table.', prodSyncErr?.message || prodSyncErr);
      }
    }
  };

  const updatePrintifyCatalogTemplate = async (templateId: string, updates: Partial<PrintifyCatalogTemplate>) => {
    const currentTemplate = printifyCatalog.find((template) => template.id === templateId);
    if (!currentTemplate) {
      throw new Error(`Printify template ${templateId} was not found.`);
    }

    const nextTemplate: PrintifyCatalogTemplate = {
      ...currentTemplate,
      ...updates,
      syncStatus: updates.syncStatus || currentTemplate.syncStatus || (updates.isEnabled ? 'published' : 'raw'),
      isEnabled: updates.isEnabled ?? (updates.syncStatus === 'published' ? true : currentTemplate.isEnabled),
      lastSynced: updates.lastSynced || currentTemplate.lastSynced || new Date().toISOString(),
    };

    await upsertPrintifyCatalogTemplates([nextTemplate], { replaceVisible: false });
  };

  const deletePrintifyCatalogTemplate = async (templateId: string) => {
    const updatedCatalog = printifyCatalog.filter((t) => t.id !== templateId);
    setPrintifyCatalog(updatedCatalog);
    savePrintifyCatalogLocally(updatedCatalog);

    const template = printifyCatalog.find((t) => t.id === templateId);
    const blueprintId = template?.blueprintId;
    
    const updatedProducts = products.filter((p) => 
      p.id !== `printify_template_${templateId}` && 
      !(blueprintId && (p.printifyCatalogId === String(blueprintId) || p.printifyProductId === `template_${blueprintId}`))
    );
    setProducts(updatedProducts);
    localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(updatedProducts));

    if (supabase) {
      const { error: catalogErr } = await supabase.from('printify_catalog').delete().eq('id', templateId);
      if (catalogErr) {
        reportSyncError(`Failed to delete template ${templateId} from printify_catalog.`, catalogErr.message);
      }
      
      const obsoleteIds = [
        `printify_template_${templateId}`,
        blueprintId ? `printify_template_bp_${blueprintId}` : null
      ].filter(Boolean) as string[];
      
      const { error: prodErr } = await supabase.from('products').delete().in('id', obsoleteIds);
      if (prodErr) {
        reportSyncError(`Failed to delete fallback products for template ${templateId}.`, prodErr.message);
      }
      
      if (blueprintId) {
        const { error: prodErr2 } = await supabase.from('products').delete().eq('printify_catalog_id', String(blueprintId));
        if (prodErr2) {
          reportSyncError(`Failed to delete catalog matched products for blueprint ${blueprintId}.`, prodErr2.message);
        }
      }
    }
  };

  const clearPrintifyCatalog = async () => {
    setPrintifyCatalog([]);
    localStorage.removeItem(PRINTIFY_CATALOG_STORAGE_KEY);

    const updatedProducts = products.filter(
      (p) => !p.id.startsWith('printify_template_') && !p.printifyProductId?.startsWith('template_')
    );
    setProducts(updatedProducts);
    localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(updatedProducts));

    if (supabase) {
      const { error: catalogErr } = await supabase.from('printify_catalog').delete().neq('id', '_none_');
      if (catalogErr) {
        reportSyncError('Failed to clear printify_catalog table.', catalogErr.message);
      }

      const obsoleteProductIds = products
        .filter((p) => p.id.startsWith('printify_template_') || p.printifyProductId?.startsWith('template_'))
        .map((p) => p.id);
      
      if (obsoleteProductIds.length > 0) {
        const { error: prodErr } = await supabase.from('products').delete().in('id', obsoleteProductIds);
        if (prodErr) {
          reportSyncError('Failed to clear fallback templates from products table.', prodErr.message);
        }
      }
    }
  };

  const addCategory = (category: Omit<Category, 'id' | 'createdAt'>) => {
    const newCategory: Category = { ...category, id: createId('c'), createdAt: Date.now() };
    const updated = [newCategory, ...categories];
    setCategories(updated);
    if (!supabase) {
      localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(updated));
    }

    if (supabase) {
      void (async () => {
        const { error } = await supabase.from('categories').insert(toCategoryRow(newCategory));
        if (error) {
          reportSyncError('Failed to create category in Supabase.', error.message);
          return;
        }
        reportSyncSuccess('Category created in Supabase.');
      })();
    }
  };

  const updateCategory = (id: string, updates: Partial<Category>) => {
    const updated = categories.map((category) => (category.id === id ? { ...category, ...updates } : category));
    const category = updated.find((item) => item.id === id);
    setCategories(updated);
    if (!supabase) {
      localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(updated));
    }

    if (supabase && category) {
      void (async () => {
        const { error } = await supabase.from('categories').upsert(toCategoryRow(category));
        if (error) {
          reportSyncError('Failed to update category in Supabase.', error.message);
          return;
        }
        reportSyncSuccess('Category updated in Supabase.');
      })();
    }
  };

  const deleteCategory = (id: string) => {
    const updated = categories.filter((category) => category.id !== id);
    setCategories(updated);
    if (!supabase) {
      localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(updated));
    }

    if (supabase) {
      void (async () => {
        const { error } = await supabase.from('categories').delete().eq('id', id);
        if (error) {
          reportSyncError('Failed to delete category from Supabase.', error.message);
          return;
        }
        reportSyncSuccess('Category removed from Supabase.');
      })();
    }
  };

  const updateOrderStatus = (id: string, status: Order['status']) => {
    const updated = orders.map((order) => (order.id === id ? { ...order, status } : order));
    setOrders(updated);
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(updated));

    if (supabase) {
      void (async () => {
        const { error } = await supabase.from('orders').update({ status }).eq('id', id);
        if (error) {
          console.error('Failed to update order status:', error.message);
        }
      })();
    }
  };

  const updateOrderPrintifySync = (id: string, updates: Pick<Order, 'printifySyncStatus' | 'printifyOrderId' | 'printifyErrorLog'>) => {
    const updated = orders.map((order) => (order.id === id ? { ...order, ...updates } : order));
    setOrders(updated);
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(updated));

    if (supabase) {
      void (async () => {
        const { error } = await supabase
          .from('orders')
          .update({
            printify_sync_status: updates.printifySyncStatus,
            printify_order_id: updates.printifyOrderId ?? null,
            printify_error_log: updates.printifyErrorLog ?? null,
          })
          .eq('id', id);
        if (error) {
          console.error('Failed to update Printify order sync fields:', error.message);
          if (
            error.message.includes('printify_order_id') ||
            error.message.includes('printify_sync_status') ||
            error.message.includes('printify_error_log')
          ) {
            const order = updated.find((entry) => entry.id === id);
            if (order) {
              const legacyItems = [
                ...stripLegacyOrderMeta(order.items),
                ...(order.shippingAddress
                  ? [{
                      productId: '__shipping_address_meta',
                      name: 'Shipping Address Metadata',
                      price: 0,
                      quantity: 0,
                      shippingAddress: order.shippingAddress,
                    }]
                  : []),
                {
                  productId: '__printify_sync_meta',
                  name: 'Printify Sync Metadata',
                  price: 0,
                  quantity: 0,
                  printifySync: {
                    printifySyncStatus: updates.printifySyncStatus,
                    printifyOrderId: updates.printifyOrderId ?? null,
                    printifyErrorLog: updates.printifyErrorLog ?? null,
                  },
                },
              ];
              const { error: legacyError } = await supabase
                .from('orders')
                .update({ items: legacyItems })
                .eq('id', id);
              if (legacyError) {
                console.error('Failed to update legacy Printify order sync metadata:', legacyError.message);
              }
            }
          }
        }
      })();
    }
  };

  const cartTotal = useMemo(() => cart.reduce((accumulator, item) => accumulator + item.price * item.quantity, 0), [cart]);

  const addToCart = (product: Product, variant?: ProductVariant, quantity = 1, options?: { color?: string; size?: string; customization?: PrintifyCustomization }) => {
    setCart((current) => {
      const existingIndex = current.findIndex(
        (item) =>
          item.productId === product.id &&
          item.variantId === variant?.id &&
          item.color === options?.color &&
          item.size === options?.size &&
          JSON.stringify(item.customization || null) === JSON.stringify(options?.customization || null),
      );

      const nextCart = [...current];
      if (existingIndex > -1) {
        nextCart[existingIndex] = {
          ...nextCart[existingIndex],
          quantity: nextCart[existingIndex].quantity + quantity,
        };
      } else {
        nextCart.push({
          productId: product.id,
          variantId: variant?.id,
          name: product.name + (variant ? ` - ${variant.name}` : '') + (options?.color ? ` (${options.color})` : '') + (options?.size ? ` - ${options.size}` : '') + (options?.customization ? ' (Customized)' : ''),
          price: variant?.price || product.discountPrice || product.price,
          quantity,
          image: options?.customization?.previewUrl || product.images[0],
          color: options?.color,
          size: options?.size,
          customization: options?.customization,
          isPrintify: product.isPrintify,
          printifyProductId: product.printifyProductId,
          printifyCatalogId: product.printifyCatalogId,
          printifyBlueprintId: options?.customization?.printifyBlueprintId,
          printifyPrintProviderId: options?.customization?.printifyPrintProviderId,
          printifyVariantId: options?.customization?.printifyVariantId,
          printifyPrintAreas: options?.customization?.printifyPrintAreas,
        });
      }

      try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(nextCart));
      } catch (storageError) {
        console.warn('[DevsFolk] Cart could not be persisted to localStorage (storage quota exceeded). Cart changes will be lost on page refresh.', storageError);
      }
      return nextCart;
    });
  };

  const removeFromCart = (productId: string, variantId?: string, customization?: PrintifyCustomization) => {
    setCart((current) => {
      const updated = current.filter(
        (item) =>
          !(
            item.productId === productId &&
            item.variantId === variantId &&
            JSON.stringify(item.customization || null) === JSON.stringify(customization || null)
          ),
      );
      try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(updated));
      } catch (storageError) {
        console.warn('[DevsFolk] Cart could not be persisted to localStorage (storage quota exceeded). Cart changes will be lost on page refresh.', storageError);
      }
      return updated;
    });
  };

  const updateCartQuantity = (productId: string, variantId: string | undefined, quantity: number, customization?: PrintifyCustomization) => {
    setCart((current) => {
      const updated = current.map((item) =>
        item.productId === productId &&
        item.variantId === variantId &&
        JSON.stringify(item.customization || null) === JSON.stringify(customization || null)
          ? { ...item, quantity: Math.max(1, quantity) }
          : item,
      );
      try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(updated));
      } catch (storageError) {
        console.warn('[DevsFolk] Cart could not be persisted to localStorage (storage quota exceeded). Cart changes will be lost on page refresh.', storageError);
      }
      return updated;
    });
  };

  const clearCart = () => {
    setCart([]);
    localStorage.removeItem(CART_STORAGE_KEY);
  };

  const addReview = (review: Omit<Review, 'id' | 'createdAt'>) => {
    const newReview: Review = { ...review, id: createId('rev'), createdAt: Date.now() };
    const updated = [newReview, ...reviews];
    setReviews(updated);
    localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(updated));

    if (supabase) {
      void supabase.from('reviews').insert(toReviewRow(newReview));
    }
  };

  const deleteReview = (id: string) => {
    const updated = reviews.filter((rev) => rev.id !== id);
    setReviews(updated);
    localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(updated));

    if (supabase) {
      void supabase.from('reviews').delete().eq('id', id).then(({ error }) => {
        if (error) {
          console.error('Failed to delete review from Supabase:', error.message);
        }
      });
    }
  };

  const toggleWishlist = (productId: string) => {
    setWishlist((current) => {
      const updated = current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId];
      localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const login = async (email: string, password: string) => {
    if (!supabase) {
      console.warn('Supabase configuration is missing. Falling back to local offline admin login.');
      if (email === 'devsfolk@gmail.com' && password === 'lTCBkXW0HA4rNh0r') {
        setIsAdmin(true);
        return true;
      }
      return false;
    }

    setAuthLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error('Admin login failed:', error.message);
      setAuthLoading(false);
      return false;
    }

    setIsAdmin(true);
    setAuthLoading(false);
    return true;
  };

  const logout = async () => {
    if (supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Admin logout failed:', error.message);
      }
    }

    setIsAdmin(false);
  };

  const triggerAutoFulfillment = async (orderId: string, shopId: string, retries = 3, delay = 2000) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch('/api/printify/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId, shopId }),
        });

        const data = await response.json().catch(() => null);

        if (response.ok) {
          console.info(`[AutoFulfillment] Order ${orderId} submitted to Printify successfully on attempt ${attempt}.`);
          return;
        }

        if (data?.status === 'ALREADY_SYNCED') {
          console.info(`[AutoFulfillment] Order ${orderId} was already synced.`);
          return;
        }

        const errorMsg = data?.error || data?.message || `Status ${response.status}`;
        console.warn(`[AutoFulfillment] Attempt ${attempt}/${retries} failed for order ${orderId}: ${errorMsg}`);
      } catch (networkError: any) {
        console.warn(`[AutoFulfillment] Attempt ${attempt}/${retries} network error for order ${orderId}:`, networkError?.message || networkError);
      }

      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, delay * Math.pow(2, attempt - 1)));
      }
    }

    console.error(`[AutoFulfillment] All ${retries} attempts failed for order ${orderId}. Admin can use Push / Retry in the dashboard.`);
  };

  const placeOrder = (
    customerData: Omit<Order, 'id' | 'items' | 'total' | 'status' | 'createdAt'>,
    mode: 'WHATSAPP' | 'WEBSITE',
    paymentMethod?: string,
  ) => {
    const effectivePaymentMethod = mode === 'WHATSAPP' ? 'WHATSAPP' : paymentMethod;

    let initialStatus: Order['status'] = 'PENDING';
    if (effectivePaymentMethod) {
      try {
        const parsed = JSON.parse(effectivePaymentMethod);
        if (parsed.method === 'bank' && parsed.verified) {
          initialStatus = 'PROCESSING';
        }
      } catch {
        // Safe ignore
      }
    }

    const hasPrintifyItems = cart.some((item) => item.isPrintify || item.printifyProductId || item.printifyCatalogId || item.customization);
    const newOrder: Order = {
      id: createId('ord'),
      ...customerData,
      items: cart,
      total: cartTotal,
      status: initialStatus,
      createdAt: Date.now(),
      paymentMethod: effectivePaymentMethod,
      printifyOrderId: null,
      printifySyncStatus: hasPrintifyItems ? 'PENDING' : 'NOT_REQUIRED',
      printifyErrorLog: hasPrintifyItems ? 'Queued for Printify fulfillment bridge.' : null,
    };

    // Save to local device order history
    try {
      const storedHistory = JSON.parse(localStorage.getItem('customer_order_ids') || '[]');
      if (Array.isArray(storedHistory)) {
        if (!storedHistory.includes(newOrder.id)) {
          localStorage.setItem('customer_order_ids', JSON.stringify([...storedHistory, newOrder.id]));
        }
      } else {
        localStorage.setItem('customer_order_ids', JSON.stringify([newOrder.id]));
      }
    } catch {
      localStorage.setItem('customer_order_ids', JSON.stringify([newOrder.id]));
    }

    const updatedOrders = [newOrder, ...orders];
    const updatedProducts = products.map((product) => {
      const cartItem = cart.find((item) => item.productId === product.id);
      return cartItem ? { ...product, stock: Math.max(0, product.stock - cartItem.quantity) } : product;
    });

    setOrders(updatedOrders);
    setProducts(updatedProducts);
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(updatedOrders));
    localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(updatedProducts));
    localStorage.setItem(
      PENDING_ORDERS_STORAGE_KEY,
      JSON.stringify([
        ...readLocalJson<PendingWebsiteOrder[]>(PENDING_ORDERS_STORAGE_KEY, []).filter((entry) => entry.order.id !== newOrder.id),
        { order: newOrder, paymentMethod: effectivePaymentMethod },
      ]),
    );

    if (supabase) {
      void flushPendingOrdersToSupabase().then(() => {
        if (hasPrintifyItems) {
          const shopId = settings.printifySettings?.providerSettings?.shopId || '';
          if (shopId) {
            void triggerAutoFulfillment(newOrder.id, shopId);
          } else {
            console.warn('[AutoFulfillment] Skipped: no Printify shopId configured.');
          }
        }
      });
      void Promise.all(
        updatedProducts.map((product) => supabase.from('products').update({ stock: product.stock }).eq('id', product.id)),
      );
      if (isAdmin) {
        void syncOrdersFromSupabase();
      }
    }

    if (mode === 'WHATSAPP') {
      const itemsList = cart
        .map((item) => `${item.name} x${item.quantity} - ${settings.currencySymbol}${(item.price * item.quantity).toFixed(2)}`)
        .join('\n');
      const message = `*New Order from ${settings.shopName}*\n\n*Customer:* ${customerData.customerName}\n*Phone:* ${customerData.customerPhone}\n*Address:* ${customerData.customerAddress}\n\n*Items:*\n${itemsList}\n\n*Total:* ${settings.currencySymbol}${cartTotal.toFixed(2)}`;
      window.open(`https://wa.me/${settings.whatsappNumber}?text=${encodeURIComponent(message)}`, '_blank');
    }

    clearCart();
  };

  const value = useMemo(
    () => ({
      settings,
      updateSettings,
      applyTemplate,
      products,
      addProduct,
      updateProduct,
      deleteProduct,
      upsertPrintifyShopProducts,
      printifyCatalog,
      upsertPrintifyCatalogTemplates,
      updatePrintifyCatalogTemplate,
      deletePrintifyCatalogTemplate,
      clearPrintifyCatalog,
      categories,
      addCategory,
      updateCategory,
      deleteCategory,
      orders,
      updateOrderStatus,
      updateOrderPrintifySync,
      refreshOrders: syncOrdersFromSupabase,
      cart,
      addToCart,
      removeFromCart,
      updateCartQuantity,
      clearCart,
      placeOrder,
      cartTotal,
      loading,
      reviews,
      addReview,
      deleteReview,
      wishlist,
      toggleWishlist,
      isAdmin,
      login,
      logout,
    }),
    [settings, products, printifyCatalog, categories, orders, cart, cartTotal, loading, reviews, wishlist, isAdmin],
  );

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
};

export const useShop = () => {
  const context = useContext(ShopContext);
  if (!context) {
    throw new Error('useShop must be used within a ShopProvider');
  }
  return context;
};
