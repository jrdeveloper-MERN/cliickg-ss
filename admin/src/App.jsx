import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ErrorState from './components/Common/ErrorState';

import Layout from './components/Layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

import MainCategories from './pages/Catalog/MainCategories';
import Categories from './pages/Catalog/Categories';
import SubCategories from './pages/Catalog/SubCategories';

import AttributeCaptions from './pages/Attributes/AttributeCaptions';
import AttributeMapping from './pages/Attributes/AttributeMapping';

import ProductList from './pages/Products/ProductList';
import ProductForm from './pages/Products/ProductForm';

import OrderList from './pages/Orders/OrderList';
import CustomerList from './pages/Customers/CustomerList';
import SellerList from './pages/Sellers/SellerList';
import PromoList from './pages/PromoCodes/PromoList';

import Banners from './pages/CMS/Banners';
import Certificates from './pages/CMS/Certificates';
import FAQs from './pages/CMS/FAQs';
import FeaturedSections from './pages/CMS/FeaturedSections';
import TodaysDealsBanner from './pages/CMS/TodaysDealsBanner';
import TodaysDeals from './pages/CMS/TodaysDeals';
import ScrollHeading from './pages/CMS/ScrollHeading';
import ContactUs from './pages/CMS/ContactUs';


import PaymentErrors from './pages/Orders/PaymentErrors';
import AuditLogs from './pages/Orders/AuditLogs';
import StorePromises from './pages/Settings/StorePromises';
import PolicyEditorPage from './pages/Settings/PolicyEditorPage';

// Logistics & Shipping Page Imports
import ShippingDashboard from './pages/Shipping/Dashboard';
import ShippingZones from './pages/Shipping/Zones';
import ShippingCharges from './pages/Shipping/Charges';
import ShippingCouriers from './pages/Shipping/Couriers';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-admin-bg text-admin-text-muted text-sm">
        Authenticating admin session...
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

function App() {
  const { serverError, setServerError } = useAuth();

  useEffect(() => {
    const handleServerError = (e) => {
      setServerError(e.detail || 'Backend server is offline or returned 500 (port 5001).');
    };
    window.addEventListener('app:server-error', handleServerError);
    return () => window.removeEventListener('app:server-error', handleServerError);
  }, [setServerError]);

  if (serverError) {
    return (
      <ErrorState
        statusCode={500}
        title="500 - Internal Server Error"
        message={serverError}
        onRetry={() => {
          setServerError(null);
          window.location.reload();
        }}
        retryText="Retry Connection"
        showDashboardButton={false}
        fullScreen={true}
      />
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Protected Admin Dashboard Layout */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />

        {/* Catalog */}
        <Route path="catalog/main-categories" element={<MainCategories />} />
        <Route path="catalog/categories" element={<Categories />} />
        <Route path="catalog/sub-categories" element={<SubCategories />} />

        {/* Product Attributes */}
        <Route path="attributes/captions" element={<AttributeCaptions />} />
        <Route path="attributes/mappings" element={<AttributeMapping />} />

        {/* Products */}
        <Route path="products" element={<ProductList />} />
        <Route path="products/add" element={<ProductForm />} />
        <Route path="products/edit/:id" element={<ProductForm />} />

        {/* Orders & Customers */}
        <Route path="orders" element={<OrderList />} />
        <Route path="orders/payment-errors" element={<PaymentErrors />} />
        <Route path="orders/audit-logs" element={<AuditLogs />} />
        <Route path="audit-logs" element={<AuditLogs />} />
        <Route path="customers" element={<CustomerList />} />
        <Route path="sellers" element={<SellerList />} />
        <Route path="promos" element={<PromoList />} />

        {/* Content/Design Management */}
        <Route path="cms/banners" element={<Banners />} />
        <Route path="cms/certificates" element={<Certificates />} />
        <Route path="cms/faqs" element={<FAQs />} />
        <Route path="cms/featured" element={<FeaturedSections />} />
        <Route path="cms/todays-deals-banner" element={<TodaysDealsBanner />} />
        <Route path="cms/todays-deals" element={<TodaysDeals />} />
        <Route path="cms/scroll-heading" element={<ScrollHeading />} />
        <Route path="cms/contact" element={<ContactUs />} />

        {/* System Settings */}
        <Route path="settings/about-us" element={<PolicyEditorPage type="ABOUT" />} />
        <Route path="settings/store-promises" element={<StorePromises />} />
        <Route path="settings/delivery-policy" element={<PolicyEditorPage type="DELIVERY" />} />
        <Route path="settings/privacy-policy" element={<PolicyEditorPage type="PRIVACY" />} />
        <Route path="settings/terms-and-conditions" element={<PolicyEditorPage type="TERMS" />} />
        <Route path="settings/return-and-refund-policy" element={<PolicyEditorPage type="RETURN_REFUND" />} />

        {/* System Settings Alias Routes */}
        <Route path="system-settings/about-us" element={<PolicyEditorPage type="ABOUT" />} />
        <Route path="system-settings/delivery-policy" element={<PolicyEditorPage type="DELIVERY" />} />
        <Route path="system-settings/privacy-policy" element={<PolicyEditorPage type="PRIVACY" />} />
        <Route path="system-settings/terms-and-conditions" element={<PolicyEditorPage type="TERMS" />} />
        <Route path="system-settings/return-and-refund-policy" element={<PolicyEditorPage type="RETURN_REFUND" />} />

        {/* Logistics & Shipping routes */}
        <Route path="shipping" element={<Navigate to="/shipping/dashboard" replace />} />
        <Route path="shipping/dashboard" element={<ShippingDashboard />} />
        <Route path="shipping/packaging" element={<Navigate to="/shipping/charges" replace />} />
        <Route path="shipping/zones" element={<ShippingZones />} />
        <Route path="shipping/charges" element={<ShippingCharges />} />
        <Route path="shipping/couriers" element={<ShippingCouriers />} />
      </Route>

      {/* 404 Page Not Found - Occupies Full Viewport VH */}
      <Route
        path="*"
        element={
          <ErrorState
            statusCode={404}
            title="404 - Page Not Found"
            message="The requested administrative page or resource could not be found."
            showDashboardButton={true}
            fullScreen={true}
          />
        }
      />
    </Routes>
  );
}

export default App;
