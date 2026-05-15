import React from 'react';
import { useShop } from '@/context/ShopContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShoppingBag, Eye, CheckCircle, XCircle, Clock, ChevronLeft } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export const OrdersPage: React.FC = () => {
  const { orders, settings, updateOrderStatus, refreshOrders } = useShop();
  const [selectedOrder, setSelectedOrder] = React.useState<any>(null);

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
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-3 md:p-5 font-mono text-[8px] md:text-[10px] opacity-40">{order.id}</td>
                    <td className="p-3 md:p-5">
                      <div className="font-black text-xs md:text-sm uppercase tracking-tight truncate max-w-[80px] md:max-w-none">{order.customerName}</div>
                      <div className="text-[8px] md:text-[10px] font-bold text-gray-400 truncate max-w-[80px] md:max-w-none">{order.customerPhone}</div>
                    </td>
                    <td className="p-3 md:p-5 font-black text-xs md:text-sm">{settings.currencySymbol}{order.total.toFixed(2)}</td>
                    <td className="p-3 md:p-5">{getStatusBadge(order.status)}</td>
                    <td className="p-3 md:p-5 text-[8px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">
                      {new Date(order.createdAt).toLocaleDateString()}
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
                ))
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
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{selectedOrder.id}</p>
                </div>
                <div className="flex items-center gap-3">
                  {getStatusBadge(selectedOrder.status)}
                </div>
              </div>
              
              <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
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
                  <div>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Update Status</h3>
                    <div className="flex flex-wrap gap-2">
                       {['PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED'].map((s) => (
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
                      <span className="text-[9px] font-bold text-green-600 uppercase">FREE</span>
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
    </div>
  );
};
