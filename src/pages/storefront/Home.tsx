import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useShop } from '@/context/ShopContext';
import { StoreSection } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, ShoppingBag, Zap, ShieldCheck, Truck, Mail, ChevronLeft, ChevronRight, MessageCircle, RotateCcw, CreditCard, Gift, BadgeCheck } from 'lucide-react';
import { BespokeCustomizer } from '@/components/printify/BespokeCustomizer';
import { isRawPrintifyTemplateProduct } from '@/lib/printifyProductGuards';

const hexToRgb = (hex: string) => {
  const normalized = hex.trim().replace('#', '');
  if (normalized.length !== 3 && normalized.length !== 6) return null;
  const expanded = normalized.length === 3
    ? normalized.split('').map((char) => `${char}${char}`).join('')
    : normalized;
  const int = Number.parseInt(expanded, 16);
  if (Number.isNaN(int)) return null;
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  };
};

const buildOverlayBackground = (overlayColor = '#000000', overlayOpacity = 60) => {
  const rgb = hexToRgb(overlayColor) || { r: 0, g: 0, b: 0 };
  const baseAlpha = Math.max(0, Math.min(1, overlayOpacity / 100));
  const midAlpha = Math.max(0, Math.min(1, baseAlpha * 0.6));
  return `linear-gradient(to right, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${baseAlpha}), rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${midAlpha}), rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0))`;
};

const heroButtonVariant = (buttonStyle?: 'filled' | 'outline' | 'ghost') => {
  if (buttonStyle === 'outline') return 'outline' as const;
  if (buttonStyle === 'ghost') return 'ghost' as const;
  return 'default' as const;
};

const heroButtonSizeClass = (buttonSize?: 'small' | 'medium' | 'large') => {
  switch (buttonSize) {
    case 'small':
      return 'h-10 px-5 text-[10px] md:text-xs';
    case 'large':
      return 'h-16 px-12 text-xs md:text-base';
    case 'medium':
    default:
      return 'h-12 md:h-14 px-6 md:px-10 text-[10px] md:text-lg';
  }
};

const getHeroHeadingSizeClass = (size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl') => {
  switch (size) {
    case 'xs':
      return 'text-2xl md:text-3xl';
    case 'sm':
      return 'text-4xl md:text-5xl';
    case 'md':
      return 'text-5xl md:text-6xl';
    case 'lg':
      return 'text-6xl md:text-7xl';
    case '2xl':
      return 'text-8xl md:text-9xl';
    case 'xl':
    default:
      return 'text-7xl md:text-8xl';
  }
};

const getHeroHeadingWeightClass = (weight?: '400' | '600' | '700' | '800' | '900') => {
  switch (weight) {
    case '400':
      return 'font-normal';
    case '600':
      return 'font-semibold';
    case '700':
      return 'font-bold';
    case '800':
      return 'font-extrabold';
    case '900':
    default:
      return 'font-black';
  }
};

const getHeroSubtitleSizeClass = (size?: 'xs' | 'sm' | 'md' | 'lg') => {
  switch (size) {
    case 'xs':
      return 'text-xs md:text-sm';
    case 'sm':
      return 'text-sm md:text-base';
    case 'lg':
      return 'text-lg md:text-xl';
    case 'md':
    default:
      return 'text-base md:text-lg';
  }
};

const getHeroContentWidthClass = (width?: 'narrow' | 'medium' | 'wide' | 'full') => {
  switch (width) {
    case 'narrow':
      return 'max-w-xl';
    case 'wide':
      return 'max-w-5xl';
    case 'full':
      return 'max-w-none';
    case 'medium':
    default:
      return 'max-w-3xl';
  }
};

const getHeroContentPositionClass = (position?: 'top' | 'center' | 'bottom') => {
  switch (position) {
    case 'top':
      return 'items-start';
    case 'bottom':
      return 'items-end';
    case 'center':
    default:
      return 'items-center';
  }
};

const getHeroButtonRadiusClass = (radius?: 'none' | 'sm' | 'md' | 'lg' | 'full') => {
  switch (radius) {
    case 'none':
      return 'rounded-none';
    case 'sm':
      return 'rounded-md';
    case 'md':
      return 'rounded-lg';
    case 'lg':
      return 'rounded-2xl';
    case 'full':
    default:
      return 'rounded-full';
  }
};

const getHeroTransitionDuration = (transitionSpeed?: 'slow' | 'normal' | 'fast') => {
  switch (transitionSpeed) {
    case 'slow':
      return 2;
    case 'fast':
      return 0.4;
    case 'normal':
    default:
      return 1;
  }
};

