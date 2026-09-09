'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import safeParse from '../utils/safe-parse.utils';
import { Product } from '../types/products/product.types';

interface WishlistContextType {
  wishlist: Product[];
  wishlistCount: number;
  toggleWishlist: (product: Product) => void;
  isInWishlist: (id?: string) => boolean;
  toast: { message: string; type: string } | null;
  showToast: (message: string, type?: string) => void;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const [wishlist, setWishlist] = useState<Product[]>([]);
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);

  const showToast = (message: string, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3200);
  };

  // Safe SSR post-hydration client mount loading
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('customer_token');
    if (token) {
      const saved = localStorage.getItem('cliickg_wishlist') || localStorage.getItem('aishva_wishlist');
      setWishlist(safeParse<Product[]>(saved, [], 'cliickg_wishlist'));
    } else {
      const guest = localStorage.getItem('guest_wishlist');
      setWishlist(safeParse<Product[]>(guest, [], 'guest_wishlist'));
    }
  }, []);

  // Sync wishlist to local storage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('customer_token');
    if (user || token) {
      localStorage.setItem('cliickg_wishlist', JSON.stringify(wishlist));
    } else if (!authLoading) {
      localStorage.setItem('guest_wishlist', JSON.stringify(wishlist));
    }
  }, [wishlist, user, authLoading]);

  // Guest wishlist merge on login
  useEffect(() => {
    if (authLoading || typeof window === 'undefined') return;

    if (user) {
      try {
        const guestRaw = localStorage.getItem('guest_wishlist');
        const guestItems = safeParse<Product[]>(guestRaw, [], 'guest_wishlist');
        if (guestItems && guestItems.length > 0) {
          setWishlist((prev) => {
            const merged = [...prev];
            guestItems.forEach((gItem) => {
              const gId = gItem._id || gItem.id;
              const exists = merged.some((item) => String(item._id || item.id) === String(gId));
              if (!exists) merged.push(gItem);
            });
            return merged;
          });
          localStorage.removeItem('guest_wishlist');
          showToast('Guest wishlist merged successfully!');
        }
      } catch (err) {
        console.error('Error merging guest wishlist:', err);
      }
    } else {
      const token = localStorage.getItem('customer_token');
      if (!token) {
        const guestRaw = localStorage.getItem('guest_wishlist');
        setWishlist(safeParse<Product[]>(guestRaw, [], 'guest_wishlist'));
        localStorage.removeItem('cliickg_wishlist');
        localStorage.removeItem('aishva_wishlist');
      }
    }
  }, [user, authLoading]);

  const toggleWishlist = (product: Product) => {
    const prodId = product._id || product.id;
    if (!product || !prodId) return;

    if (!user) {
      showToast('Please log in to continue.', 'info');
      if (typeof window !== 'undefined') {
        setTimeout(() => {
          const currentPath = window.location.pathname + window.location.search;
          window.location.href = `/login?from=${encodeURIComponent(currentPath)}`;
        }, 600);
      }
      return;
    }

    setWishlist((prev) => {
      const exists = prev.some((item) => String(item._id || item.id) === String(prodId));
      if (exists) {
        showToast(`Removed "${product.name || 'Item'}" from your Wishlist`, 'info');
        return prev.filter((item) => String(item._id || item.id) !== String(prodId));
      } else {
        showToast(`Added "${product.name || 'Item'}" to your Wishlist!`);
        return [...prev, product];
      }
    });
  };

  const isInWishlist = (id?: string) => {
    if (!id) return false;
    return wishlist.some((item) => String(item._id || item.id) === String(id));
  };

  const wishlistCount = wishlist.length;

  return (
    <WishlistContext.Provider
      value={{
        wishlist,
        wishlistCount,
        toggleWishlist,
        isInWishlist,
        toast,
        showToast,
      }}
    >
      {children}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '24px',
            backgroundColor: toast.type === 'info' ? '#334155' : 'var(--color-primary)',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.88rem',
            fontWeight: '600',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <span>{toast.message}</span>
        </div>
      )}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};

export default WishlistContext;
