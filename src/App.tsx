import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ShopProvider } from '@/context/ShopContext';
import { AnalyticsTracker } from '@/components/analytics/AnalyticsTracker';

const StoreLayout = lazy(() =>
  import('@/components/layout/StoreLayout').then((module) => ({ default: module.StoreLayout })),
);
const DashboardLayout = lazy(() =>
  import('@/components/layout/DashboardLayout').then((module) => ({ default: module.DashboardLayout })),
);

const Home = lazy(() => import('@/pages/storefront/Home').then((module) => ({ default: module.Home })));
const CategoryPage = lazy(() =>
  import('@/pages/storefront/CategoryPage').then((module) => ({ default: module.CategoryPage })),
);
const ProductPage = lazy(() =>
  import('@/pages/storefront/ProductPage').then((module) => ({ default: module.ProductPage })),
);
const CartPage = lazy(() => import('@/pages/storefront/CartPage').then((module) => ({ default: module.CartPage })));
const CheckoutPage = lazy(() =>
  import('@/pages/storefront/CheckoutPage').then((module) => ({ default: module.CheckoutPage })),
);
const SalesPage = lazy(() => import('@/pages/storefront/SalesPage').then((module) => ({ default: module.SalesPage })));
const OrderTrackingPage = lazy(() =>
  import('@/pages/storefront/OrderTrackingPage').then((module) => ({ default: module.OrderTrackingPage })),
);
const WishlistPage = lazy(() =>
  import('@/pages/storefront/WishlistPage').then((module) => ({ default: module.WishlistPage })),
);

const Overview = lazy(() => import('@/pages/dashboard/Overview').then((module) => ({ default: module.Overview })));
const ProductManagement = lazy(() =>
  import('@/pages/dashboard/ProductManagement').then((module) => ({ default: module.ProductManagement })),
);
const CategoryManagement = lazy(() =>
  import('@/pages/dashboard/CategoryManagement').then((module) => ({ default: module.CategoryManagement })),
);
const GeneralSettings = lazy(() =>
  import('@/pages/dashboard/GeneralSettings').then((module) => ({ default: module.GeneralSettings })),
);
const DesignSettings = lazy(() =>
  import('@/pages/dashboard/DesignSettings').then((module) => ({ default: module.DesignSettings })),
);
const OrdersPage = lazy(() => import('@/pages/dashboard/OrdersPage').then((module) => ({ default: module.OrdersPage })));
const LoginPage = lazy(() => import('@/pages/dashboard/LoginPage').then((module) => ({ default: module.LoginPage })));

const RouteFallback = () => <div className="min-h-screen bg-white" />;

export default function App() {
  return (
    <ShopProvider>
      <BrowserRouter>
        <AnalyticsTracker />
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            {/* Storefront Routes */}
            <Route path="/" element={<StoreLayout><Home /></StoreLayout>} />
            <Route path="/categories" element={<StoreLayout><CategoryPage /></StoreLayout>} />
            <Route path="/category/:slug" element={<StoreLayout><CategoryPage /></StoreLayout>} />
            <Route path="/product/:slug" element={<StoreLayout><ProductPage /></StoreLayout>} />
            <Route path="/sales" element={<StoreLayout><SalesPage /></StoreLayout>} />
            <Route path="/cart" element={<StoreLayout><CartPage /></StoreLayout>} />
            <Route path="/checkout" element={<StoreLayout><CheckoutPage /></StoreLayout>} />
            <Route path="/track-order" element={<StoreLayout><OrderTrackingPage /></StoreLayout>} />
            <Route path="/wishlist" element={<StoreLayout><WishlistPage /></StoreLayout>} />

            {/* Dashboard Routes */}
            <Route path="/dashboard/login" element={<LoginPage />} />
            <Route path="/dashboard" element={<DashboardLayout><Overview /></DashboardLayout>} />
            <Route path="/dashboard/products" element={<DashboardLayout><ProductManagement /></DashboardLayout>} />
            <Route path="/dashboard/categories" element={<DashboardLayout><CategoryManagement /></DashboardLayout>} />
            <Route path="/dashboard/orders" element={<DashboardLayout><OrdersPage /></DashboardLayout>} />
            <Route path="/dashboard/design" element={<DashboardLayout><DesignSettings /></DashboardLayout>} />
            <Route path="/dashboard/settings" element={<DashboardLayout><GeneralSettings /></DashboardLayout>} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ShopProvider>
  );
}
