import React from 'react';
import { useShop } from '@/context/ShopContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShoppingBag, Eye, CheckCircle, XCircle, Clock, ChevronLeft, Globe, Landmark, ShieldAlert, ShieldCheck, Check, AlertCircle, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';
import { supabase } from '@/lib/supabase';

const parsePaymentMethod = (methodStr: string | null | undefined) => {
  if (!methodStr) return { method: 'COD', verified: false, receiptUrl: '', source: 'WEBSITE' };
  if (methodStr === 'WHATSAPP') return { method: 'WHATSAPP', verified: false, receiptUrl: '', source: 'WHATSAPP' };
  if (methodStr === 'stripe') return { method: 'stripe', verified: true, receiptUrl: '', source: 'WEBSITE' };
  if (methodStr === 'paypal') return { method: 'paypal', verified: true, receiptUrl: '', source: 'WEBSITE' };
  if (methodStr === 'cod') return { method: 'COD', verified: false, receiptUrl: '', source: 'WEBSITE' };
  
  try {
    const parsed = JSON.parse(methodStr);
    return {
      method: parsed.method || 'bank',
      verified: parsed.verified || false,
      receiptUrl: parsed.receiptUrl || '',
      bankName: parsed.bankName || '',
      autoVerified: parsed.autoVerified || false,
      source: parsed.source || 'WEBSITE'
    };
  } catch {
    return { method: methodStr, verified: false, receiptUrl: '', source: 'WEBSITE' };
  }
};

