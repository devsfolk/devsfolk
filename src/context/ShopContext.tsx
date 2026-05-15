import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ThemeSettings, Product, Category, Order, OrderItem, ProductVariant, Review, StoreFeature, SocialLink } from '../types';
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
  categories: Category[];
  addCategory: (category: Omit<Category, 'id' | 'createdAt'>) => void;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  orders: Order[];
  updateOrderStatus: (id: string, status: Order['status']) => void;
  refreshOrders: () => Promise<void>;
  cart: CartItem[];
  addToCart: (product: Product, variant?: ProductVariant, quantity?: number, options?: { color?: string; size?: string }) => void;
  removeFromCart: (productId: string, variantId?: string) => void;
  updateCartQuantity: (productId: string, variantId: string | undefined, quantity: number) => void;
  clearCart: () => void;
  placeOrder: (customerData: Omit<Order, 'id' | 'items' | 'total' | 'status' | 'createdAt'>, mode: 'WHATSAPP' | 'WEBSITE', paymentMethod?: string) => void;
  cartTotal: number;
  loading: boolean;
  reviews: Review[];
  addReview: (review: Omit<Review, 'id' | 'createdAt'>) => void;
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
  shopName: 'Lumina Beauty',
  shopDescription: 'Premium Artistry & Skincare for the Modern Aesthetic',
  currency: 'USD',
  currencySymbol: '$',
  whatsappNumber: '1234567890',
  orderMode: 'WEBSITE',
  paymentSettings: {
    stripe: { enabled: false, apiKey: '', secretKey: '' },
    paypal: { enabled: false, clientId: '' },
    bankTransfer: { enabled: false, accountDetails: '' },
    cod: { enabled: true },
  },
  analytics: {
    googleAnalyticsId: '',
  },
  trustFeatures: [
    { id: 'feature-shipping', title: 'Free Shipping', subtitle: 'Fast delivery on eligible orders', icon: 'truck', enabled: true },
    { id: 'feature-secure', title: 'Secure Checkout', subtitle: 'Protected payments and trusted checkout', icon: 'shield', enabled: true },
    { id: 'feature-support', title: 'Quick Support', subtitle: 'Reach us easily when you need help', icon: 'message-circle', enabled: true },
    { id: 'feature-returns', title: 'Easy Returns', subtitle: 'Simple return process for peace of mind', icon: 'rotate-ccw', enabled: true },
  ],
  socialLinks: [
    { id: 'social-instagram', platform: 'Instagram', url: '', enabled: false },
    { id: 'social-facebook', platform: 'Facebook', url: '', enabled: false },
    { id: 'social-youtube', platform: 'YouTube', url: '', enabled: false },
  ],
  desktop: { ...DEFAULT_DEVICE_CONFIG, productGridCols: 4 },
  tablet: { ...DEFAULT_DEVICE_CONFIG, productGridCols: 2, headerStyle: 'minimal' },
  mobile: { ...DEFAULT_DEVICE_CONFIG, productGridCols: 1, headerStyle: 'minimal', heroStyle: 'minimal' },
  sections: [
    {
      id: 's1',
      type: 'HERO',
      title: 'Elevate Your Everyday Style',
      subtitle: 'Discover our curated collection of premium essentials.',
      enabled: true,
      order: 0,
      config: { height: 'medium', textAlign: 'left', buttonText: 'Shop All' },
    },
    { id: 's2', type: 'CATEGORIES', title: 'Shop by Category', enabled: true, order: 1 },
    { id: 's3', type: 'FEATURED_PRODUCTS', title: 'New Arrivals', enabled: true, order: 2 },
    { id: 's4', type: 'ABOUT', title: 'Our Story', enabled: true, order: 3 },
    { id: 's5', type: 'NEWSLETTER', title: 'Join the Community', enabled: true, order: 4 },
  ],
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
];

const SETTINGS_STORAGE_KEY = 'omnistore_settings';
const PRODUCTS_STORAGE_KEY = 'omnistore_products';
const CATEGORIES_STORAGE_KEY = 'omnistore_categories';
const ORDERS_STORAGE_KEY = 'omnistore_orders';
const PENDING_ORDERS_STORAGE_KEY = 'omnistore_pending_orders';
const REVIEWS_STORAGE_KEY = 'omnistore_reviews';
const CART_STORAGE_KEY = 'omnistore_cart';
const WISHLIST_STORAGE_KEY = 'omnistore_wishlist';

const ShopContext = createContext<ShopContextType | undefined>(undefined);

