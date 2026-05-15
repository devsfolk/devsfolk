import React from 'react';
import { useShop } from '@/context/ShopContext';
import { Link } from 'react-router-dom';
import { Heart, ShoppingBag, Trash2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'motion/react';

export const WishlistPage: React.FC = () => {
  const { wishlist, products, toggleWishlist, settings, addToCart } = useShop();

  React.useEffect(() => {
    document.title = `Your Wishlist | ${settings.shopName}`;
  }, [settings.shopName]);

  const wishlistProducts = products.filter(p => wishlist.includes(p.id));

  if (wishlist.length === 0) {
    return (
      <div className="container mx-auto px-4 py-32 text-center">
        <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-8 border border-red-100">
          <Heart className="h-10 w-10 text-red-500 fill-red-500" />
        </div>
        <h1 className="text-3xl font-black uppercase tracking-tight mb-4">Your Wishlist is Empty</h1>
        <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px] mb-8">Save items you love to find them later.</p>
        <Link to="/categories">
          <Button
            className="rounded-2xl px-12 h-14 font-black uppercase tracking-widest shadow-xl"
            style={{
              backgroundColor: settings.primaryColor,
              color: 'var(--primary-foreground)',
              borderColor: 'var(--primary-border)',
            }}
          >
            Start Shopping
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 md:py-24">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight mb-4">Your Wishlist</h1>
        <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">{wishlist.length} items saved</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12">
        <AnimatePresence>
          {wishlistProducts.map((product) => (
            <motion.div
              key={product.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="group"
            >
              <div className="relative aspect-[4/5] rounded-[2.5rem] overflow-hidden bg-gray-100 mb-6 group-hover:shadow-2xl transition-all duration-500">
                <Link to={`/product/${product.slug}`}>
                  <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                </Link>
                <button 
                  onClick={() => toggleWishlist(product.id)}
                  className="absolute top-6 right-6 w-12 h-12 bg-white/90 backdrop-blur-md rounded-2xl flex items-center justify-center text-red-500 hover:bg-white transition-all shadow-xl active:scale-90"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
              
              <div className="text-center">
                <h3 className="text-lg font-black uppercase tracking-tight mb-1">{product.name}</h3>
                <p className="text-xl font-black tracking-tighter mb-6" style={{ color: settings.primaryColor }}>
                   {settings.currencySymbol}{product.discountPrice || product.price}
                </p>
                <div className="flex gap-2">
                  <Link to={`/product/${product.slug}`} className="flex-1">
                    <Button variant="outline" className="w-full h-12 rounded-2xl font-black uppercase tracking-widest text-[10px] border-2">
                      View details
                    </Button>
                  </Link>
                  <Button 
                    className="flex-1 h-12 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg"
                    style={{
                      backgroundColor: settings.primaryColor,
                      color: 'var(--primary-foreground)',
                      borderColor: 'var(--primary-border)',
                    }}
                    onClick={() => addToCart(product)}
                  >
                    Add to Cart
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};