export const OrdersPage: React.FC = () => {
  const { orders, settings, updateOrderStatus, refreshOrders } = useShop();
  const [selectedOrder, setSelectedOrder] = React.useState<any>(null);
  const [zoomReceiptUrl, setZoomReceiptUrl] = React.useState<string | null>(null);
  const [activeToast, setActiveToast] = React.useState<any | null>(null);
  const prevOrdersRef = React.useRef<any[]>([]);

  // Synthesize double telephone-buzz chime using HTML5 Web Audio API
  const playNotificationSound = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      const playTone = (time: number, freq1: number, freq2: number, duration: number) => {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        osc1.type = 'sine';
        osc2.type = 'sine';
        
        osc1.frequency.setValueAtTime(freq1, time);
        osc2.frequency.setValueAtTime(freq2, time);
        
        // Ringing amplitude envelope
        gainNode.gain.setValueAtTime(0, time);
        gainNode.gain.linearRampToValueAtTime(0.35, time + 0.04);
        gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration);
        
        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        osc1.start(time);
        osc2.start(time);
        
        osc1.stop(time + duration);
        osc2.stop(time + duration);
      };

      const now = ctx.currentTime;
      // Cycle 1
      playTone(now, 853, 857, 0.18);
      playTone(now + 0.22, 853, 857, 0.18);
      playTone(now + 0.44, 853, 857, 0.42);
      
      // Cycle 2
      playTone(now + 0.9, 853, 857, 0.18);
      playTone(now + 1.12, 853, 857, 0.18);
      playTone(now + 1.34, 853, 857, 0.42);
    } catch (err) {
      console.error('Notification audio failed:', err);
    }
  };

  // Request browser Notification permission
  React.useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      void Notification.requestPermission();
    }
  }, []);

  // Monitor order list and trigger alerts on new orders (regardless of status)
  React.useEffect(() => {
    if (orders.length > 0) {
      if (prevOrdersRef.current.length > 0) {
        const newOrders = orders.filter(
          (o) => !prevOrdersRef.current.some((prev) => prev.id === o.id)
        );

        if (newOrders.length > 0) {
          const latestOrder = newOrders[0];
          
          // Ring audio sound
          playNotificationSound();
          
          // Vibrate phone & show push notification
          if ('Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification('🚨 New Order Received! (DevsFolk OmniStore)', {
                body: `Customer: ${latestOrder.customerName}\nTotal: ${settings.currencySymbol}${latestOrder.total.toFixed(2)}\nPlatform: ${latestOrder.paymentMethod === 'WHATSAPP' ? 'WhatsApp' : 'Website'}`,
                icon: '/favicon.ico',
                vibrate: [200, 100, 200, 100, 200]
              });
            } catch (err) {
              console.error('System push alert trigger error:', err);
            }
          }

          // Show floating toast
          setActiveToast(latestOrder);
          setTimeout(() => {
            setActiveToast(null);
          }, 8000);
        }
      }
      prevOrdersRef.current = orders;
    }
  }, [orders, settings.currencySymbol]);

  React.useEffect(() => {
    void refreshOrders();

    const intervalId = window.setInterval(() => {
      void refreshOrders();
    }, 5000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [refreshOrders]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge className="bg-yellow-50 text-yellow-600 hover:bg-yellow-50 border-none font-black uppercase text-[8px] tracking-widest"><Clock className="h-2.5 w-2.5 mr-1" /> Pending</Badge>;
      case 'PROCESSING':
        return <Badge className="bg-blue-50 text-blue-600 hover:bg-blue-50 border-none font-black uppercase text-[8px] tracking-widest">Processing</Badge>;
      case 'COMPLETED':
        return <Badge className="bg-green-50 text-green-600 hover:bg-green-50 border-none font-black uppercase text-[8px] tracking-widest"><CheckCircle className="h-2.5 w-2.5 mr-1" /> Completed</Badge>;
      case 'CANCELLED':
        return <Badge className="bg-red-50 text-red-600 hover:bg-red-50 border-none font-black uppercase text-[8px] tracking-widest"><XCircle className="h-2.5 w-2.5 mr-1" /> Cancelled</Badge>;
      case 'ABANDONED':
        return <Badge className="bg-gray-100 text-gray-500 hover:bg-gray-100 border-none font-black uppercase text-[8px] tracking-widest"><XCircle className="h-2.5 w-2.5 mr-1" /> Abandoned</Badge>;
      default:
        return <Badge className="font-black uppercase text-[8px] tracking-widest">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="pb-4 md:pb-6 border-b border-gray-100">
        <h1 className="text-xl md:text-3xl font-black uppercase tracking-tight">Orders</h1>
        <p className="text-[8px] md:text-xs font-bold uppercase text-gray-400 tracking-widest opacity-70">Monitor and manage your customer fulfillment.</p>
      </div>

      <Card className="border-none shadow-sm rounded-[1.5rem] md:rounded-[2rem] overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-3 md:p-5 text-[8px] md:text-[10px] font-black uppercase text-gray-400">Order ID</th>
                <th className="p-3 md:p-5 text-[8px] md:text-[10px] font-black uppercase text-gray-400">Customer</th>
                <th className="p-3 md:p-5 text-[8px] md:text-[10px] font-black uppercase text-gray-400">Total ({settings.currencySymbol})</th>
                <th className="p-3 md:p-5 text-[8px] md:text-[10px] font-black uppercase text-gray-400">Status</th>
                <th className="p-3 md:p-5 text-[8px] md:text-[10px] font-black uppercase text-gray-400">Date</th>
                <th className="p-3 md:p-5 text-[8px] md:text-[10px] font-black uppercase text-gray-400 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-10 md:p-20 text-center text-gray-500">
                    <ShoppingBag className="h-10 w-10 md:h-16 md:w-16 mx-auto mb-4 opacity-10" />
                    <p className="text-[8px] md:text-xs font-black uppercase tracking-widest opacity-40">No orders yet</p>
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const paymentInfo = parsePaymentMethod(order.paymentMethod);
                  
                  // Platform source icon (WhatsApp vs Globe Website)
                  const isWhatsAppSource = order.paymentMethod === 'WHATSAPP' || paymentInfo.source === 'WHATSAPP';
                  const sourceIcon = isWhatsAppSource ? (
                    <div className="bg-green-50 p-2 rounded-xl flex-shrink-0 shadow-sm" title="WhatsApp Order">
                      <WhatsAppIcon className="h-3.5 w-3.5 text-green-600" />
                    </div>
                  ) : (
                    <div className="bg-blue-50 p-2 rounded-xl flex-shrink-0 shadow-sm" title="Website Order">
                      <Globe className="h-3.5 w-3.5 text-blue-600" />
                    </div>
                  );
                  
                  return (
                    <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-3 md:p-5 font-mono text-[8px] md:text-[10px] opacity-40">{order.id}</td>
                      <td className="p-3 md:p-5">
                        <div className="flex items-center gap-3">
                          {sourceIcon}
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-black text-xs md:text-sm uppercase tracking-tight truncate max-w-[80px] md:max-w-none">{order.customerName}</span>
                              {paymentInfo.method === 'bank' && (
                                paymentInfo.verified ? (
                                  <span className="text-[7px] font-black bg-emerald-50 text-emerald-700 uppercase px-1.5 py-0.5 rounded border border-emerald-100 leading-none flex items-center gap-1 shrink-0">
                                    <ShieldCheck className="h-2.5 w-2.5 text-emerald-600 animate-pulse" /> Paid
                                  </span>
                                ) : (
                                  <span className="text-[7px] font-black bg-amber-50 text-amber-700 uppercase px-1.5 py-0.5 rounded border border-amber-100 leading-none animate-pulse flex items-center gap-1 shrink-0">
                                    <ShieldAlert className="h-2.5 w-2.5 text-amber-600" /> Review
                                  </span>
                                )
                              )}
                            </div>
                            <div className="text-[8px] md:text-[10px] font-bold text-gray-400 truncate max-w-[80px] md:max-w-none">{order.customerPhone}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 md:p-5 font-black text-xs md:text-sm">{settings.currencySymbol}{order.total.toFixed(2)}</td>
                      <td className="p-3 md:p-5">{getStatusBadge(order.status)}</td>
                      <td className="p-3 md:p-5 text-[8px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">
                        {new Date(order.createdAt).toLocaleDateString()} <br />
                        <span className="text-[7px] md:text-[8px] opacity-70">{new Date(order.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </td>
                      <td className="p-3 md:p-5 text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="rounded-xl h-8 md:h-9 hover:bg-gray-100 font-bold text-[8px] md:text-[10px] uppercase"
                          onClick={() => setSelectedOrder(order)}
                        >
                          <Eye className="h-2.5 w-2.5 md:h-3 md:w-3 mr-1.5 md:mr-2" /> View
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Order Detail Modal */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="sm:max-w-2xl rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl">
          {selectedOrder && (
            <div className="flex flex-col">
              <div className="p-6 md:p-8 bg-gray-50 border-b flex justify-between items-center">
                <div>
                  <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight">Order Details</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{selectedOrder.id}</p>
                    {selectedOrder.paymentMethod && (
                      <span className={`text-[8px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest ${selectedOrder.paymentMethod === 'WHATSAPP' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                        {selectedOrder.paymentMethod}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {getStatusBadge(selectedOrder.status)}
                </div>
              </div>
              
              <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  {selectedOrder.paymentMethod === 'WHATSAPP' && selectedOrder.status === 'PENDING' && (
                    <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-xl">
                      <p className="text-[10px] font-black uppercase tracking-widest text-yellow-800 mb-1">⚠️ WhatsApp Order</p>
                      <p className="text-[10px] text-yellow-700 leading-relaxed">
                        Awaiting customer message verification. Change status to PROCESSING once verified.
                      </p>
                    </div>
                  )}

                  {(() => {
                    const paymentInfo = parsePaymentMethod(selectedOrder.paymentMethod);
                    if (paymentInfo.method !== 'bank') return null;
                    
                    return (
                      <div className="space-y-4 animate-in fade-in duration-200">
                        <div className={`p-4 rounded-2xl border ${paymentInfo.verified ? 'bg-emerald-50/50 border-emerald-100' : 'bg-amber-50/50 border-amber-100 animate-pulse'}`}>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[9px] font-black uppercase tracking-wider text-gray-500">Bank Transfer Details</span>
                            <span className={`text-[8px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest ${paymentInfo.verified ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                              {paymentInfo.verified ? 'Paid & Verified' : 'Awaiting Verification'}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 text-[11px] mb-3">
                            <div>
                              <span className="text-[8px] font-black uppercase text-gray-400 block leading-none">Bank Name</span>
                              <span className="font-bold text-gray-800">{paymentInfo.bankName || 'Direct Transfer'}</span>
                            </div>
                            <div>
                              <span className="text-[8px] font-black uppercase text-gray-400 block leading-none">Verification Mode</span>
                              <span className="font-bold text-gray-800">{paymentInfo.autoVerified ? '⚡ Automated OCR' : '👤 Manual Review'}</span>
                            </div>
                          </div>

                          {paymentInfo.receiptUrl && (
                            <div className="space-y-2">
                              <span className="text-[8px] font-black uppercase text-gray-400 block leading-none">Attached Receipt Screenshot</span>
                              <div 
                                className="relative aspect-video w-full max-w-[240px] bg-white rounded-xl overflow-hidden border border-gray-200 cursor-pointer shadow-sm group"
                                onClick={() => setZoomReceiptUrl(paymentInfo.receiptUrl)}
                              >
                                <img src={paymentInfo.receiptUrl} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                  <Eye className="h-5 w-5 animate-pulse" />
                                </div>
                              </div>
                              <span className="text-[9px] text-gray-400 font-bold block">Click receipt to enlarge</span>
                            </div>
                          )}

                          {!paymentInfo.verified && (
                            <Button
                              type="button"
                              className="w-full mt-3 h-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-emerald-100"
                              onClick={async () => {
                                const updatedPaymentMethod = JSON.stringify({
                                  ...paymentInfo,
                                  verified: true
                                });
                                
                                // Update Supabase if config is loaded
                                if (supabase) {
                                  await supabase.from('orders').update({
                                    status: 'PROCESSING',
                                    payment_method: updatedPaymentMethod
                                  }).eq('id', selectedOrder.id);
                                }
                                
                                // Update local ShopContext order state
                                updateOrderStatus(selectedOrder.id, 'PROCESSING');
                                
                                // Update local modal state to instantly visual refresh
                                setSelectedOrder({
                                  ...selectedOrder,
                                  status: 'PROCESSING',
                                  paymentMethod: updatedPaymentMethod
                                });
                              }}
                            >
                              <ShieldCheck className="h-4 w-4" />
                              <span>Approve & Confirm Payment</span>
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                  <div>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Customer Information</h3>
                    <div className="space-y-1">
                      <p className="font-black text-sm uppercase">{selectedOrder.customerName}</p>
                      <p className="text-xs text-gray-500">{selectedOrder.customerPhone}</p>
                      <p className="text-xs text-gray-500">{selectedOrder.customerEmail || 'No email provided'}</p>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Shipping Address</h3>
                    <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-100 italic">
                      {selectedOrder.customerAddress}
                    </p>
                  </div>
                  {selectedOrder.notes && (
                    <div>
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Delivery Note</h3>
                      <p className="text-xs text-amber-700 leading-relaxed bg-amber-50/50 p-3 rounded-xl border border-amber-100/70 font-medium">
                        {selectedOrder.notes}
                      </p>
                    </div>
                  )}
                  <div>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Update Status</h3>
                    <div className="flex flex-wrap gap-2">
                       {['PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED', 'ABANDONED'].map((s) => (
                         <Button 
                          key={s}
                          variant={selectedOrder.status === s ? 'default' : 'outline'}
                          size="sm"
                          className="rounded-lg h-8 text-[8px] font-black uppercase tracking-widest"
                          onClick={() => {
                            updateOrderStatus(selectedOrder.id, s as any);
                            setSelectedOrder({...selectedOrder, status: s});
                          }}
                         >
                           {s}
                         </Button>
                       ))}
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 flex flex-col h-full">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4 text-center">Order Summary</h3>
                  <div className="flex-1 space-y-4 overflow-y-auto max-h-[200px] mb-6 pr-2">
                    {selectedOrder.items.map((item: any) => (
                      <div key={`${item.productId}-${item.variantId}`} className="flex justify-between items-center gap-4">
                        <div className="flex-1">
                          <p className="text-[10px] font-black uppercase leading-tight line-clamp-1">{item.name}</p>
                          <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">{item.quantity} x {settings.currencySymbol}{item.price}</p>
                        </div>
                        <p className="text-[10px] font-black">{settings.currencySymbol}{(item.price * item.quantity).toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[9px] font-bold text-gray-400 uppercase">Subtotal</span>
                      <span className="text-[10px] font-bold">{settings.currencySymbol}{selectedOrder.total.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-[9px] font-bold text-gray-400 uppercase">Shipping</span>
                      <span className={settings.trustFeatures.find(f => f.id === 'feature-shipping')?.title.toLowerCase().includes('free') ? "text-[9px] font-bold text-green-600 uppercase" : "text-[9px] font-bold text-black uppercase"}>
                        {settings.trustFeatures.find(f => f.id === 'feature-shipping')?.title || 'FREE'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black uppercase tracking-tight">Total</span>
                      <span className="text-lg font-black tracking-tighter" style={{ color: settings.primaryColor }}>
                        {settings.currencySymbol}{selectedOrder.total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-6 bg-white border-t flex justify-end">
                <Button variant="outline" className="rounded-xl font-bold uppercase text-[10px] tracking-widest h-10 px-6" onClick={() => setSelectedOrder(null)}>
                  Close Details
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Lightbox Receipt Zoom Modal */}
      {zoomReceiptUrl && (
        <div 
          className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setZoomReceiptUrl(null)}
        >
          <div className="relative max-w-xl w-full bg-white rounded-[2rem] overflow-hidden p-6 animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={() => setZoomReceiptUrl(null)}
              className="absolute top-4 right-4 bg-gray-100 hover:bg-gray-200 rounded-full p-2 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4 text-black" />
            </button>
            <h4 className="font-black uppercase tracking-wider text-xs text-gray-400 mb-4">Receipt Image Zoom</h4>
            <div className="bg-gray-50 rounded-2xl overflow-hidden flex items-center justify-center max-h-[75vh]">
              <img 
                src={zoomReceiptUrl} 
                alt="Receipt Zoom" 
                className="max-w-full max-h-full object-contain" 
              />
            </div>
          </div>
        </div>
      )}

      {/* Premium Real-Time Order Toast Notification */}
      {activeToast && (
        <div className="fixed top-6 right-6 z-[9999] max-w-sm w-full bg-black/90 backdrop-blur-md text-white rounded-[2rem] p-6 shadow-2xl border border-white/10 animate-in slide-in-from-top-12 fade-in duration-300">
          <div className="flex gap-4">
            <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center shrink-0 animate-pulse shadow-lg shadow-red-500/30">
              <ShoppingBag className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-black uppercase tracking-widest text-red-500 leading-none">🚨 Real-time Order Alert</span>
                <button 
                  onClick={() => setActiveToast(null)}
                  className="text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <h5 className="font-black text-sm uppercase tracking-tight">{activeToast.customerName} placed a new order!</h5>
              <p className="text-[10px] text-gray-400 leading-relaxed font-medium">
                Total: <strong>{settings.currencySymbol}{activeToast.total.toFixed(2)}</strong> via {activeToast.paymentMethod === 'WHATSAPP' ? 'WhatsApp' : 'Website'}.
              </p>
              <Button 
                size="sm" 
                className="w-full mt-3 rounded-xl bg-white hover:bg-gray-100 text-black border-none font-bold text-[9px] uppercase tracking-wider h-8"
                onClick={() => {
                  setSelectedOrder(activeToast);
                  setActiveToast(null);
                }}
              >
                <Eye className="h-3 w-3 mr-1.5" /> View Details
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
