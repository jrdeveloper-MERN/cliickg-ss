'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/auth.service';
import { User, Customer, AuthMeta, SendOtpPayload, VerifyOtpPayload } from '../types/auth/auth.types';

interface AuthContextType {
  user: User | null;
  customer: Customer | null;
  meta: AuthMeta;
  loading: boolean;
  sendOtp: (countryCode: string, mobileNumber: string, isRegistration?: boolean, email?: string) => Promise<any>;
  verifyOtp: (params: VerifyOtpPayload) => Promise<any>;
  resendOtp: (countryCode: string, mobileNumber: string, isRegistration?: boolean) => Promise<any>;
  logout: () => Promise<void>;
  updateProfile: (profileData: Partial<Customer>) => Promise<any>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [meta, setMeta] = useState<AuthMeta>({ cartSummary: null, wishlistCount: 0, addressCount: 0, recentOrdersCount: 0 });
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }
    const token = localStorage.getItem('customer_token');
    if (!token) {
      setUser(null);
      setCustomer(null);
      setLoading(false);
      return;
    }
    try {
      const data = await authService.getMe();
      if (data && data.user) {
        setUser(data.user);
        setCustomer(data.customer || null);
        setMeta({
          cartSummary: data.cartSummary || null,
          wishlistCount: data.wishlistCount || 0,
          addressCount: data.addressCount || 0,
          recentOrdersCount: data.recentOrdersCount || 0,
        });
      } else if (data) {
        setUser((data as any).user || (data as any));
      }
    } catch (err) {
      console.error('Auth verification failed:', err);
      localStorage.removeItem('customer_token');
      setUser(null);
      setCustomer(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const sendOtp = async (countryCode: string, mobileNumber: string, isRegistration = false, email = '') => {
    return authService.sendOtp({ countryCode, mobileNumber, isRegistration, email });
  };

  const verifyOtp = async (params: VerifyOtpPayload) => {
    const res = await authService.verifyOtp(params);
    const token = res.token || res.data?.token;
    const userData = res.user || res.data?.user;
    const customerData = res.customer || res.data?.customer;

    if (res.success && token) {
      localStorage.setItem('customer_token', token);
      setUser(userData || null);
      setCustomer(customerData || null);
      await checkAuth();
    }
    return res;
  };

  const resendOtp = async (countryCode: string, mobileNumber: string, isRegistration = false) => {
    return authService.resendOtp({ countryCode, mobileNumber, isRegistration });
  };

  const updateProfile = async (profilePayload: Partial<Customer>) => {
    let targetCustId = customer?.id || customer?._id;
    if (!targetCustId) {
      const custObj = await authService.getCustomerMe();
      targetCustId = custObj?.id || custObj?._id;
    }
    if (targetCustId) {
      const updated = await authService.updateCustomerProfile(targetCustId, profilePayload);
      await checkAuth();
      return updated;
    }
  };

  const logout = async () => {
    try {
      if (typeof window !== 'undefined' && (localStorage.getItem('customer_token') || localStorage.getItem('token'))) {
        await authService.logout();
      }
    } catch (err) {
      console.warn('Backend customer logout warning:', err);
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('customer_token');
        localStorage.removeItem('token');
      }
      setUser(null);
      setCustomer(null);
      setMeta({ cartSummary: null, wishlistCount: 0, addressCount: 0, recentOrdersCount: 0 });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        customer,
        meta,
        loading,
        sendOtp,
        verifyOtp,
        resendOtp,
        logout,
        updateProfile,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