const readLocalJson = <T,>(key: string, fallback: T): T => {
  const saved = localStorage.getItem(key);
  if (!saved) {
    return fallback;
  }

  try {
    return JSON.parse(saved) as T;
  } catch {
    return fallback;
  }
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

const mergeSettings = (raw?: Partial<ThemeSettings> | null): ThemeSettings => ({
  ...DEFAULT_SETTINGS,
  ...raw,
  primaryColor: sanitizeColorValue(raw?.primaryColor, DEFAULT_SETTINGS.primaryColor),
  secondaryColor: sanitizeColorValue(raw?.secondaryColor, DEFAULT_SETTINGS.secondaryColor),
  backgroundColor: sanitizeColorValue(raw?.backgroundColor, DEFAULT_SETTINGS.backgroundColor),
  paymentSettings: {
    ...DEFAULT_SETTINGS.paymentSettings,
    ...(raw?.paymentSettings || {}),
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
  sections: raw?.sections || DEFAULT_SETTINGS.sections,
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

const mapProductRow = (row: any): Product => ({
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
  variants: row.variants || [],
  createdAt: row.created_at ?? Date.now(),
});

const mapReviewRow = (row: any): Review => ({
  id: row.id,
  productId: row.product_id,
  userName: row.user_name,
  rating: row.rating,
  comment: row.comment,
  createdAt: row.created_at ?? Date.now(),
});

const mapOrderRow = (row: any): Order => ({
  id: row.id,
  customerName: row.customer_name,
  customerEmail: row.customer_email,
  customerPhone: row.customer_phone,
  customerAddress: row.customer_address,
  items: row.items || [],
  total: Number(row.total),
  status: row.status,
  createdAt: row.created_at ?? Date.now(),
});

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
});

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
  items: order.items,
  total: order.total,
  status: order.status,
  payment_method: paymentMethod ?? null,
  created_at: order.createdAt,
});

