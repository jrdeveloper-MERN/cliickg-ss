'use client';

import React from 'react';
import { AuthProvider } from '../contexts/AuthContext';
import { CMSProvider } from '../contexts/CMSContext';
import { WishlistProvider } from '../contexts/WishlistContext';
import { CartProvider } from '../contexts/CartContext';

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AuthProvider>
      <CMSProvider>
        <WishlistProvider>
          <CartProvider>{children}</CartProvider>
        </WishlistProvider>
      </CMSProvider>
    </AuthProvider>
  );
};

export default AppProviders;
