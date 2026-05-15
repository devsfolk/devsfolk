import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useShop } from '@/context/ShopContext';
import { StoreSection } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, ShoppingBag, Zap, ShieldCheck, Truck, Mail, ChevronLeft, ChevronRight, MessageCircle, RotateCcw, CreditCard, Gift, BadgeCheck } from 'lucide-react';

export const Home: React.FC = () => {
  const { settings, products, categories, addToCart } = useShop();
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const homepageProducts = React.useMemo(() => {
    const orderedProducts = [...products].sort((a, b) => (a.order || 0) - (b.order || 0));
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
    const timer = setInterval(() => {
      setActiveSlideIndex(prev => (prev + 1) % 10); // Cycle up to 10 images
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  React.useEffect(() => {
    document.title = `${settings.shopName} | ${settings.shopDescription}`;
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

    const gallery = config.gallery || [];
    const currentSlide = gallery.length > 0 ? gallery[activeSlideIndex % gallery.length] : null;
    const mainImage = config.imageUrl || currentSlide || (gallery.length > 0 ? gallery[0] : null);

    switch (section.type) {
      case 'CATEGORY_SLIDER':
        return (
          <motion.section 
            key={section.id} 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className={`${isDevsFolk && device === 'mobile' ? 'py-4' : 'py-12'} bg-white relative group overflow-hidden`}
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
                      className={`flex-shrink-0 ${isDevsFolk && device === 'mobile' ? 'w-[100px]' : 'w-[140px] md:w-[220px]'} snap-start group`}
                     >
                        <div className={`aspect-square ${isDevsFolk && device === 'mobile' ? 'rounded-2xl' : 'rounded-[2rem]'} overflow-hidden bg-gray-50 mb-2 border-2 border-transparent group-hover:border-black transition-all`}>
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
          <section key={section.id} className={`relative flex items-center overflow-hidden w-full ${isDevsFolk && device === 'mobile' ? 'min-h-[400px]' : height} ${deviceConfig.heroStyle === 'banner' ? 'bg-black' : 'bg-gray-50'}`}>
            {deviceConfig.heroStyle === 'banner' && (
              <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent z-10" />
                {gallery.length > 1 ? (
                  <div className="w-full h-full relative">
                    <AnimatePresence mode="wait">
                      <motion.img 
                        key={currentSlide}
                        src={currentSlide || ''} 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1 }}
                        className="w-full h-full object-cover"
                      />
                    </AnimatePresence>
                  </div>
                ) : (
                  <img 
                    src={mainImage || settings.heroBannerUrl || "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=2000"} 
                    alt="Hero"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            )}
            
            <div className={`container mx-auto ${isDevsFolk && device === 'mobile' ? 'px-4' : 'px-6'} relative z-20`}>
              <motion.div 
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className={`max-w-3xl ${deviceConfig.heroStyle === 'banner' ? 'text-white' : 'text-black'} ${textAlign === 'center' ? 'mx-auto text-center' : textAlign === 'right' ? 'ml-auto text-right' : ''}`}
              >
                <h1 
                  className={`${device === 'mobile' ? (isDevsFolk ? 'text-4xl' : 'text-5xl') : 'text-7xl'} font-black tracking-tighter mb-4 md:mb-6 leading-[1.05] uppercase`} 
                  style={{ fontFamily: settings.fontDisplay }}
                >
                  {section.title}
                </h1>
                <p className={`${device === 'mobile' ? 'text-xs mb-6' : 'text-lg mb-10'} opacity-90 max-w-xl ${textAlign === 'center' ? 'mx-auto' : textAlign === 'right' ? 'ml-auto' : ''}`}>
                  {section.subtitle || settings.shopDescription}
                </p>
                <div className={`flex flex-wrap gap-4 ${textAlign === 'center' ? 'justify-center' : textAlign === 'right' ? 'justify-end' : ''}`}>
                  <Button 
                    size={device === 'mobile' ? 'sm' : 'lg'} 
                    className={`${device === 'mobile' ? 'h-10 px-6 text-[10px]' : 'h-14 px-10 text-lg'} rounded-full font-black uppercase tracking-widest shadow-xl hover:scale-105 transition-transform`}
                    style={{
                      backgroundColor: settings.primaryColor,
                      color: 'var(--primary-foreground)',
                      borderColor: 'var(--primary-border)',
                    }}
                  >
                    {config.buttonText || "Shop Collection"} <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
                  </Button>
                </div>
              </motion.div>
            </div>
          </section>
        );

      case 'CATEGORIES':
        if (!deviceConfig.showCategories) return null;
        return (
          <section key={section.id} className={`${isDevsFolk && device === 'mobile' ? 'py-6 px-2' : 'py-24'} bg-gray-50`}>
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
                      className={`group relative block ${isDevsFolk && device === 'mobile' ? 'h-48 rounded-2xl' : 'h-72 md:h-[450px] rounded-[2rem]'} overflow-hidden shadow-lg transition-all hover:shadow-2xl`}
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
          <section key={section.id} className={`${isDevsFolk && device === 'mobile' ? 'py-4' : 'py-24'} bg-white`}>
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
          <section key={section.id} className={`${isDevsFolk && device === 'mobile' ? 'py-4' : 'py-24'}`}>
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
          <section key={section.id} className={`${isDevsFolk && device === 'mobile' ? 'py-4' : 'py-24'} bg-white`}>
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

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col">
      {settings.sections.sort((a, b) => a.order - b.order).map(renderSection)}
      
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
