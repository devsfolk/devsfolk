import React, { useState } from 'react';
import { useShop } from '@/context/ShopContext';
import { Search, Package, Clock, CheckCircle, XCircle, Truck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '@/lib/supabase';
import type { Order } from '@/types';

export const OrderTrackingPage: React.FC = () => {
  const { orders, settings } = useShop();

  React.useEffect(() => {
    document.title = `Track Order | ${settings.shopName}`;
  }, [settings.shopName]);

  const [orderId, setOrderId] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [trackedOrder, setTrackedOrder] = useState<Order | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);

    const normalizedOrderId = orderId.toLowerCase().trim();
    const normalizedPhone = phoneNumber.trim();

    if (supabase && normalizedOrderId && normalizedPhone) {
      const { data, error } = await supabase.rpc('track_order', {
        order_lookup: normalizedOrderId,
        phone_lookup: normalizedPhone,
      });

      if (!error && data && data.length > 0) {
        const row = data[0];
        setTrackedOrder({
          id: row.id,
          status: row.status,
          total: Number(row.total),
          createdAt: row.created_at,
          items: row.items || [],
          customerName: '',
          customerEmail: '',
          customerPhone: normalizedPhone,
          customerAddress: '',
        });
        setHasSearched(true);
        setIsSearching(false);
        return;
      }
    }

    const order = orders.find(
      (item) =>
        item.id.toLowerCase() === normalizedOrderId &&
        (!normalizedPhone || item.customerPhone.trim() === normalizedPhone),
    );
    setTrackedOrder(order || null);
    setHasSearched(true);
    setIsSearching(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING': return <Clock className="h-4 w-4" />;
      case 'PROCESSING': return <Package className="h-4 w-4" />;
      case 'COMPLETED': return <CheckCircle className="h-4 w-4" />;
      case 'CANCELLED': return <XCircle className="h-4 w-4" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'text-yellow-600 bg-yellow-50 border-yellow-100';
      case 'PROCESSING': return 'text-blue-600 bg-blue-50 border-blue-100';
      case 'COMPLETED': return 'text-green-600 bg-green-50 border-green-100';
      case 'CANCELLED': return 'text-red-600 bg-red-50 border-red-100';
      default: return 'text-gray-600 bg-gray-50 border-gray-100';
    }
  };

  return (
    <div className="container mx-auto px-4 py-12 md:py-24 max-w-2xl">
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight mb-4">Track Your Order</h1>
        <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Enter your order ID below to see its status</p>
      </div>

      <form onSubmit={handleTrack} className="mb-12 bg-white p-2 rounded-2xl shadow-xl border border-gray-100 space-y-2">
        <div className="flex flex-col md:flex-row gap-2">
          <Input 
            placeholder="Order ID (e.g. ord_12345)" 
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            className="border-none bg-transparent focus-visible:ring-0 text-sm md:text-base font-bold px-4"
          />
          <Input
            placeholder="Phone Number"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="border-none bg-transparent focus-visible:ring-0 text-sm md:text-base font-bold px-4"
          />
          <Button
            type="submit"
            disabled={isSearching}
            className="rounded-xl px-8 font-black uppercase tracking-widest"
            style={{
              backgroundColor: settings.primaryColor,
              color: 'var(--primary-foreground)',
              borderColor: 'var(--primary-border)',
            }}
          >
            {isSearching ? 'Tracking...' : 'Track'}
          </Button>
        </div>
        <p className="px-4 pb-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">
          Enter the order ID and phone number used during checkout.
        </p>
      </form>

      <AnimatePresence mode="wait">
        {trackedOrder ? (
          <motion.div
            key={trackedOrder.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden">
               <CardContent className="p-0">
                  <div className="p-8 bg-gray-50 border-b flex justify-between items-center">
                     <div>
                        <h2 className="text-xl font-black uppercase tracking-tight">Order #{trackedOrder.id}</h2>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mt-1">Placed on {new Date(trackedOrder.createdAt).toLocaleDateString()}</p>
                     </div>
                     <Badge className={`rounded-full px-4 h-8 flex items-center gap-2 font-black uppercase text-[10px] tracking-widest ${getStatusColor(trackedOrder.status)}`}>
                        {getStatusIcon(trackedOrder.status)}
                        {trackedOrder.status}
                     </Badge>
                  </div>
                  
                  <div className="p-8 space-y-8">
                     <div className="relative">
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-100 rounded-full" />
                        <div 
                          className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-black rounded-full transition-all duration-1000"
                          style={{ 
                            width: trackedOrder.status === 'PENDING' ? '25%' : 
                                   trackedOrder.status === 'PROCESSING' ? '60%' : 
                                   trackedOrder.status === 'COMPLETED' ? '100%' : '0%',
                            backgroundColor: settings.primaryColor
                          }}
                        />
                        <div className="relative flex justify-between">
                           {['PENDING', 'PROCESSING', 'COMPLETED'].map((s, i) => (
                             <div key={s} className="flex flex-col items-center gap-2">
                                <div 
                                  className={`w-4 h-4 rounded-full border-4 bg-white z-10 ${
                                    (i === 0 && trackedOrder.status !== 'CANCELLED') || 
                                    (i === 1 && (trackedOrder.status === 'PROCESSING' || trackedOrder.status === 'COMPLETED')) ||
                                    (i === 2 && trackedOrder.status === 'COMPLETED')
                                    ? 'border-black' : 'border-gray-200'
                                  }`}
                                  style={{ borderColor: (i === 0 || (i === 1 && (trackedOrder.status === 'PROCESSING' || trackedOrder.status === 'COMPLETED')) || (i === 2 && trackedOrder.status === 'COMPLETED')) ? settings.primaryColor : undefined }}
                                />
                                <span className={`text-[8px] font-black uppercase tracking-widest ${
                                  (i === 0 && trackedOrder.status !== 'CANCELLED') || 
                                  (i === 1 && (trackedOrder.status === 'PROCESSING' || trackedOrder.status === 'COMPLETED')) ||
                                  (i === 2 && trackedOrder.status === 'COMPLETED')
                                  ? 'text-black' : 'text-gray-300'
                                }`}>{s}</span>
                             </div>
                           ))}
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t">
                        <div>
                           <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Customer</h3>
                           <p className="font-black text-sm uppercase">{trackedOrder.customerName || 'Verified Customer'}</p>
                           <p className="text-xs text-gray-500">{trackedOrder.customerPhone}</p>
                        </div>
                        <div>
                           <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Total</h3>
                           <p className="font-black text-xl tracking-tighter" style={{ color: settings.primaryColor }}>
                              {settings.currencySymbol}{trackedOrder.total.toFixed(2)}
                           </p>
                        </div>
                     </div>

                     <div className="space-y-3">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Order Items</h3>
                        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                           {trackedOrder.items.map((item: any, i: number) => (
                              <div key={i} className="flex justify-between items-center py-2 border-b last:border-none border-gray-200/50">
                                 <div>
                                    <p className="text-[10px] font-black uppercase truncate max-w-[200px]">{item.name}</p>
                                    <p className="text-[8px] font-bold text-gray-400">Qty: {item.quantity}</p>
                                 </div>
                                 <p className="text-[10px] font-black">{settings.currencySymbol}{(item.price * item.quantity).toFixed(2)}</p>
                              </div>
                           ))}
                        </div>
                     </div>
                  </div>
               </CardContent>
            </Card>
          </motion.div>
        ) : hasSearched && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 text-red-500 mb-4 border border-red-100">
                <Search className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-black uppercase tracking-tight mb-2">Order Not Found</h3>
            <p className="text-sm text-gray-400 font-bold uppercase tracking-widest max-w-xs mx-auto">Please check your Order ID and try again.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
