import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useShop } from '@/context/ShopContext';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const CartPage: React.FC = () => {
  const { cart, removeFromCart, updateCartQuantity, cartTotal, settings } = useShop();
  const navigate = useNavigate();

  React.useEffect(() => {
    document.title = `Your Cart | ${settings.shopName}`;
  }, [settings.shopName]);

  const handleCheckout = () => {
    navigate('/checkout');
  };

  if (cart.length === 0) {
    return (
      <div className="container mx-auto px-4 py-32 text-center">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShoppingBag className="h-10 w-10 text-gray-400" />
        </div>
        <h1 className="text-3xl font-bold mb-4">Your cart is empty</h1>
        <p className="text-gray-500 mb-8 max-w-sm mx-auto">
          Look like you haven't added anything to your cart yet.
        </p>
        <Link to="/categories">
          <Button size="lg" className="rounded-full px-8">Start Shopping</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-2 md:px-4 py-6 md:py-12">
      <h1 className="text-2xl md:text-4xl font-black uppercase tracking-tight mb-8 md:mb-12 px-2 md:px-0">Your Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-12">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4 md:space-y-6">
          {cart.map((item) => (
            <div key={`${item.productId}-${item.variantId}`} className="flex gap-4 md:gap-6 pb-4 md:pb-6 border-b last:border-0 px-2 md:px-0">
              <div className="w-20 md:w-32 aspect-square rounded-xl md:rounded-2xl overflow-hidden bg-gray-100 flex-shrink-0">
                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
              </div>
              
              <div className="flex-1 flex flex-col justify-between py-0.5 md:py-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-black text-sm md:text-lg uppercase tracking-tight">{item.name}</h3>
                    <p className="text-[10px] md:text-sm font-bold text-gray-400 uppercase tracking-widest italic opacity-60 leading-none mt-1">Price: {settings.currencySymbol}{item.price.toFixed(2)}</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-gray-400 hover:text-red-500 h-8 w-8 md:h-10 md:w-10"
                    onClick={() => removeFromCart(item.productId, item.variantId)}
                  >
                    <Trash2 className="h-4 w-4 md:h-5 md:w-5" />
                  </Button>
                </div>

                <div className="flex justify-between items-end mt-2">
                  <div className="flex items-center border rounded-full px-1.5 md:px-2 bg-gray-50/50">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 md:h-8 md:w-8"
                      onClick={() => updateCartQuantity(item.productId, item.variantId, item.quantity - 1)}
                    >
                      <Minus className="h-2.5 w-2.5 md:h-3 md:w-3" />
                    </Button>
                    <span className="w-6 md:w-8 text-center text-[10px] md:text-sm font-black">{item.quantity}</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 md:h-8 md:w-8"
                      onClick={() => updateCartQuantity(item.productId, item.variantId, item.quantity + 1)}
                    >
                      <Plus className="h-2.5 w-2.5 md:h-3 md:w-3" />
                    </Button>
                  </div>
                  <p className="font-black text-sm md:text-lg">{settings.currencySymbol}{(item.price * item.quantity).toFixed(2)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-gray-100/50 backdrop-blur rounded-[2rem] p-6 md:p-8 sticky top-24 mx-2 md:mx-0">
            <h2 className="text-lg md:text-xl font-black uppercase tracking-tight mb-6">Order Summary</h2>
            
            <div className="space-y-3 md:space-y-4 mb-6">
              <div className="flex justify-between text-[10px] md:text-sm font-bold uppercase tracking-widest text-gray-400">
                <span>Subtotal</span>
                <span className="text-black">{settings.currencySymbol}{cartTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[10px] md:text-sm font-bold uppercase tracking-widest text-gray-400">
                <span>Shipping</span>
                <span className="text-green-600">FREE</span>
              </div>
              <div className="flex justify-between font-black text-base md:text-xl pt-4 border-t border-gray-200 uppercase tracking-tighter">
                <span>Total</span>
                <span>{settings.currencySymbol}{cartTotal.toFixed(2)}</span>
              </div>
            </div>

            <p className="text-[8px] md:text-[10px] text-gray-400 mb-6 text-center uppercase font-bold tracking-widest opacity-60">
              Secure Checkout Powered by OmniDashboard
            </p>

            <Button 
              size="lg" 
              className="w-full h-12 md:h-14 rounded-2xl border font-black text-xs md:text-lg uppercase tracking-widest shadow-xl"
              style={{
                backgroundColor: settings.primaryColor,
                color: 'var(--primary-foreground)',
                borderColor: 'var(--primary-border)',
              }}
              onClick={handleCheckout}
            >
              Proceed to Checkout
            </Button>
            
            <Link to="/categories">
              <Button variant="ghost" className="w-full mt-4 h-10 md:h-12 flex items-center gap-2 font-bold text-[10px] md:text-sm uppercase tracking-widest opacity-60">
                Continue Shopping <ArrowRight className="h-3.5 w-3.5 md:h-4 md:w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