const createId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export const ShopProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<ThemeSettings>(DEFAULT_SETTINGS);
  const [products, setProducts] = useState<Product[]>([]);
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
    console.info(`[OmniStore Sync] ${message}`);
  };

  const reportSyncError = (message: string, error?: unknown) => {
    console.error(`[OmniStore Sync] ${message}`, error);
  };

  const syncCatalogFromSupabase = async () => {
    if (!supabase) {
      return;
    }

    const [settingsResult, categoriesResult, productsResult, reviewsResult] = await Promise.all([
      supabase.from('store_settings').select('value').eq('id', 'default').maybeSingle(),
      supabase.from('categories').select('*').order('display_order', { ascending: true }),
      supabase.from('products').select('*').order('display_order', { ascending: true }),
      supabase.from('reviews').select('*').order('created_at', { ascending: false }),
    ]);

    if (settingsResult.error) {
      reportSyncError('Failed to load store settings from Supabase.', settingsResult.error.message);
    } else {
      const rawSettings = (settingsResult.data?.value ?? {}) as Partial<ThemeSettings>;
      const remoteSettings = mergeSettings(rawSettings);
      setSettings(remoteSettings);
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(remoteSettings));
      applyCssVariables(remoteSettings);
    }

    if (categoriesResult.error) {
      reportSyncError('Failed to load categories from Supabase.', categoriesResult.error.message);
    } else {
      const remoteCategories = (categoriesResult.data ?? []).map(mapCategoryRow);
      setCategories(remoteCategories);
      localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(remoteCategories));
    }

    if (productsResult.error) {
      reportSyncError('Failed to load products from Supabase.', productsResult.error.message);
    } else {
      const remoteProducts = (productsResult.data ?? []).map(mapProductRow);
      setProducts(remoteProducts);
      localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(remoteProducts));
    }

    if (reviewsResult.error) {
      reportSyncError('Failed to load reviews from Supabase.', reviewsResult.error.message);
    } else {
      const remoteReviews = (reviewsResult.data ?? []).map(mapReviewRow);
      setReviews(remoteReviews);
      localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(remoteReviews));
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
        const localSettings = mergeSettings(JSON.parse(rawLocalSettings) as Partial<ThemeSettings>);
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
      const { error } = await supabase
        .from('orders')
        .insert(toOrderRow(pendingOrder.order, pendingOrder.paymentMethod));

      if (error) {
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
      const localProducts = hasLocalProducts
        ? readLocalJson<Product[]>(PRODUCTS_STORAGE_KEY, [])
        : hasSupabaseConfig
          ? []
          : SAMPLE_PRODUCTS;
      const localCategories = hasLocalCategories
        ? readLocalJson<Category[]>(CATEGORIES_STORAGE_KEY, [])
        : hasSupabaseConfig
          ? []
          : SAMPLE_CATEGORIES;
      const localOrders = readLocalJson<Order[]>(ORDERS_STORAGE_KEY, []);
      const localReviews = hasLocalReviews ? readLocalJson<Review[]>(REVIEWS_STORAGE_KEY, []) : [];
      const localCart = readLocalJson<CartItem[]>(CART_STORAGE_KEY, []);
      const localWishlist = readLocalJson<string[]>(WISHLIST_STORAGE_KEY, []);

      setSettings(localSettings);
      setProducts(localProducts);
      setCategories(localCategories);
      setOrders(localOrders);
      setReviews(localReviews);
      setCart(localCart);
      setWishlist(localWishlist);
      applyCssVariables(localSettings);
      setDataLoading(false);

      if (!supabase) {
        setAuthLoading(false);
        return;
      }

      try {
        await syncCatalogFromSupabase();
        await flushPendingOrdersToSupabase();
      } catch (error) {
        reportSyncError('Failed to hydrate storefront data from Supabase.', error);
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
    setSettings(updated);
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
    applyCssVariables(updated);

    if (supabase) {
      void (async () => {
        const { error } = await supabase.from('store_settings').upsert({
          id: 'default',
          value: updated,
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
    localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(updated));

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
    localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(updated));

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

  const deleteProduct = (id: string) => {
    const updated = products.filter((product) => product.id !== id);
    setProducts(updated);
    localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(updated));

    if (supabase) {
      void (async () => {
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) {
          reportSyncError('Failed to delete product from Supabase.', error.message);
          return;
        }
        reportSyncSuccess('Product removed from Supabase.');
      })();
    }
  };

  const addCategory = (category: Omit<Category, 'id' | 'createdAt'>) => {
    const newCategory: Category = { ...category, id: createId('c'), createdAt: Date.now() };
    const updated = [newCategory, ...categories];
    setCategories(updated);
    localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(updated));

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
    localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(updated));

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
    localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(updated));

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
      void supabase.from('orders').update({ status }).eq('id', id);
    }
  };

  const cartTotal = useMemo(() => cart.reduce((accumulator, item) => accumulator + item.price * item.quantity, 0), [cart]);

  const addToCart = (product: Product, variant?: ProductVariant, quantity = 1, options?: { color?: string; size?: string }) => {
    setCart((current) => {
      const existingIndex = current.findIndex(
        (item) =>
          item.productId === product.id &&
          item.variantId === variant?.id &&
          item.color === options?.color &&
          item.size === options?.size,
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
          name: product.name + (variant ? ` - ${variant.name}` : '') + (options?.color ? ` (${options.color})` : '') + (options?.size ? ` - ${options.size}` : ''),
          price: variant?.price || product.discountPrice || product.price,
          quantity,
          image: product.images[0],
          color: options?.color,
          size: options?.size,
        });
      }

      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(nextCart));
      return nextCart;
    });
  };

  const removeFromCart = (productId: string, variantId?: string) => {
    setCart((current) => {
      const updated = current.filter((item) => !(item.productId === productId && item.variantId === variantId));
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const updateCartQuantity = (productId: string, variantId: string | undefined, quantity: number) => {
    setCart((current) => {
      const updated = current.map((item) =>
        item.productId === productId && item.variantId === variantId
          ? { ...item, quantity: Math.max(1, quantity) }
          : item,
      );
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(updated));
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
      console.error('Supabase configuration is missing.');
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

  const placeOrder = (
    customerData: Omit<Order, 'id' | 'items' | 'total' | 'status' | 'createdAt'>,
    mode: 'WHATSAPP' | 'WEBSITE',
    paymentMethod?: string,
  ) => {
    const newOrder: Order = {
      id: createId('ord'),
      ...customerData,
      items: cart,
      total: cartTotal,
      status: 'PENDING',
      createdAt: Date.now(),
    };

    if (mode === 'WEBSITE') {
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
          { order: newOrder, paymentMethod },
        ]),
      );

      if (supabase) {
        void flushPendingOrdersToSupabase();
        void Promise.all(
          updatedProducts.map((product) => supabase.from('products').update({ stock: product.stock }).eq('id', product.id)),
        );
        if (isAdmin) {
          void syncOrdersFromSupabase();
        }
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
      categories,
      addCategory,
      updateCategory,
      deleteCategory,
      orders,
      updateOrderStatus,
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
      wishlist,
      toggleWishlist,
      isAdmin,
      login,
      logout,
    }),
    [settings, products, categories, orders, cart, cartTotal, loading, reviews, wishlist, isAdmin],
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