const getHeroTransitionVariants = (transitionStyle?: 'fade' | 'slide' | 'zoom') => {
  switch (transitionStyle) {
    case 'slide':
      return {
        initial: { opacity: 0, x: 40 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -40 },
      };
    case 'zoom':
      return {
        initial: { opacity: 0, scale: 1.08 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.96 },
      };
    case 'fade':
    default:
      return {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      };
  }
};

const getSectionLinkTarget = (type: string) => {
  switch (type) {
    case 'CATEGORY_SLIDER':
      return '#category-slider';
    case 'CATEGORIES':
      return '#categories';
    case 'FEATURED_PRODUCTS':
      return '/products';
    case 'NEWSLETTER':
      return '#newsletter';
    case 'ABOUT':
      return '#about';
    case 'SALE_BANNER':
      return '#sale-banner';
    case 'CUSTOMIZER':
      return '#customizer';
    case 'HERO':
      return '#hero';
    default:
      return null;
  }
};

export const Home: React.FC = () => {
  const { settings, products, categories, addToCart, loading } = useShop();
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const heroSectionSettings = React.useMemo(
    () => settings.sections.find((section) => section.type === 'HERO' && section.enabled),
    [settings.sections]
  );
  const homepageProducts = React.useMemo(() => {
    const orderedProducts = products
      .filter((product) => !isRawPrintifyTemplateProduct(product))
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    const featuredProducts = orderedProducts.filter((product) => product.isFeatured);
    return featuredProducts.length > 0 ? featuredProducts : orderedProducts;
  }, [products]);

  const featureIconMap = {
    truck: Truck,
    shield: ShieldCheck,
    'message-circle': MessageCircle,
    'rotate-ccw': RotateCcw,
    zap: Zap,
    'credit-card': CreditCard,
    gift: Gift,
    'badge-check': BadgeCheck,
  } as const;

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) setDevice('mobile');
      else if (window.innerWidth < 1024) setDevice('tablet');
      else setDevice('desktop');
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Simple auto-slider for sections
  useEffect(() => {
    const heroAutoPlay = heroSectionSettings?.config?.autoPlay !== false;
    if (!heroAutoPlay) return;

    const heroSlideInterval = Math.max(2, Math.min(15, heroSectionSettings?.config?.slideInterval ?? 5));
    const timer = setInterval(() => {
      setActiveSlideIndex(prev => (prev + 1) % 10); // Cycle up to 10 images
    }, heroSlideInterval * 1000);
    return () => clearInterval(timer);
  }, [heroSectionSettings?.config?.autoPlay, heroSectionSettings?.config?.slideInterval]);

  React.useEffect(() => {
    if (settings.shopName) {
      document.title = `${settings.shopName} | ${settings.shopDescription}`;
    }
  }, [settings.shopName, settings.shopDescription]);

  const deviceConfig = settings[device];

  const renderSection = (section: StoreSection) => {
    if (!section.enabled) return null;

    const config = section.config || {};
    const textAlign = config.textAlign || 'left';
    const height = config.height === 'viewport' ? 'min-h-[80vh]' : 
                 config.height === 'large' ? 'min-h-[600px]' :
                 config.height === 'small' ? 'min-h-[300px]' : 'min-h-[450px]';

    const isDevsFolk = settings.activeTemplate === 'devsfolk';

    const devsfolkBgStyle = isDevsFolk && settings.devsfolkBgColor 
      ? { backgroundColor: settings.devsfolkBgColor } 
      : {};

    // Device-specific collection image ratio and visible counts
    let devsfolkCatRatioValue = settings.devsfolkCatRatioDesktop || 'square';
    let devsfolkInitialCountValue: number | 'all' = settings.devsfolkInitialCategoriesCountDesktop || 4;

    if (device === 'tablet') {
      devsfolkCatRatioValue = settings.devsfolkCatRatioTablet || 'square';
      devsfolkInitialCountValue = settings.devsfolkInitialCategoriesCountTablet || 3;
    } else if (device === 'mobile') {
      devsfolkCatRatioValue = settings.devsfolkCatRatioMobile || 'square';
      devsfolkInitialCountValue = settings.devsfolkInitialCategoriesCountMobile || 1;
    }

    const ratioMap = {
      'square': 'aspect-square',
      'portrait': 'aspect-[3/4]',
      'portrait-tall': 'aspect-[9/16]',
      'landscape': 'aspect-[4/3]',
      'landscape-wide': 'aspect-[16/9]'
    };
    const catRatioClass = ratioMap[devsfolkCatRatioValue] || 'aspect-square';

    const desktopItemWidth = devsfolkInitialCountValue === 'all'
      ? 'w-[140px] md:w-[220px]'
      : `calc((100% - (16px * (${devsfolkInitialCountValue} - 1))) / ${devsfolkInitialCountValue})`;

    const mobileItemWidth = devsfolkInitialCountValue === 'all'
      ? 'w-[100px]'
      : `calc((100% - (8px * (${devsfolkInitialCountValue} - 1))) / ${devsfolkInitialCountValue})`;

    const tabletItemWidth = devsfolkInitialCountValue === 'all'
      ? 'w-[120px] sm:w-[180px]'
      : `calc((100% - (12px * (${devsfolkInitialCountValue} - 1))) / ${devsfolkInitialCountValue})`;

    const activeItemWidth = device === 'mobile' 
      ? mobileItemWidth 
      : device === 'tablet' 
        ? tabletItemWidth 
        : desktopItemWidth;

    const gallery = config.gallery || [];
    const currentSlide = gallery.length > 0 ? gallery[activeSlideIndex % gallery.length] : null;
    const mainImage = config.imageUrl || currentSlide || (gallery.length > 0 ? gallery[0] : null);
    const buttonLink = config.buttonLink?.trim() || '/products';
    const isExternalButtonLink = /^https?:\/\//i.test(buttonLink) || buttonLink.startsWith('mailto:') || buttonLink.startsWith('tel:');
    const isAnchorButtonLink = buttonLink.startsWith('#');
    const buttonVariant = heroButtonVariant(config.buttonStyle);
    const buttonSizeClass = heroButtonSizeClass(config.buttonSize);
    const overlayOpacity = config.overlayOpacity ?? 60;
    const overlayColor = config.overlayColor || '#000000';
    const buttonAlignment = config.buttonAlignment || textAlign;
    const buttonTextColor = config.buttonTextColor?.trim() || (buttonVariant === 'default' ? '#ffffff' : '');
    const hasHeroBackgroundImage = Boolean(mainImage || settings.heroBannerUrl);
    const showHeroImage = hasHeroBackgroundImage && !(device === 'mobile' && config.hideImageOnMobile);
    const showHeroOverlay = showHeroImage || deviceConfig.heroStyle === 'banner';
    const heroContentPosition = config.contentPosition || 'center';
    const heroContentWidthClass = getHeroContentWidthClass(config.contentMaxWidth);
    const heroContentPositionClass = getHeroContentPositionClass(heroContentPosition);
    const heroButtonRadiusClass = getHeroButtonRadiusClass(config.buttonBorderRadius);
    const heroHeadingClass = `${getHeroHeadingSizeClass(config.headingSize)} ${getHeroHeadingWeightClass(config.headingWeight)}`;
    const heroSubtitleClass = getHeroSubtitleSizeClass(config.subtitleSize);
    const heroSectionStyle = {
      ...(config.minHeight ? { minHeight: `${config.minHeight}px` } : {}),
      backgroundColor: config.backgroundColor || (hasHeroBackgroundImage || deviceConfig.heroStyle === 'banner' ? '#000000' : '#ffffff'),
    };
    const heroTransitionDuration = getHeroTransitionDuration(config.transitionSpeed);
    const heroTransitionVariants = getHeroTransitionVariants(config.transitionStyle);
    const heroDefaultTextClass = hasHeroBackgroundImage ? 'text-white' : 'text-black';

    switch (section.type) {
      case 'CATEGORY_SLIDER':
          return (
            <motion.section 
              key={section.id} 
              id="category-slider"
              initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className={`${isDevsFolk && device === 'mobile' ? 'py-4' : 'py-12'} relative group overflow-hidden`}
            style={devsfolkBgStyle}
          >
             <div className="container mx-auto px-4 relative">
                <div className={`flex items-center justify-between ${isDevsFolk && device === 'mobile' ? 'mb-4' : 'mb-8'}`}>
                   <h2 
                    className={`${isDevsFolk && device === 'mobile' ? 'text-sm' : 'text-2xl'} font-black uppercase tracking-widest`} 
                    style={{ fontFamily: settings.fontDisplay }}
                   >
                     {section.title}
                   </h2>
                   <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className={`rounded-full h-8 w-8 border ${isDevsFolk && device === 'mobile' ? 'h-7 w-7' : 'h-10 w-10 border-2'}`}
                        onClick={() => {
                          const el = document.getElementById('cat-slider');
                          if (el) el.scrollBy({ left: -300, behavior: 'smooth' });
                        }}
                      >
                         <ChevronLeft className="h-4 w-4 md:h-5 md:w-5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className={`rounded-full h-8 w-8 border ${isDevsFolk && device === 'mobile' ? 'h-7 w-7' : 'h-10 w-10 border-2'}`}
                        onClick={() => {
                          const el = document.getElementById('cat-slider');
                          if (el) el.scrollBy({ left: 300, behavior: 'smooth' });
                        }}
                      >
                         <ChevronRight className="h-4 w-4 md:h-5 md:w-5" />
                      </Button>
                   </div>
                </div>
                
                <div 
                  id="cat-slider"
                  className={`flex ${isDevsFolk && device === 'mobile' ? 'gap-2' : 'gap-4'} overflow-x-auto no-scrollbar pb-2 -mx-4 px-4 snap-x`}
                >
                   {categories.sort((a, b) => (a.order || 0) - (b.order || 0)).map(cat => (
                     <Link 
                      key={cat.id} 
                      to={`/category/${cat.slug}`}
                      className={`flex-shrink-0 snap-start group ${isDevsFolk && devsfolkInitialCountValue === 'all' ? (device === 'mobile' ? 'w-[100px]' : 'w-[140px] md:w-[220px]') : ''}`}
                      style={isDevsFolk && devsfolkInitialCountValue !== 'all' ? { width: activeItemWidth } : {}}
                     >
                        <div className={`${catRatioClass} ${isDevsFolk && device === 'mobile' ? 'rounded-2xl' : 'rounded-[2rem]'} overflow-hidden bg-gray-50 mb-2 border-2 border-transparent group-hover:border-black transition-all`}>
                           <img src={cat.imageUrl} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        </div>
                        <h4 className={`text-center font-bold uppercase tracking-wide ${isDevsFolk && device === 'mobile' ? 'text-[9px]' : 'text-sm md:text-md'}`}>{cat.name}</h4>
                     </Link>
                   ))}
                </div>
             </div>
          </motion.section>
        );

      case 'SALE_BANNER':
        return (
          <motion.section 
            key={section.id} 
            id="sale-banner"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className={`${isDevsFolk && device === 'mobile' ? 'py-2' : 'py-6'} overflow-hidden`}
          >
            <div className="container mx-auto px-4">
              <Link to="/sales" className="block">
                <div className={`relative rounded-[2rem] overflow-hidden ${isDevsFolk && device === 'mobile' ? 'h-24' : 'h-32 md:h-48'} group cursor-pointer`}>
                  <img 
                    src={mainImage || "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&q=80&w=2000"} 
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
                  />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center text-white backdrop-blur-[0.5px]">
                    <div className="text-center px-4">
                      <h2 className={`${isDevsFolk && device === 'mobile' ? 'text-lg' : 'text-2xl md:text-5xl'} font-black uppercase italic tracking-tighter`} style={{ fontFamily: settings.fontDisplay }}>{section.title}</h2>
                      {section.subtitle && <p className="text-[10px] md:text-sm font-bold opacity-90">{section.subtitle}</p>}
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          </motion.section>
        );

      case 'HERO':
        if (deviceConfig.heroStyle === 'hidden') return null;
        return (
          <section
            key={section.id}
            id="hero"
            className={`relative flex overflow-hidden w-full ${heroContentPositionClass} ${isDevsFolk && device === 'mobile' ? 'min-h-[400px]' : height}`}
            style={heroSectionStyle}
          >
            {showHeroImage && (
              <div className="absolute inset-0 z-0">
                {gallery.length > 1 ? (
                  <div className="w-full h-full relative">
                    <AnimatePresence mode="wait">
                      <motion.img 
                        key={currentSlide}
                        src={currentSlide || ''} 
                        initial={heroTransitionVariants.initial}
                        animate={heroTransitionVariants.animate}
                        exit={heroTransitionVariants.exit}
                        transition={{ duration: heroTransitionDuration, ease: 'easeOut' }}
                        className="w-full h-full object-cover"
                      />
                    </AnimatePresence>
                  </div>
                ) : (
                  <img 
                    src={mainImage || settings.heroBannerUrl || ''} 
                    alt="Hero"
                    className="w-full h-full object-cover"
                  />
                )}
                {showHeroOverlay && (
                  <div
                    className="absolute inset-0 z-10"
                    style={{ backgroundImage: buildOverlayBackground(overlayColor, overlayOpacity) }}
                  />
                )}
              </div>
            )}
            
            <div className={`container mx-auto ${isDevsFolk && device === 'mobile' ? 'px-4' : 'px-6'} relative z-20 w-full`}>
              <motion.div 
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className={`${heroContentWidthClass} ${textAlign === 'center' ? 'mx-auto text-center' : textAlign === 'right' ? 'ml-auto text-right' : ''}`}
              >
                <h1 
                  className={`${heroHeadingClass} tracking-tighter mb-4 md:mb-6 leading-[1.05] uppercase ${config.headingColor ? '' : heroDefaultTextClass}`} 
                  style={{ fontFamily: settings.fontDisplay, color: config.headingColor || undefined }}
                >
                  {section.title}
                </h1>
                <p className={`${heroSubtitleClass} mb-6 md:mb-10 opacity-90 max-w-xl ${config.subtitleColor ? '' : heroDefaultTextClass} ${textAlign === 'center' ? 'mx-auto' : textAlign === 'right' ? 'ml-auto' : ''}`} style={{ color: config.subtitleColor || undefined }}>
                  {section.subtitle || settings.shopDescription}
                </p>
                <div className={`flex flex-wrap gap-4 ${buttonAlignment === 'center' ? 'justify-center' : buttonAlignment === 'right' ? 'justify-end' : 'justify-start'}`}>
                  {isExternalButtonLink || isAnchorButtonLink ? (
                    <a href={buttonLink} target={isExternalButtonLink ? '_blank' : undefined} rel={isExternalButtonLink ? 'noreferrer' : undefined}>
                      <Button 
                        variant={buttonVariant}
                        size="default"
                        className={`${buttonSizeClass} ${heroButtonRadiusClass} font-black uppercase tracking-widest shadow-xl hover:scale-105 transition-transform ${
                          buttonVariant === 'filled'
                            ? ''
                            : buttonVariant === 'outline'
                              ? deviceConfig.heroStyle === 'banner'
                                ? 'text-white border-white/30 hover:bg-white/10'
                                : 'text-black border-black/20 hover:bg-black/5'
                              : deviceConfig.heroStyle === 'banner'
                                ? 'text-white bg-transparent border-transparent shadow-none hover:bg-white/10'
                                : 'text-black bg-transparent border-transparent shadow-none hover:bg-black/5'
                        }`}
                        style={{
                          ...(buttonVariant === 'filled'
                            ? {
                                backgroundColor: settings.primaryColor,
                                borderColor: 'var(--primary-border)',
                              }
                            : {}),
                          color: buttonTextColor || undefined,
                        }}
                      >
                        {config.buttonText || "Shop Collection"} <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
                      </Button>
                    </a>
                  ) : (
                    <Link to={buttonLink}>
                      <Button 
                        variant={buttonVariant}
                        size="default"
                        className={`${buttonSizeClass} ${heroButtonRadiusClass} font-black uppercase tracking-widest shadow-xl hover:scale-105 transition-transform ${
                          buttonVariant === 'filled'
                            ? ''
                            : buttonVariant === 'outline'
                              ? deviceConfig.heroStyle === 'banner'
                                ? 'text-white border-white/30 hover:bg-white/10'
                                : 'text-black border-black/20 hover:bg-black/5'
                              : deviceConfig.heroStyle === 'banner'
                                ? 'text-white bg-transparent border-transparent shadow-none hover:bg-white/10'
                                : 'text-black bg-transparent border-transparent shadow-none hover:bg-black/5'
                        }`}
                        style={{
                          ...(buttonVariant === 'filled'
                            ? {
                                backgroundColor: settings.primaryColor,
                                borderColor: 'var(--primary-border)',
                              }
                            : {}),
                          color: buttonTextColor || undefined,
                        }}
                      >
                        {config.buttonText || "Shop Collection"} <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
                      </Button>
                    </Link>
                  )}
                </div>
              </motion.div>
            </div>
          </section>
        );

      case 'CATEGORIES':
        if (!deviceConfig.showCategories) return null;
        const categoryLinkClass = isDevsFolk 
          ? `group relative block w-full ${catRatioClass} ${device === 'mobile' ? 'rounded-2xl' : 'rounded-[2rem]'} overflow-hidden shadow-lg transition-all hover:shadow-2xl`
          : `group relative block ${device === 'mobile' ? 'h-48 rounded-2xl' : 'h-72 md:h-[450px] rounded-[2rem]'} overflow-hidden shadow-lg transition-all hover:shadow-2xl`;

        return (
          <section key={section.id} id="categories" className={`${isDevsFolk && device === 'mobile' ? 'py-6 px-2' : 'py-24'} bg-gray-50`} style={devsfolkBgStyle}>
            <div className="container mx-auto px-4 md:px-6">
              <div className={`text-center ${isDevsFolk && device === 'mobile' ? 'mb-6' : 'mb-16'}`}>
                <h2 className={`${isDevsFolk && device === 'mobile' ? 'text-lg' : 'text-4xl'} font-black uppercase tracking-tight mb-2`} style={{ fontFamily: settings.fontDisplay }}>{section.title}</h2>
                {section.subtitle && <p className={`${isDevsFolk && device === 'mobile' ? 'text-[10px]' : 'text-gray-500'} max-w-2xl mx-auto uppercase font-bold tracking-widest opacity-60`}>{section.subtitle}</p>}
              </div>
              <div className={`grid gap-4 md:gap-6 ${device === 'mobile' ? 'grid-cols-2' : device === 'tablet' ? 'grid-cols-3' : 'grid-cols-3'}`}>
                {categories.map((cat, idx) => (
                  <motion.div
                    key={cat.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <Link 
                      to={`/category/${cat.slug}`}
                      className={categoryLinkClass}
                    >
                      <img src={cat.imageUrl} loading="lazy" alt={cat.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />
                      <div className={`absolute ${isDevsFolk && device === 'mobile' ? 'bottom-3 left-3' : 'bottom-6 left-6 md:bottom-10 md:left-10'} text-white`}>
                        <h3 className={`${isDevsFolk && device === 'mobile' ? 'text-sm mb-0' : 'text-2xl md:text-3xl font-bold mb-2'}`}>{cat.name}</h3>
                        <div className={`flex items-center ${isDevsFolk && device === 'mobile' ? 'text-[8px]' : 'text-sm font-medium'} font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity`}>
                          Explore <ArrowRight className="ml-2 h-3 w-3 md:h-4 md:w-4" />
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        );

      case 'FEATURED_PRODUCTS':
        if (!deviceConfig.showFeatured) return null;
        return (
          <section key={section.id} id="products" className={`${isDevsFolk && device === 'mobile' ? 'py-4' : 'py-24'} bg-white`} style={devsfolkBgStyle}>
            <div className="container mx-auto px-6">
              <div className={`flex ${isDevsFolk && device === 'mobile' ? 'justify-start' : 'flex-col md:flex-row justify-between items-end'} gap-6 ${isDevsFolk && device === 'mobile' ? 'mb-4' : 'mb-16'}`}>
                {!isDevsFolk && (
                  <div>
                    <h2 className="text-4xl font-bold mb-2" style={{ fontFamily: settings.fontDisplay }}>{section.title}</h2>
                    {section.subtitle && <p className="text-gray-500">{section.subtitle}</p>}
                  </div>
                )}
                <Link to="/categories">
                  <Button variant="link" className={`group ${isDevsFolk && device === 'mobile' ? 'text-xs p-0 h-auto font-black uppercase tracking-widest' : 'text-lg'}`}>View All Products <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5 transition-transform group-hover:translate-x-1" /></Button>
                </Link>
              </div>
              <div className={`grid gap-4 md:gap-10`} style={{ gridTemplateColumns: device === 'mobile' ? `repeat(${deviceConfig.productGridCols}, minmax(0, 1fr))` : (deviceConfig.productCardStyle === 'list' ? '1fr' : `repeat(${deviceConfig.productGridCols}, minmax(0, 1fr))`) }}>
                {homepageProducts.map((product, idx) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: Math.min(idx * 0.05, 0.5) }}
                  >
                    <div className="group h-full relative">
                      <Link to={`/product/${product.slug}`} className={`block h-full ${deviceConfig.productCardStyle === 'list' ? 'flex gap-6 p-6 border-2 rounded-[2rem] bg-white hover:border-black transition-colors' : ''}`}>
                        <div className={`relative overflow-hidden bg-gray-100 ${deviceConfig.productCardStyle === 'list' ? 'w-32 h-32 md:w-48 md:h-48 rounded-2xl flex-shrink-0' : 'aspect-[4/5] rounded-[2rem] mb-4 md:mb-6'}`}>
                          <img src={product.images[0]} loading="lazy" alt={product.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                          {product.discountPrice && (
                            <div className="absolute top-4 left-4 bg-black text-white text-[10px] font-bold px-3 py-1.5 rounded-full z-10">
                              -{Math.round((1 - product.discountPrice / product.price) * 100)}%
                            </div>
                          )}
                        </div>
                        <div className={deviceConfig.productCardStyle === 'list' ? 'flex flex-col justify-center' : ''}>
                          <h3 className="font-black text-sm md:text-xl mb-1 md:mb-2 uppercase tracking-tight group-hover:underline underline-offset-4">{product.name}</h3>
                          <div className="flex items-center gap-3">
                            <span className="font-black text-lg md:text-xl">
                              {settings.currencySymbol}{product.discountPrice || product.price}
                            </span>
                            {product.discountPrice && (
                              <span className="text-[10px] md:text-sm text-gray-400 font-bold line-through">
                                {settings.currencySymbol}{product.price}
                              </span>
                            )}
                          </div>
                          {deviceConfig.productCardStyle === 'list' && (
                            <p className="text-gray-500 line-clamp-2 mt-3 leading-relaxed text-sm">
                              {product.description}
                            </p>
                          )}
                        </div>
                      </Link>
                      
                      {/* Direct Add to Cart Button */}
                      <div className={`absolute ${deviceConfig.productCardStyle === 'list' ? 'bottom-6 right-6' : 'bottom-20 md:bottom-24 right-4'} z-20`}>
                        <Button 
                          size="icon" 
                          className="h-10 w-10 md:h-12 md:w-12 rounded-full shadow-2xl hover:scale-110 transition-transform"
                          style={{
                            backgroundColor: settings.primaryColor,
                            color: 'var(--primary-foreground)',
                            borderColor: 'var(--primary-border)',
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            addToCart(product, undefined, 1);
                          }}
                        >
                          <ShoppingBag className="h-4 w-4 md:h-5 md:w-5" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        );

      case 'NEWSLETTER':
        if (!deviceConfig.showNewsletter) return null;
        return (
          <section key={section.id} id="newsletter" className={`${isDevsFolk && device === 'mobile' ? 'py-4' : 'py-24'}`}>
            <div className="container mx-auto px-6">
              <div className={`bg-gray-100 ${isDevsFolk && device === 'mobile' ? 'rounded-2xl p-6' : 'rounded-[3.5rem] p-12 md:p-24'} text-center relative overflow-hidden`}>
                <div className="relative z-10 max-w-3xl mx-auto">
                  <div className={`${isDevsFolk && device === 'mobile' ? 'w-10 h-10 mb-4' : 'w-20 h-20 mb-10'} bg-white rounded-2xl flex items-center justify-center mx-auto shadow-xl`}>
                    <Mail className={`${isDevsFolk && device === 'mobile' ? 'h-5 w-5' : 'h-10 w-10'} text-black`} />
                  </div>
                  <h2 className={`${isDevsFolk && device === 'mobile' ? 'text-lg mb-2' : 'text-4xl md:text-5xl mb-6'} font-bold`} style={{ fontFamily: settings.fontDisplay }}>{section.title}</h2>
                  <p className={`${isDevsFolk && device === 'mobile' ? 'text-[10px] mb-6' : 'text-xl text-gray-500 mb-12'} leading-relaxed`}>
                    {section.subtitle || "Subscribe to receive updates, access to exclusive deals, and more."}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto">
                    <Input placeholder="Enter email..." className={`${isDevsFolk && device === 'mobile' ? 'h-10 rounded-xl' : 'h-16 rounded-full'} px-4 md:px-8 text-sm md:text-lg border-none bg-white shadow-sm`} />
                    <Button
                      size="lg"
                      className={`${isDevsFolk && device === 'mobile' ? 'h-10 rounded-xl px-6' : 'h-16 rounded-full px-10'} text-sm md:text-lg font-bold shadow-lg`}
                      style={{
                        backgroundColor: settings.primaryColor,
                        color: 'var(--primary-foreground)',
                        borderColor: 'var(--primary-border)',
                      }}
                    >
                      Join
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        );

      case 'ABOUT':
        return (
          <section key={section.id} id="about" className={`${isDevsFolk && device === 'mobile' ? 'py-4' : 'py-24'}`} style={devsfolkBgStyle}>
            <div className="container mx-auto px-6">
              <div className={`grid grid-cols-1 md:grid-cols-2 ${isDevsFolk && device === 'mobile' ? 'gap-6' : 'gap-16'} items-center`}>
                <div className={`${isDevsFolk && device === 'mobile' ? 'space-y-4' : 'space-y-8'}`}>
                  <h2 className={`${isDevsFolk && device === 'mobile' ? 'text-lg' : 'text-4xl md:text-6xl'} font-bold leading-tight`} style={{ fontFamily: settings.fontDisplay }}>{section.title}</h2>
                  <p className={`${isDevsFolk && device === 'mobile' ? 'text-xs' : 'text-xl text-gray-600'} leading-relaxed`}>
                    {section.subtitle || "We curate the finest collection of premium essentials designed to complement your modern lifestyle."}
                  </p>
                  {!isDevsFolk || device !== 'mobile' ? (
                    <div className="grid grid-cols-2 gap-10 pt-4">
                      <div>
                        <h4 className="text-4xl font-black mb-1">15k+</h4>
                        <p className="text-gray-400 font-medium">Curated Items Sold</p>
                      </div>
                      <div>
                        <h4 className="text-4xl font-black mb-1">99%</h4>
                        <p className="text-gray-400 font-medium">Client Satisfaction</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-6">
                       <div>
                        <h4 className="text-xl font-black mb-0">15k+</h4>
                        <p className="text-[10px] text-gray-400">Sold</p>
                      </div>
                      <div>
                        <h4 className="text-xl font-black mb-0">99%</h4>
                        <p className="text-[10px] text-gray-400">Happy</p>
                      </div>
                    </div>
                  )}
                </div>
                <div className={`relative ${isDevsFolk && device === 'mobile' ? 'h-48 rounded-2xl' : 'h-[450px] md:h-[650px] rounded-[3rem]'} overflow-hidden shadow-2xl`}>
                  <img 
                    src={config.imageUrl || "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?auto=format&fit=crop&q=80&w=1000"} 
                    className="w-full h-full object-cover" 
                    alt="Store"
                  />
                </div>
              </div>
            </div>
          </section>
        );

      case 'HTML_CONTENT':
        return (
          <section key={section.id} className="py-12">
            <div className="container mx-auto px-6" dangerouslySetInnerHTML={{ __html: config.html || '' }} />
          </section>
        );

      case 'CUSTOMIZER':
        return (
          <motion.section 
            key={section.id}
            id="customizer"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className={`${isDevsFolk && device === 'mobile' ? 'py-6' : 'py-16'} bg-white`}
            style={devsfolkBgStyle}
          >
            <div className="container mx-auto px-4 md:px-6">
              <div className="text-center mb-8 md:mb-12">
                <h2 className={`${isDevsFolk && device === 'mobile' ? 'text-lg' : 'text-4xl'} font-black uppercase tracking-tight mb-2`} style={{ fontFamily: settings.fontDisplay }}>{section.title || "Bespoke Designer"}</h2>
                {section.subtitle && <p className={`${isDevsFolk && device === 'mobile' ? 'text-[10px]' : 'text-gray-500'} max-w-2xl mx-auto uppercase font-bold tracking-widest opacity-60`}>{section.subtitle}</p>}
              </div>
              <BespokeCustomizer showHeader={false} />
            </div>
          </motion.section>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center py-20 bg-white">
        <div className="relative w-10 h-10 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-slate-100" />
          <div className="absolute inset-0 rounded-full border-t border-indigo-600 animate-spin" />
        </div>
        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 mt-4 animate-pulse">
          loading...
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {settings.sections.sort((a, b) => a.order - b.order).map(renderSection)}
      {settings.printifySettings?.enabled && !settings.sections.some((section) => section.type === 'CUSTOMIZER') && products.some((product) => product.isPrintify) && (
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-8 md:mb-12">
              <h2 className="text-4xl font-black uppercase tracking-tight mb-2" style={{ fontFamily: settings.fontDisplay }}>Design Your Own</h2>
              <p className="text-gray-500 max-w-2xl mx-auto uppercase font-bold tracking-widest opacity-60">Choose a custom product and personalize it in our live editor.</p>
            </div>
            <BespokeCustomizer showHeader={false} />
          </div>
        </section>
      )}
      
      {settings.trustFeatures.some((feature) => feature.enabled) && (
        <section className="py-12 bg-gray-50 border-y">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {settings.trustFeatures.filter((feature) => feature.enabled).map((feature) => {
                const Icon = featureIconMap[feature.icon] || ShieldCheck;
                return (
                  <div key={feature.id} className="flex flex-col items-center text-center">
                    <Icon className="h-6 w-6 mb-2 opacity-50" />
                    <h3 className="text-xs font-bold uppercase tracking-wider">{feature.title}</h3>
                    {feature.subtitle && <p className="text-[10px] text-gray-500 mt-1">{feature.subtitle}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
