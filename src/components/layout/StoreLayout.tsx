import React from 'react';
import { Link } from 'react-router-dom';
import { useShop } from '../../context/ShopContext';
import { ShoppingCart, Menu, Search, Store, Heart, Globe, Instagram, Facebook, Youtube, Twitter, Linkedin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';

export const StoreLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settings, cart, products, wishlist } = useShop();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [device, setDevice] = React.useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [searchQuery, setSearchQuery] = React.useState('');

  const searchResults = React.useMemo(() => {
    if (!searchQuery.trim()) return [];
    return products.filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.description.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 5);
  }, [searchQuery, products]);

  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) setDevice('mobile');
      else if (window.innerWidth < 1024) setDevice('tablet');
      else setDevice('desktop');
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const deviceConfig = settings[device];
  const isDevsFolk = settings.activeTemplate === 'devsfolk';
  const activeSocialLinks = settings.socialLinks.filter((link) => link.enabled && link.url.trim());

  const getSocialIcon = (platform: string) => {
    switch (platform.trim().toLowerCase()) {
      case 'instagram':
        return Instagram;
      case 'facebook':
        return Facebook;
      case 'youtube':
        return Youtube;
      case 'twitter':
      case 'x':
        return Twitter;
      case 'linkedin':
        return Linkedin;
      default:
        return Globe;
    }
  };

  const renderHeader = () => {
    const isCentered = deviceConfig.headerStyle === 'centered';
    const isMinimal = deviceConfig.headerStyle === 'minimal';

    let headerClasses = `z-50 w-full border-b transition-all duration-300 ${deviceConfig.isHeaderSticky ? 'sticky top-0 shadow-sm' : 'relative'} `;

    if (deviceConfig.headerTheme === 'dark') {
      headerClasses += 'bg-black text-white border-white/10';
    } else if (deviceConfig.headerTheme === 'glass') {
      headerClasses += 'bg-white/70 backdrop-blur-xl text-black border-black/5';
    } else {
      headerClasses += 'bg-white text-black border-black/10';
    }

    const Logo = () => (
      <Link to="/" className="flex items-center gap-2 group shrink-0">
        {settings.logoUrl ? (
          <img src={settings.logoUrl} alt={settings.shopName} className="h-8 md:h-10 w-auto object-contain transition-transform group-hover:scale-105" />
        ) : (
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center font-black group-hover:scale-110 transition-transform ${deviceConfig.headerTheme === 'dark' ? 'bg-white text-black' : 'bg-black text-white'}`}>
              {settings.shopName.charAt(0)}
            </div>
            {!isDevsFolk && (
              <span className="text-lg md:text-2xl font-black tracking-tighter" style={{ fontFamily: settings.fontDisplay }}>
                {settings.shopName}
              </span>
            )}
          </div>
        )}
      </Link>
    );

    return (
      <header className={headerClasses}>
        <div className="container mx-auto px-4 md:px-6 h-16 md:h-20 flex items-center justify-between gap-2 md:gap-4">
          <div className={`flex items-center gap-2 md:gap-4 ${isDevsFolk ? 'w-auto md:w-1/4' : ''}`}>
            {(isDevsFolk || isMinimal || device === 'mobile') && (
              <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                <SheetTrigger
                  render={
                    <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 md:h-10 md:w-10">
                      <Menu className="h-5 w-5 md:h-6 md:w-6" />
                    </Button>
                  }
                />
                <SheetContent side="left" className="w-[85vw] max-w-[400px] p-0 border-r-0">
                  <div className="flex flex-col h-full bg-white">
                    <div className="p-8 border-b">
                      <Logo />
                    </div>
                    <nav className="flex-1 overflow-y-auto py-8">
                      <div className="px-8 space-y-6">
                        <Link to="/" onClick={() => setIsMenuOpen(false)} className="block text-2xl font-bold">Home</Link>
                        <Link to="/categories" onClick={() => setIsMenuOpen(false)} className="block text-2xl font-bold">Collections</Link>
                        <Link to="/sales" onClick={() => setIsMenuOpen(false)} className="block text-2xl font-bold text-red-500">Flash Sale</Link>
                        <Link to="/about" onClick={() => setIsMenuOpen(false)} className="block text-2xl font-bold">Our Story</Link>
                      </div>
                    </nav>
                  </div>
                </SheetContent>
              </Sheet>
            )}

            {!isCentered && (
              <div className="flex items-center gap-2">
                <Logo />
                {isDevsFolk && (
                  <span className="text-sm font-black tracking-tighter md:text-xl" style={{ fontFamily: settings.fontDisplay }}>
                    {settings.shopName}
                  </span>
                )}
              </div>
            )}
          </div>

          {isDevsFolk ? (
            <div className="flex-1 max-w-[140px] xs:max-w-[180px] sm:max-w-xl mx-auto px-0 md:px-0 relative">
              <div className="relative w-full">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 md:h-4 md:w-4 text-gray-400" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-100 md:bg-gray-50 border-none rounded-2xl h-9 md:h-11 pl-8 md:pl-10 text-[11px] md:text-sm focus-visible:ring-1 focus-visible:ring-black"
                />
              </div>

              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[60] py-2 animate-in fade-in slide-in-from-top-1">
                  {searchResults.map((p) => (
                    <Link key={p.id} to={`/product/${p.slug}`} onClick={() => setSearchQuery('')} className="flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors">
                      <img src={p.images[0]} className="w-10 h-10 rounded-lg object-cover" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold uppercase truncate">{p.name}</p>
                        <p className="text-[10px] text-gray-400">{settings.currencySymbol}{p.price}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ) : isCentered ? (
            <div className="flex-1 flex justify-center">
              <Logo />
            </div>
          ) : !isMinimal && (
            <nav className="hidden md:flex items-center gap-8">
              <Link to="/" className="text-sm font-bold uppercase tracking-widest hover:opacity-50 transition-opacity">Home</Link>
              <Link to="/categories" className="text-sm font-bold uppercase tracking-widest hover:opacity-50 transition-opacity">Shop</Link>
              <Link to="/sales" className="text-sm font-bold uppercase tracking-widest hover:text-red-500 transition-colors">Sale</Link>
              <Link to="/about" className="text-sm font-bold uppercase tracking-widest hover:opacity-50 transition-opacity">Story</Link>
            </nav>
          )}

          <div className={`flex items-center gap-1 md:gap-3 ${isDevsFolk ? 'w-auto md:w-1/4 justify-end' : ''}`}>
            <Link to="/wishlist" className="relative group">
              <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 md:h-10 md:w-10">
                <Heart className={`h-5 w-5 md:h-6 md:w-6 ${wishlist.length > 0 ? 'fill-red-500 text-red-500' : ''}`} />
                {wishlist.length > 0 && (
                  <span className="absolute top-0 right-0 w-4 h-4 md:w-5 md:h-5 rounded-full text-[9px] md:text-[10px] font-bold flex items-center justify-center text-white shadow-lg bg-red-500">
                    {wishlist.length}
                  </span>
                )}
              </Button>
            </Link>
            <Link to="/cart" className="relative group">
              <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 md:h-10 md:w-10">
                <ShoppingCart className="h-5 w-5 md:h-6 md:w-6" />
                {cart.length > 0 && (
                  <span
                    className="absolute top-0 right-0 w-4 h-4 md:w-5 md:h-5 rounded-full border text-[9px] md:text-[10px] font-bold flex items-center justify-center shadow-lg"
                    style={{
                      backgroundColor: settings.primaryColor,
                      color: 'var(--primary-foreground)',
                      borderColor: 'var(--primary-border)',
                    }}
                  >
                    {cart.reduce((acc, item) => acc + item.quantity, 0)}
                  </span>
                )}
              </Button>
            </Link>
          </div>
        </div>
      </header>
    );
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: settings.backgroundColor }}>
      {renderHeader()}

      <main className="flex-1">
        {children}
      </main>

      <footer className={`border-t bg-gray-50 ${settings.activeTemplate === 'devsfolk' ? 'py-6 px-4 mb-0' : 'pt-12 pb-24 md:pb-12'}`}>
        <div className={`container mx-auto px-4 ${settings.activeTemplate === 'devsfolk' ? 'flex flex-col md:flex-row items-center justify-between gap-4' : 'grid grid-cols-1 md:grid-cols-4 gap-8'}`}>
          <div>
            <h3 className="text-lg font-bold">{settings.shopName}</h3>
            {settings.activeTemplate !== 'devsfolk' && (
              <p className="text-sm text-gray-600 max-w-xs mt-4">{settings.shopDescription}</p>
            )}
          </div>

          <div className="flex flex-wrap gap-6 text-sm text-gray-600 justify-center md:justify-start">
            <Link to="/">Home</Link>
            <Link to="/categories">Shop</Link>
            <Link to="/sales">Sale</Link>
            <Link to="/track-order">Track Order</Link>
            <Link to="/wishlist">Wishlist</Link>
          </div>

          {settings.activeTemplate !== 'devsfolk' && (
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider mb-4">Support</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li><Link to="/contact">Contact Us</Link></li>
              </ul>
            </div>
          )}

          <div className="flex flex-col items-center md:items-end gap-3">
            {activeSocialLinks.length > 0 && (
              <div className="flex items-center gap-2">
                {activeSocialLinks.map((link) => {
                  const Icon = getSocialIcon(link.platform);
                  return (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={link.platform}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 transition-colors hover:text-black"
                    >
                      <Icon className="h-4 w-4" />
                    </a>
                  );
                })}
              </div>
            )}
            <div className="text-xs text-gray-400">© {new Date().getFullYear()} {settings.shopName}.</div>
          </div>
        </div>
      </footer>

      {!isDevsFolk && (
        <div className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t flex items-center justify-around md:hidden z-40">
          <Link to="/" className="flex flex-col items-center gap-1 opacity-70">
            <Store className="h-5 w-5" />
            <span className="text-[10px]">Home</span>
          </Link>
          <Link to="/categories" className="flex flex-col items-center gap-1 opacity-70">
            <Search className="h-5 w-5" />
            <span className="text-[10px]">Explore</span>
          </Link>
          <Link to="/cart" className="flex flex-col items-center gap-1 opacity-70 relative">
            <ShoppingCart className="h-5 w-5" />
            <span className="text-[10px]">Cart</span>
            {cart.length > 0 && (
              <span
                className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full border text-[10px] font-medium translate-x-1 -translate-y-1"
                style={{
                  backgroundColor: settings.primaryColor,
                  color: 'var(--primary-foreground)',
                  borderColor: 'var(--primary-border)',
                }}
              >
                {cart.reduce((acc, item) => acc + item.quantity, 0)}
              </span>
            )}
          </Link>
        </div>
      )}
    </div>
  );
};
