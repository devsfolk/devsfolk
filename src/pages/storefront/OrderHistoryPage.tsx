import React, { useState, useEffect } from 'react';
import { useShop } from '@/context/ShopContext';
import { Link } from 'react-router-dom';
import { 
  ClipboardList, 
  Search, 
  ArrowRight, 
  Package, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  Truck, 
  AlertCircle, 
  ShoppingBag,
  MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion, AnimatePresence } from 'motion/react';

const parsePaymentMethod = (methodStr: string | null | undefined) => {
  if (!methodStr) return { method: 'COD', verified: false };
  if (methodStr === 'WHATSAPP') return { method: 'WHATSAPP', verified: false };
  if (methodStr === 'stripe') return { method: 'Stripe Credit Card', verified: true };
  if (methodStr === 'paypal') return { method: 'PayPal', verified: true };
  if (methodStr === 'cod') return { orderMethod: 'Cash on Delivery', verified: false };
  
  try {
    const parsed = JSON.parse(methodStr);
    return {
      method: parsed.method === 'bank' ? 'Bank Transfer' : parsed.method || 'Bank Transfer',
      verified: parsed.verified || false,
      bankName: parsed.bankName || ''
    };
  } catch {
    return { method: methodStr, verified: false };
  }
};

export const OrderHistoryPage: React.FC = () => {
  const { orders, products, settings, addToCart } = useShop();
  const [deviceOrderIds, setDeviceOrderIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchSuccessMsg, setSearchSuccessMsg] = useState<string | null>(null);
  const [searchErrorMsg, setSearchErrorMsg] = useState<string | null>(null);
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});

  // Load order IDs linked to this device from localStorage
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('customer_order_ids') || '[]');
      if (Array.isArray(stored)) {
        setDeviceOrderIds(stored);
      }
    } catch (e) {
      console.error('Failed to load local order history:', e);
    }
  }, []);

  useEffect(() => {
    document.title = `Order History | ${settings.shopName}`;
  }, [settings.shopName]);

  // Filter orders that belong to this device
  const customerOrders = orders.filter(o => deviceOrderIds.includes(o.id));

  // Toggle order expansion details
  const toggleExpand = (orderId: string) => {
    setExpandedOrders(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  // Lookup order history securely via phone or email
  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchSuccessMsg(null);
    setSearchErrorMsg(null);

    setTimeout(() => {
      const targetQuery = searchQuery.toLowerCase().trim();
      const cleanedQuery = targetQuery.replace(/[^0-9a-zA-Z]/g, '');

      // Find all matching orders in the system
      const matches = orders.filter(o => {
        const emailMatch = o.customerEmail && o.customerEmail.toLowerCase().trim() === targetQuery;
        const oCleanedPhone = o.customerPhone ? o.customerPhone.replace(/[^0-9a-zA-Z]/g, '') : '';
        const phoneMatch = o.customerPhone && oCleanedPhone.includes(cleanedQuery) && cleanedQuery.length >= 7;
        return emailMatch || phoneMatch;
      });

      if (matches.length > 0) {
        const foundIds = matches.map(o => o.id);
        const updatedIds = Array.from(new Set([...deviceOrderIds, ...foundIds]));
        
        localStorage.setItem('customer_order_ids', JSON.stringify(updatedIds));
        setDeviceOrderIds(updatedIds);
        setSearchSuccessMsg(`Found and synced ${matches.length} order(s) successfully!`);
        setSearchQuery('');
      } else {
        setSearchErrorMsg('No matching orders found. Please verify your email or phone number.');
      }
      setIsSearching(false);
    }, 800);
  };

  // Reorder items: add all items of the order to shopping cart
  const handleReorder = (order: typeof orders[0]) => {
    order.items.forEach(item => {
      const matchedProd = products.find(p => p.id === item.productId);
      if (matchedProd) {
        addToCart(matchedProd, item.quantity);
      }
    });
    alert('All items from this order have been added to your cart!');
  };

  // Get status stepper visuals
  const getStatusStepper = (status: typeof orders[0]['status']) => {
    const steps = [
      { id: 'PENDING', label: 'Placed', icon: Clock },
      { id: 'PROCESSING', label: 'Processing', icon: Package },
      { id: 'SHIPPED', label: 'Shipped', icon: Truck },
      { id: 'COMPLETED', label: 'Delivered', icon: CheckCircle2 }
    ];

    // Determine current index
    let activeIndex = 0;
    if (status === 'PROCESSING') activeIndex = 1;
    if (status === 'COMPLETED') activeIndex = 3;
    if (status === 'CANCELLED' || status === 'ABANDONED') {
      return (
        <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-2xl border border-red-100 text-xs font-bold leading-none uppercase tracking-wider">
          <AlertCircle className="h-4 w-4" />
          <span>Order {status}</span>
        </div>
      );
    }

    return (
      <div className="w-full flex items-center justify-between mt-4 mb-2 relative">
        <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-gray-200 -translate-y-1/2 -z-10" />
        <div 
          className="absolute top-1/2 left-0 h-[2px] -translate-y-1/2 -z-10 transition-all duration-500" 
          style={{ 
            backgroundColor: settings.primaryColor,
            width: `${(activeIndex / (steps.length - 1)) * 100}%` 
          }} 
        />
        {steps.map((step, idx) => {
          const StepIcon = step.icon;
          const isDone = idx <= activeIndex;
          const isCurrent = idx === activeIndex;

          return (
            <div key={step.id} className="flex flex-col items-center">
              <div 
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${isDone ? 'text-white' : 'bg-gray-100 text-gray-400 border border-gray-200'}`}
                style={isDone ? { backgroundColor: settings.primaryColor } : {}}
              >
                <StepIcon className="h-3.5 w-3.5" />
              </div>
              <span className={`text-[9px] font-bold mt-1.5 uppercase tracking-widest ${isCurrent ? 'text-black' : 'text-gray-400'}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-12 md:py-24">
      {/* Page Header */}
      <div className="text-center mb-16 max-w-2xl mx-auto">
        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-100 shadow-sm">
          <ClipboardList className="h-10 w-10 text-gray-500" />
        </div>
        <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight mb-4">Order History</h1>
        <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px] md:text-xs">
          Review, track status, or easily repeat past orders.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
        {/* Orders List Section */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-black uppercase tracking-wider pl-1">Your Orders ({customerOrders.length})</h2>
          
          {customerOrders.length === 0 ? (
            <Card className="border-none shadow-sm bg-gray-50/50 rounded-3xl p-12 text-center">
              <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-black uppercase tracking-tight mb-2">No Local Orders Found</h3>
              <p className="text-xs text-gray-400 mb-6">You haven't placed any orders from this device yet, or they haven't synced.</p>
              <Link to="/categories">
                <Button 
                  className="rounded-xl h-11 px-8 font-black uppercase tracking-widest text-[10px]"
                  style={{ backgroundColor: settings.primaryColor }}
                >
                  Start Shopping
                </Button>
              </Link>
            </Card>
          ) : (
            <div className="space-y-4">
              <AnimatePresence>
                {customerOrders.map(order => {
                  const isExpanded = !!expandedOrders[order.id];
                  const payment = parsePaymentMethod(order.paymentMethod);
                  
                  return (
                    <motion.div
                      key={order.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-3xl border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 shadow-sm"
                    >
                      {/* Card Header Summary */}
                      <div 
                        onClick={() => toggleExpand(order.id)}
                        className="p-6 flex flex-wrap items-center justify-between gap-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
                      >
                        <div className="space-y-1">
                          <p className="font-mono text-[10px] font-black uppercase text-gray-400 tracking-wider">{order.id}</p>
                          <p className="text-xs font-bold text-gray-500 uppercase">
                            Placed on {new Date(order.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <span className="text-[9px] font-bold text-gray-400 uppercase block">Total Amount</span>
                            <span className="font-black text-base md:text-lg" style={{ color: settings.primaryColor }}>
                              {settings.currencySymbol}{order.total.toFixed(2)}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {isExpanded ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
                          </div>
                        </div>
                      </div>

                      {/* Stepper Tracking Visualizer (Always visible for convenience!) */}
                      <div className="px-6 pb-6 border-b border-gray-100">
                        {getStatusStepper(order.status)}
                      </div>

                      {/* Expandable Order Details Block */}
                      {isExpanded && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="p-6 bg-gray-50/50 space-y-6">
                            {/* Order Items */}
                            <div className="space-y-3">
                              <h4 className="text-[10px] font-black uppercase tracking-wider text-gray-400">Order Items</h4>
                              <div className="space-y-2 bg-white rounded-2xl p-4 border border-gray-100">
                                {order.items.map(item => {
                                  const matchedProd = products.find(p => p.id === item.productId);
                                  return (
                                    <div key={item.productId} className="flex justify-between items-center gap-4 py-2 border-b border-gray-50 last:border-b-0">
                                      <div className="flex items-center gap-3">
                                        <div className="w-10 h-12 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                                          {matchedProd && matchedProd.images?.[0] && (
                                            <img src={matchedProd.images[0]} className="w-full h-full object-cover" alt="" />
                                          )}
                                        </div>
                                        <div>
                                          <p className="text-[11px] font-bold uppercase leading-tight line-clamp-1">{item.name}</p>
                                          <p className="text-[9px] text-gray-400 uppercase tracking-widest mt-0.5">{item.quantity} x {settings.currencySymbol}{item.price}</p>
                                        </div>
                                      </div>
                                      <p className="text-xs font-black">{settings.currencySymbol}{(item.price * item.quantity).toFixed(2)}</p>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Shipping & Payment Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-1">
                                <span className="text-[8px] font-black uppercase tracking-wider text-gray-400">Delivery Address</span>
                                <p className="text-xs text-gray-600 font-medium leading-relaxed bg-white p-3 rounded-xl border border-gray-100 italic">
                                  {order.customerAddress}
                                </p>
                              </div>
                              <div className="space-y-1">
                                <span className="text-[8px] font-black uppercase tracking-wider text-gray-400">Payment & Contact</span>
                                <div className="bg-white p-3 rounded-xl border border-gray-100 space-y-1 text-xs font-medium">
                                  <p className="text-gray-700">Mode: <span className="font-bold">{payment.method}</span></p>
                                  {order.customerPhone && <p className="text-gray-500">Phone: {order.customerPhone}</p>}
                                  {order.customerEmail && <p className="text-gray-500">Email: {order.customerEmail}</p>}
                                </div>
                              </div>
                            </div>

                            {/* Delivery Note if present */}
                            {order.notes && (
                              <div className="space-y-1">
                                <span className="text-[8px] font-black uppercase tracking-wider text-gray-400">Your Delivery Note</span>
                                <p className="text-xs text-amber-700 leading-relaxed bg-amber-50/50 p-3 rounded-xl border border-amber-100/70 font-medium italic">
                                  {order.notes}
                                </p>
                              </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200/50">
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-xl h-9 text-[9px] font-black uppercase tracking-widest border-2 flex items-center gap-1.5"
                                onClick={() => handleReorder(order)}
                              >
                                <RefreshCw className="h-3 w-3" />
                                <span>Reorder Items</span>
                              </Button>

                              <a
                                href={`https://wa.me/${settings.whatsappNumber}?text=${encodeURIComponent(`Hi, I would like to inquire about my order ID: ${order.id}. Current status is: ${order.status}.`)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex h-9 items-center justify-center rounded-xl border-2 hover:bg-gray-100 transition-colors px-3 text-[9px] font-black uppercase tracking-widest gap-1.5"
                              >
                                <MessageSquare className="h-3 w-3 text-green-600" />
                                <span>Inquire on WhatsApp</span>
                              </a>

                              <Link to={`/track-order?id=${order.id}`} className="inline-flex h-9 items-center justify-center rounded-xl border-2 hover:bg-gray-100 transition-colors px-3 text-[9px] font-black uppercase tracking-widest gap-1.5 ml-auto">
                                <span>Go to Live Tracking</span>
                                <ExternalLink className="h-3 w-3" />
                              </Link>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Lookup Sync Card Section */}
        <div className="space-y-6">
          <h2 className="text-xl font-black uppercase tracking-wider pl-1">Find My Orders</h2>
          <Card className="border-none shadow-sm bg-gray-50 rounded-[2rem] overflow-hidden p-6 md:p-8">
            <CardHeader className="p-0 mb-6">
              <CardTitle className="text-lg font-black uppercase">Retrieve Orders</CardTitle>
              <CardDescription className="text-xs text-gray-400 mt-1">
                Placed orders from another device? Enter your email address or phone number to retrieve and sync them here.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <form onSubmit={handleLookup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="searchQuery">Email or Phone Number</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input 
                      id="searchQuery"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="e.g. john@example.com or 03001234567"
                      className="pl-10 h-12 rounded-2xl bg-white border-none shadow-inner"
                      required
                    />
                  </div>
                </div>

                <Button 
                  type="submit"
                  disabled={isSearching}
                  className="w-full h-12 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: settings.primaryColor,
                    color: 'var(--primary-foreground)',
                    borderColor: 'var(--primary-border)',
                  }}
                >
                  {isSearching ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <span>Sync Order History</span>
                  )}
                </Button>
              </form>

              {/* Status Notifications */}
              <AnimatePresence>
                {searchSuccessMsg && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="mt-6 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-700 font-medium"
                  >
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                    <span>{searchSuccessMsg}</span>
                  </motion.div>
                )}

                {searchErrorMsg && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="mt-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-2.5 text-xs text-red-700 font-medium"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                    <span>{searchErrorMsg}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
