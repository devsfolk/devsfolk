import React from 'react';
import { useShop } from '@/context/ShopContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LayoutDashboard, ShoppingBag, Users, TrendingUp, ArrowUpRight, ArrowDownRight, Plus, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

export const Overview: React.FC = () => {
  const { settings, orders } = useShop();
  const navigate = useNavigate();

  const totalRevenue = orders.reduce((acc, order) => acc + order.total, 0);
  const totalOrders = orders.length;
  const totalCustomers = new Set(
    orders.map((order) => order.customerEmail || order.customerPhone || order.customerName),
  ).size;

  const stats = [
    { name: 'Total Revenue', value: `${settings.currencySymbol}${totalRevenue.toFixed(2)}`, icon: TrendingUp, change: '+100%', trending: 'up' },
    { name: 'Orders', value: totalOrders.toString(), icon: ShoppingBag, change: '+100%', trending: 'up' },
    { name: 'Customers', value: totalCustomers.toString(), icon: Users, change: totalCustomers > 0 ? 'Live' : 'Waiting', trending: totalCustomers > 0 ? 'up' : 'down' },
    { name: 'Active Mode', value: settings.orderMode, icon: LayoutDashboard, change: 'Active', trending: 'up' },
  ];

  return (
    <div className="space-y-6 md:space-y-10">
      <div className="pb-4 md:pb-6 border-b border-gray-100">
        <h1 className="text-xl md:text-4xl font-black uppercase tracking-tight">Overview</h1>
        <p className="text-[8px] md:text-xs font-bold uppercase text-gray-400 tracking-widest opacity-70 mt-1">Welcome back, here's what's happening with {settings.shopName}.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
        {stats.map((stat) => (
          <Card key={stat.name} className="border-none shadow-sm rounded-[2rem] bg-white group hover:shadow-xl transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 p-4 md:p-8">
              <CardTitle className="text-[8px] md:text-[10px] font-black uppercase text-gray-400 tracking-widest leading-none">{stat.name}</CardTitle>
              <div className="p-1.5 md:p-2 bg-gray-50 rounded-lg md:rounded-xl group-hover:bg-black group-hover:text-white transition-colors">
                <stat.icon className="h-3 w-3 md:h-4 md:w-4" />
              </div>
            </CardHeader>
            <CardContent className="p-4 md:p-8 pt-0">
              <div className="text-2xl md:text-3xl font-black tracking-tight">{stat.value}</div>
              <div className="text-[8px] md:text-[10px] flex items-center mt-2">
                {stat.trending === 'up' ? (
                  <div className="flex items-center bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-black">
                    <ArrowUpRight className="h-2.5 w-2.5 mr-1" />
                    {stat.change}
                  </div>
                ) : (
                  <div className="flex items-center bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-black">
                    <ArrowDownRight className="h-2.5 w-2.5 mr-1" />
                    {stat.change}
                  </div>
                )}
                <span className="text-gray-400 ml-2 font-bold uppercase tracking-widest opacity-60">vs last month</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 border-none shadow-sm rounded-[2rem] md:rounded-[2.5rem] bg-white overflow-hidden">
          <CardHeader className="p-5 md:p-8 pb-3">
            <CardTitle className="text-lg md:text-xl font-black uppercase tracking-tight">Recent Orders</CardTitle>
            <CardDescription className="text-[8px] md:text-[10px] font-bold uppercase tracking-widest text-gray-400">Real-time update of your latest customer activity.</CardDescription>
          </CardHeader>
          <CardContent className="p-5 md:p-8 pt-0">
            <div className="space-y-2 md:space-y-4">
              {orders.slice(0, 5).map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 md:p-5 border border-gray-50 rounded-2xl md:rounded-3xl hover:bg-gray-50/50 transition-all hover:scale-[1.01]">
                  <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
                    <div className="w-8 h-8 md:w-12 md:h-12 bg-black text-white rounded-xl md:rounded-2xl flex items-center justify-center font-black text-xs md:text-sm shrink-0">
                      {order.customerName.charAt(0)}
                    </div>
                    <div className="truncate">
                      <p className="text-xs md:text-sm font-black uppercase tracking-tight truncate">{order.customerName}</p>
                      <p className="text-[7px] md:text-[10px] font-bold text-gray-400 tracking-tight truncate max-w-[100px] md:max-w-none">{order.customerEmail}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs md:text-sm font-black">{settings.currencySymbol}{order.total.toFixed(2)}</p>
                    <Badge variant="secondary" className="text-[6px] md:text-[8px] font-black uppercase tracking-widest mt-0.5 bg-gray-100/50 text-gray-500 border-none px-1.5 md:px-2">{order.status}</Badge>
                  </div>
                </div>
              ))}
              {orders.length === 0 && (
                <div className="text-center py-20 text-gray-200">
                  <ShoppingBag className="h-16 w-16 mx-auto mb-4 opacity-20" />
                  <p className="font-black uppercase tracking-widest text-xs opacity-50">No orders yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm rounded-[2.5rem] bg-white">
          <CardHeader className="p-8 pb-4">
            <CardTitle className="text-xl font-black uppercase tracking-tight">Quick Actions</CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Shortcuts to common shop operations.</CardDescription>
          </CardHeader>
          <CardContent className="p-8 pt-0 space-y-3">
            <Button className="w-full h-12 rounded-2xl justify-start font-black text-[10px] uppercase tracking-widest hover:translate-x-2 transition-transform" variant="outline" onClick={() => navigate('/dashboard/products')}>
              <Plus className="h-4 w-4 mr-3" /> New Product
            </Button>
            <Button className="w-full h-12 rounded-2xl justify-start font-black text-[10px] uppercase tracking-widest hover:translate-x-2 transition-transform" variant="outline" onClick={() => navigate('/dashboard/design')}>
              <Palette className="h-4 w-4 mr-3" /> Edit Design
            </Button>
            <Button className="w-full h-12 rounded-2xl justify-start font-black text-[10px] uppercase tracking-widest hover:translate-x-2 transition-transform" variant="outline" onClick={() => navigate('/dashboard/orders')}>
              <ShoppingBag className="h-4 w-4 mr-3" /> Manage Orders
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
