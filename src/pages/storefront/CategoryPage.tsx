import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useShop } from '@/context/ShopContext';
import { ShoppingBag, ChevronRight, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const CategoryPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { products, categories, settings, addToCart } = useShop();
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
  const category = slug ? categories.find(c => c.slug === slug) : null;

  const filteredProducts = React.useMemo(() => {
    let result = slug 
      ? products.filter(p => p.categoryId === category?.id)
      : products;
    
    switch (sortBy) {
      case 'price-low':
        return [...result].sort((a, b) => (a.discountPrice || a.price) - (b.discountPrice || b.price));
      case 'price-high':
        return [...result].sort((a, b) => (b.discountPrice || b.price) - (a.discountPrice || a.price));
      default:
        return [...result].sort((a, b) => (a.order || 0) - (b.order || 0));
    }
  }, [slug, products, category, sortBy]);

  React.useEffect(() => {
    if (category) {
      document.title = `${category.name} | ${settings.shopName}`;
    } else {
      document.title = `Collections | ${settings.shopName}`;
    }
  }, [category, settings.shopName]);

  return (
    <div className={`container mx-auto px-4 ${isDevsFolk && device === 'mobile' ? 'py-4' : 'py-12'}`}>
      {/* Breadcrumbs */}
      {!isDevsFolk && (
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-8">
          <Link to="/" className="hover:text-black">Home</Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-black font-medium">{category?.name || 'All Products'}</span>
        </nav>
      )}

      <div className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${isDevsFolk && device === 'mobile' ? 'mb-4' : 'mb-12'}`}>
        <div>
          <h1 className={`${isDevsFolk && device === 'mobile' ? 'text-2xl mb-1' : 'text-4xl font-bold mb-2'}`} style={{ fontFamily: settings.fontDisplay }}>
            {category?.name || 'Shop All'}
          </h1>
          <p className={`${isDevsFolk && device === 'mobile' ? 'text-[10px]' : 'text-gray-500'}`}>
            {category?.description || 'Discover our complete collection'}
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
        {filteredProducts.map((product) => (
          <div key={product.id} className="group relative">
            <Link to={`/product/${product.slug}`} className="block">
              <div className={`relative aspect-[4/5] overflow-hidden bg-gray-100 ${isDevsFolk && device === 'mobile' ? 'rounded-2xl mb-2' : 'rounded-2xl mb-4'}`}>
                <img 
                  src={product.images[0]} 
                  alt={product.name} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                />
                {product.discountPrice && (
                  <div className="absolute top-2 left-2 md:top-4 md:left-4 bg-black text-white text-[8px] md:text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full z-10">
                    SALE
                  </div>
                )}
              </div>
              <h3 className={`${isDevsFolk && device === 'mobile' ? 'text-[10px] leading-tight font-black' : 'font-black text-sm md:text-lg'} mb-0.5 md:mb-1 group-hover:underline underline-offset-4 uppercase tracking-tight`}>{product.name}</h3>
              <div className="flex items-center gap-2">
                <span className={`${isDevsFolk && device === 'mobile' ? 'text-[10px]' : 'font-black text-sm md:text-base'} font-black`}>
                  {settings.currencySymbol}{product.discountPrice || product.price}
                </span>
                {product.discountPrice && (
                  <span className="text-[8px] md:text-xs text-gray-400 font-bold line-through">
                    {settings.currencySymbol}{product.price}
                  </span>
                )}
              </div>
            </Link>

            {/* Direct Add to Cart Button */}
            <div className={`absolute ${isDevsFolk && device === 'mobile' ? 'bottom-8 right-2' : 'bottom-12 md:bottom-16 right-4'} z-20`}>
              <Button 
                size="icon" 
                className={`${isDevsFolk && device === 'mobile' ? 'h-8 w-8' : 'h-10 w-10 md:h-12 md:w-12'} rounded-full shadow-2xl hover:scale-110 transition-transform`}
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
                <ShoppingBag className={`${isDevsFolk && device === 'mobile' ? 'h-3 w-3' : 'h-4 w-4 md:h-5 md:w-5'}`} />
              </Button>
            </div>
          </div>
        ))}
        {filteredProducts.length === 0 && (
          <div className="col-span-full py-20 text-center">
            <p className="text-gray-400 italic">No products found in this category.</p>
          </div>
        )}
      </div>
    </div>
  );
};
