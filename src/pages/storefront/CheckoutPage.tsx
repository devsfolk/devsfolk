import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useShop } from '@/context/ShopContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, ArrowLeft, ShoppingBag, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

export const CheckoutPage: React.FC = () => {
  const { cart, cartTotal, settings, placeOrder } = useShop();
  const navigate = useNavigate();

  React.useEffect(() => {
    document.title = `Checkout | ${settings.shopName}`;
  }, [settings.shopName]);
  const [isSuccess, setIsSuccess] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    customerAddress: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (mode: 'WHATSAPP' | 'WEBSITE') => {
    if (!formData.customerName || !formData.customerPhone || !formData.customerAddress) {
      alert('Please fill in all required fields');
      return;
    }

    if (mode === 'WEBSITE' && !paymentMethod) {
      alert('Please select a payment method');
      return;
    }

    placeOrder(formData, mode, paymentMethod);
    if (mode === 'WEBSITE') {
      setIsSuccess(true);
    }
  };

  if (isSuccess) {
    return (
      <div className="container mx-auto px-4 py-24 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md mx-auto"
        >
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600">
            <CheckCircle2 className="h-12 w-12" />
          </div>
          <h1 className="text-3xl font-bold mb-4">Order Placed Successfully!</h1>
          <p className="text-gray-600 mb-8">
            Thank you for your purchase. We've received your order and will process it shortly.
          </p>
          <Link to="/">
            <Button size="lg" className="rounded-full px-8">Return to Home</Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="container mx-auto px-4 py-24 text-center">
        <h1 className="text-2xl font-bold mb-4">Your cart is empty</h1>
        <Link to="/categories">
          <Button>Back to Shop</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <Link to="/cart" className="inline-flex items-center gap-2 text-sm text-gray-500 mb-8 hover:text-black">
        <ArrowLeft className="h-4 w-4" /> Back to Cart
      </Link>
      
      <h1 className="text-4xl font-bold mb-12">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Customer Information */}
        <div className="space-y-8">
          <Card className="border-none shadow-sm bg-gray-50 rounded-3xl">
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customerName">Full Name *</Label>
                <Input 
                  id="customerName" 
                  name="customerName" 
                  placeholder="John Doe" 
                  value={formData.customerName}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerEmail">Email Address</Label>
                <Input 
                  id="customerEmail" 
                  name="customerEmail" 
                  type="email" 
                  placeholder="john@example.com" 
                  value={formData.customerEmail}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerPhone">Phone Number *</Label>
                <Input 
                  id="customerPhone" 
                  name="customerPhone" 
                  placeholder="+1 (555) 000-0000" 
                  value={formData.customerPhone}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerAddress">Shipping Address *</Label>
                <Input 
                  id="customerAddress" 
                  name="customerAddress" 
                  placeholder="123 Street, City, Country" 
                  value={formData.customerAddress}
                  onChange={handleChange}
                  required
                />
              </div>
            </CardContent>
          </Card>

          {settings.orderMode !== 'WHATSAPP' && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold">Payment Method</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {settings.paymentSettings?.stripe?.enabled && (
                  <button 
                    onClick={() => setPaymentMethod('stripe')}
                    className={`p-4 rounded-2xl border-2 text-left transition-all ${paymentMethod === 'stripe' ? 'border-black bg-black text-white' : 'border-gray-100 bg-white hover:border-gray-200'}`}
                  >
                    <div className="font-bold">Stripe</div>
                    <div className="text-xs opacity-70 cursor-pointer">Pay with Credit Card</div>
                  </button>
                )}
                {settings.paymentSettings?.paypal?.enabled && (
                  <button 
                    onClick={() => setPaymentMethod('paypal')}
                    className={`p-4 rounded-2xl border-2 text-left transition-all ${paymentMethod === 'paypal' ? 'border-black bg-black text-white' : 'border-gray-100 bg-white hover:border-gray-200'}`}
                  >
                    <div className="font-bold">PayPal</div>
                    <div className="text-xs opacity-70 cursor-pointer">Fast & Secure</div>
                  </button>
                )}
                {settings.paymentSettings?.bankTransfer?.enabled && (
                  <button 
                    onClick={() => setPaymentMethod('bank')}
                    className={`p-4 rounded-2xl border-2 text-left transition-all ${paymentMethod === 'bank' ? 'border-black bg-black text-white' : 'border-gray-100 bg-white hover:border-gray-200'}`}
                  >
                    <div className="font-bold">Bank Transfer</div>
                    <div className="text-xs opacity-70 cursor-pointer">Manual Transfer</div>
                  </button>
                )}
                {settings.paymentSettings?.cod?.enabled && (
                  <button 
                    onClick={() => setPaymentMethod('cod')}
                    className={`p-4 rounded-2xl border-2 text-left transition-all ${paymentMethod === 'cod' ? 'border-black bg-black text-white' : 'border-gray-100 bg-white hover:border-gray-200'}`}
                  >
                    <div className="font-bold">Cash on Delivery</div>
                    <div className="text-xs opacity-70 cursor-pointer">Pay when you receive</div>
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="space-y-4">
            <h3 className="text-lg font-bold">Complete Order</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(settings.orderMode === 'WEBSITE' || settings.orderMode === 'BOTH') && (
                <Button 
                  size="lg" 
                  className="h-16 rounded-2xl font-bold flex flex-col items-center justify-center gap-1"
                  style={{
                    backgroundColor: settings.primaryColor,
                    color: 'var(--primary-foreground)',
                    borderColor: 'var(--primary-border)',
                  }}
                  onClick={() => handleSubmit('WEBSITE')}
                >
                  <ShoppingBag className="h-5 w-5" />
                  <span>Order on Website</span>
                </Button>
              )}
              
              {(settings.orderMode === 'WHATSAPP' || settings.orderMode === 'BOTH') && (
                <Button 
                  size="lg" 
                  className="h-16 rounded-2xl font-bold flex flex-col items-center justify-center gap-1 bg-[#25D366] hover:bg-[#1ebd5e] text-white border-none"
                  onClick={() => handleSubmit('WHATSAPP')}
                >
                  <MessageSquare className="h-5 w-5" />
                  <span>Order on WhatsApp</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div>
          <Card className="border-none shadow-sm bg-gray-50 rounded-3xl sticky top-24">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 mb-6">
                {cart.map((item) => (
                  <div key={`${item.productId}-${item.variantId}`} className="flex gap-4">
                    <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-white">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-sm line-clamp-1">{item.name}</h4>
                      <p className="text-xs text-gray-500">{item.quantity} x {settings.currencySymbol}{item.price.toFixed(2)}</p>
                    </div>
                    <p className="font-bold text-sm">{settings.currencySymbol}{(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-2 pt-4 border-t">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span>{settings.currencySymbol}{cartTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Shipping</span>
                  <span className="text-green-600 font-medium">FREE</span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-4">
                  <span>Total</span>
                  <span>{settings.currencySymbol}{cartTotal.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
