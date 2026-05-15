import { ThemeSettings, StoreSection, DeviceConfig } from '../types';

export interface Template {
  id: string;
  name: string;
  description: string;
  previewUrl: string;
  settings: Partial<Omit<ThemeSettings, 'desktop' | 'tablet' | 'mobile'>> & {
    desktop?: Partial<DeviceConfig>;
    tablet?: Partial<DeviceConfig>;
    mobile?: Partial<DeviceConfig>;
  };
}

export const TEMPLATES: Template[] = [
  {
    id: 'devsfolk',
    name: 'DevsFolk Theme & Template',
    description: 'Clean, compact, modern, and mobile-optimized. Featured search and category slider.',
    previewUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=400',
    settings: {
      primaryColor: '#000000',
      secondaryColor: '#f3f4f6',
      fontSans: 'Inter',
      fontDisplay: 'Outfit',
      desktop: {
        headerStyle: 'standard', // Custom logic for Search in Center
        headerTheme: 'light',
        isHeaderSticky: true,
        heroStyle: 'banner',
        productGridCols: 4,
        productCardStyle: 'grid',
        showCategories: true,
        showFeatured: true,
        showNewsletter: true,
        footerStyle: 'simple'
      },
      mobile: {
        headerStyle: 'minimal',
        headerTheme: 'light',
        isHeaderSticky: true,
        heroStyle: 'minimal',
        productGridCols: 2,
        productCardStyle: 'grid',
        showCategories: true,
        showFeatured: true,
        showNewsletter: false,
        footerStyle: 'simple'
      },
      sections: [
        { id: 'cat-slider', type: 'CATEGORY_SLIDER', title: 'Top Categories', enabled: true, order: 0, config: { isSlider: true, showArrows: true } },
        { id: 'sale-banner', type: 'SALE_BANNER', title: 'Season Sale', enabled: true, order: 1, config: { height: 'thin', imageUrl: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&q=80&w=2000' } },
        { id: 'featured', type: 'FEATURED_PRODUCTS', title: 'New Arrivals', enabled: true, order: 2 },
        { id: 'about', type: 'ABOUT', title: 'DevsFolk Story', enabled: true, order: 3 },
      ]
    }
  },
  {
    id: 'minimalist',
    name: 'Minimalist White',
    description: 'Ultra clean design with focus on typography and whitespace.',
    previewUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=400',
    settings: {
      primaryColor: '#000000',
      fontSans: 'Inter',
      fontDisplay: 'Inter',
      desktop: {
        headerStyle: 'minimal',
        headerTheme: 'glass',
        isHeaderSticky: true,
        heroStyle: 'minimal',
        productGridCols: 3,
        productCardStyle: 'grid',
        showCategories: false,
        showFeatured: true,
        showNewsletter: true,
        footerStyle: 'simple'
      },
      sections: [
        { id: 'hero', type: 'HERO', title: 'Quality over quantity', enabled: true, order: 0 },
        { id: 'featured', type: 'FEATURED_PRODUCTS', title: 'Selected Pieces', enabled: true, order: 1 },
      ]
    }
  },
  {
    id: 'luxury-gold',
    name: 'Luxury Gold',
    description: 'Elegant dark theme with golden accents for premium brands.',
    previewUrl: 'https://images.unsplash.com/photo-1549439602-43ebca2327af?auto=format&fit=crop&q=80&w=400',
    settings: {
      primaryColor: '#D4AF37',
      secondaryColor: '#1A1A1A',
      fontSans: 'Outfit',
      fontDisplay: 'Playfair Display',
      desktop: {
        headerStyle: 'standard',
        headerTheme: 'dark',
        isHeaderSticky: true,
        heroStyle: 'banner',
        productGridCols: 4,
        productCardStyle: 'grid',
        showCategories: true,
        showFeatured: true,
        showNewsletter: true,
        footerStyle: 'detailed'
      },
      mobile: {
         headerTheme: 'dark',
         isHeaderSticky: true,
         productGridCols: 1,
         heroStyle: 'banner'
      }
    }
  },
  {
    id: 'vibrant-retro',
    name: 'Vibrant Retro',
    description: 'Bold colors and unique typography for a nostalgic feel.',
    previewUrl: 'https://images.unsplash.com/photo-1524678606370-a47ad25cb82a?auto=format&fit=crop&q=80&w=400',
    settings: {
      primaryColor: '#FF6B6B',
      secondaryColor: '#4ECDC4',
      fontSans: 'Outfit',
      fontDisplay: 'Space Grotesk',
      desktop: {
        headerTheme: 'light',
        productGridCols: 4,
        productCardStyle: 'grid'
      }
    }
  }
];
