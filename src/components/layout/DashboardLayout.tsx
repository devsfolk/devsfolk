import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  Layers, 
  ShoppingCart, 
  Palette, 
  Settings, 
  Menu, 
  ChevronLeft,
  LogOut,
  ExternalLink,
  MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useShop } from '@/context/ShopContext';
import { useNavigate } from 'react-router-dom';
import { PWAInstallBanner } from '@/components/pwa/PWAInstallBanner';

export const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settings, isAdmin, logout, loading } = useShop();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  React.useEffect(() => {
    if (!loading && !isAdmin && !location.pathname.includes('/dashboard/login')) {
      navigate('/dashboard/login');
    }
  }, [isAdmin, loading, navigate, location.pathname]);

  React.useEffect(() => {
    if (!location.pathname.includes('/dashboard/login')) {
      document.title = `${settings.shopName} | Dashboard`;
    }
  }, [settings.shopName, location.pathname]);

  if (loading) {
    return <div className="min-h-screen bg-gray-50" />;
  }

  if (!isAdmin && !location.pathname.includes('/dashboard/login')) {
    return null;
  }

  const navItems = [
    { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Products', href: '/dashboard/products', icon: Package },
    { name: 'Categories', href: '/dashboard/categories', icon: Layers },
    { name: 'Orders', href: '/dashboard/orders', icon: ShoppingCart },
    { name: 'Reviews', href: '/dashboard/reviews', icon: MessageSquare },
    { name: 'Design', href: '/dashboard/design', icon: Palette },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ];

  const currentNavItem = navItems.find(item => item.href === location.pathname) || navItems[0];
  const isSubPage = location.pathname !== '/dashboard';

  const NavContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-6">
        <Link to="/dashboard" className="flex items-center gap-2 font-bold text-xl">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white text-xs font-black">DF</div>
          DevsFolk Dashboard
        </Link>
      </div>
      
      <ScrollArea className="flex-1 px-4">
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setIsSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-black text-white" 
                    : "text-gray-500 hover:text-black hover:bg-gray-100"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </div>
      </ScrollArea>

      <div className="p-4 border-t space-y-2">
        <Link to="/" target="_blank" className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-500 hover:text-black transition-colors">
          <ExternalLink className="h-4 w-4" />
          Visit Store
        </Link>
        <button 
          onClick={() => void logout()}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-50 rounded-md transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col fixed inset-y-0 bg-white border-r">
        <NavContent />
      </aside>

      {/* Main Content */}
      <div className="flex-1 md:ml-64 flex flex-col">
        {/* Mobile Header */}
        <header className="md:hidden h-16 bg-white border-b flex items-center justify-between px-4 sticky top-0 z-40">
          <div className="flex items-center gap-3">
            {isSubPage ? (
              <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-xl bg-gray-50 h-9 w-9" 
                onClick={() => navigate('/dashboard')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            ) : (
              <div className="w-9 h-9 bg-black rounded-lg flex items-center justify-center text-white text-[10px] font-black">DF</div>
            )}
            <div>
              {isSubPage && (
                <h2 className="text-[8px] font-black uppercase tracking-widest text-gray-400 leading-none mb-0.5">
                  {settings.shopName}
                </h2>
              )}
              <h1 className="text-xs font-black uppercase tracking-tight leading-none">
                {currentNavItem.name}
              </h1>
            </div>
          </div>

          <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
            <SheetTrigger render={
              <Button variant="ghost" size="icon" className="rounded-xl bg-gray-50 h-9 w-9">
                <Menu className="h-4 w-4" />
              </Button>
            } />
            <SheetContent side="left" className="p-0 w-[280px] border-r-0">
              <NavContent />
            </SheetContent>
          </Sheet>
        </header>

        {/* Desktop Header (Breadcrumbs/Context) */}
        <header className="hidden md:flex h-20 bg-white border-b items-center px-10 sticky top-0 z-40">
          <div className="flex items-center gap-3">
             {isSubPage && (
               <>
                 <Link to="/dashboard" className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition-colors">Overview</Link>
                 <span className="text-gray-300">/</span>
               </>
             )}
             <span className="text-[10px] font-black uppercase tracking-widest">{currentNavItem.name}</span>
          </div>
        </header>

        <main className="p-4 sm:p-6 md:p-10">
          <div className="max-w-6xl mx-auto pb-24 md:pb-0">
            {children}
          </div>
        </main>

        <PWAInstallBanner />
      </div>
    </div>
  );
};
