import React from 'react';
import { Link } from 'react-router-dom';
import { useShop } from '@/context/ShopContext';
import { ChevronRight } from 'lucide-react';

export const SalesPage: React.FC = () => {
  const { products, settings } = useShop();
  const [device, setDevice] = React.useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const isDevsFolk = settings.activeTemplate === 'devsfolk';

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

  const [sortBy, setSortBy] = React.useState('newest');

  const filteredProducts = React.useMemo(() => {
    const saleItems = products.filter(p => p.discountPrice && p.discountPrice < p.price);
    
    switch (sortBy) {
      case 'price-low':
        return [...saleItems].sort((a, b) => (a.discountPrice || a.price) - (b.discountPrice || b.price));
      case 'price-high':
        return [...saleItems].sort((a, b) => (b.discountPrice || b.price) - (a.discountPrice || a.price));
      default:
        return [...saleItems].sort((a, b) => (a.order || 0) - (b.order || 0));
    }
  }, [products, sortBy]);

  return (
    <div className={`container mx-auto px-4 ${isDevsFolk && device === 'mobile' ? 'py-4' : 'py-12'}`}>
      {/* Breadcrumbs */}
      {!isDevsFolk && (
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-8">
          <Link to="/" className="hover:text-black">Home</Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-black font-medium">Flash Sale</span>
        </nav>
      )}

      <div className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${isDevsFolk && device === 'mobile' ? 'mb-4' : 'mb-12'}`}>
        <div>
          <h1 className={`${isDevsFolk && device === 'mobile' ? 'text-2xl mb-1' : 'text-4xl font-bold mb-2'}`} style={{ fontFamily: settings.fontDisplay }}>
            Flash Sale
          </h1>
          <p className={`${isDevsFolk && device === 'mobile' ? 'text-[10px]' : 'text-gray-500'}`}>
            Don't miss out on our best deals and exclusive offers.
          </p>
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto">
          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-white border rounded-xl px-4 py-2 text-xs md:text-sm font-bold uppercase tracking-widest focus:outline-none w-full md:w-auto shadow-sm"
          >
            <option value="newest">Sort by: Default</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
          </select>
        </div>
      </div>

      <div 
        className={`grid gap-4 md:gap-8`}
        style={{ 
          gridTemplateColumns: device === 'mobile' ? `repeat(${settings.mobile.productGridCols}, minmax(0, 1fr))` : (settings.desktop.productCardStyle === 'list' ? '1fr' : `repeat(${settings.desktop.productGridCols}, minmax(0, 1fr))`) 
        }}
      >
        {filteredProducts.sort((a, b) => (a.order || 0) - (b.order || 0)).map((product) => (
          <Link to={`/product/${product.slug}`} key={product.id} className="group">
            <div className={`relative aspect-square overflow-hidden bg-gray-100 ${isDevsFolk && device === 'mobile' ? 'rounded-2xl mb-2' : 'rounded-2xl mb-4'}`}>
              <img 
                src={product.images[0]} 
                alt={product.name} 
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
              />
              <div className="absolute top-2 left-2 md:top-4 md:left-4 bg-black text-white text-[8px] md:text-[10px] font-bold px-1.5 md:px-2 py-0.5 md:py-1 rounded">
                -{Math.round((1 - product.discountPrice! / product.price) * 100)}%
              </div>
            </div>
            <h3 className={`${isDevsFolk && device === 'mobile' ? 'text-[10px]' : 'font-medium text-sm md:text-base'} mb-0.5 md:mb-1 group-hover:underline underline-offset-4 uppercase tracking-tight`}>{product.name}</h3>
            <div className="flex items-center gap-2">
              <span className={`${isDevsFolk && device === 'mobile' ? 'text-[10px]' : 'font-bold text-sm'} italic font-black`}>
                {settings.currencySymbol}{product.discountPrice}
              </span>
              <span className="text-[8px] md:text-xs text-gray-400 line-through">
                {settings.currencySymbol}{product.price}
              </span>
            </div>
          </Link>
        ))}
        {filteredProducts.length === 0 && (
          <div className="col-span-full py-20 text-center">
            <p className="text-gray-400 italic">No products currently on sale.</p>
          </div>
        )}
      </div>
    </div>
  );
};
