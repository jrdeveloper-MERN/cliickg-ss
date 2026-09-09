'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import cartService from '../services/cart.service';
import promotionService from '../services/promotion.service';
import safeParse from '../utils/safe-parse.utils';
import { CartItem } from '../types/cart/cart.types';

export const getAvailableStock = (itemOrProd: any): number => {
  if (!itemOrProd) return 0;

  // 1. Direct variant stock property
  const v = itemOrProd.variant || itemOrProd.currentVariant;
  if (v && v !== itemOrProd) {
    if (v.stock !== undefined && v.stock !== null && v.stock !== '') {
      return Number(v.stock);
    }
    if (v.stockQuantity !== undefined && v.stockQuantity !== null && v.stockQuantity !== '') {
      return Number(v.stockQuantity);
    }
  }

  // 2. Direct stock property on item
  if (typeof itemOrProd.stock === 'number' && !itemOrProd.productDetails && !itemOrProd.variants) {
    return Number(itemOrProd.stock);
  }

  if (itemOrProd.product) {
    return getAvailableStock(itemOrProd.product);
  }

  // 3. Fallback product root level stock
  if (itemOrProd.stock !== undefined && itemOrProd.stock !== null && itemOrProd.stock !== '') {
    return Number(itemOrProd.stock);
  }
  if (itemOrProd.stockQuantity !== undefined && itemOrProd.stockQuantity !== null) {
    return Number(itemOrProd.stockQuantity);
  }

  return 0;
};

// Normalize and strip out heavy nested objects (variants[], certificates, descriptions, making charges, etc.)
export const normalizeCartItem = (rawItem: any): CartItem => {
  if (!rawItem) return {} as CartItem;

  const prodId = String(rawItem.productId || rawItem._id || rawItem.id || '');
  const varId = rawItem.variantId || rawItem.variantKey || rawItem.variant?.id || rawItem.variant?._id || rawItem.sku || null;
  const selectedSize = rawItem.selectedSize || rawItem.selectedAttributes?.selectedSize || null;
  
  const effectiveVariantKey = String(
    rawItem.variantKey || varId || selectedSize || 'default'
  );

  const stock = getAvailableStock(rawItem);
  const price = Number(rawItem.price || rawItem.sellingPrice || rawItem.serverCalculatedPrice || 0);
  const sellingPrice = Number(rawItem.sellingPrice || rawItem.price || rawItem.serverCalculatedPrice || 0);
  const mrp = Number(rawItem.mrp || rawItem.price || sellingPrice);

  const image = rawItem.image || rawItem.productImage || rawItem.product?.image || (Array.isArray(rawItem.product?.images) ? rawItem.product.images[0] : '') || '';
  const name = rawItem.name || rawItem.product?.name || 'Product';

  return {
    id: prodId,
    _id: prodId,
    productId: prodId,
    variantId: varId,
    variantKey: effectiveVariantKey,
    name,
    image,
    quantity: Math.max(1, Number(rawItem.quantity || 1)),
    stock,
    selectedSize,
    sku: rawItem.sku || rawItem.variant?.sku || '',
    price,
    sellingPrice,
    mrp,
    serverCalculatedPrice: Number(rawItem.serverCalculatedPrice || sellingPrice),
  };
};

export const getItemKey = (item: any): string => {
  const prodId = String(item.productId || item._id || item.id || '');
  const varKey = String(
    item.variantKey ||
    item.variantId ||
    item.sku ||
    item.variant?.id ||
    item.variant?._id ||
    item.selectedSize ||
    'default'
  );
  return `${prodId}_${varKey}`;
};

// Deduplicate and normalize cart items to minimal state
export const deduplicateCartItems = (items: any[]): CartItem[] => {
  if (!Array.isArray(items)) return [];
  const map = new Map<string, CartItem>();

  items.forEach((raw) => {
    if (!raw) return;
    const item = normalizeCartItem(raw);
    const key = getItemKey(item);

    if (map.has(key)) {
      const existing = map.get(key)!;
      const maxStock = typeof item.stock === 'number' ? item.stock : 9999;
      const mergedQty = Math.min((existing.quantity || 1) + (item.quantity || 1), maxStock > 0 ? maxStock : 1);
      map.set(key, { ...existing, quantity: mergedQty });
    } else {
      const maxStock = typeof item.stock === 'number' ? item.stock : 9999;
      const cappedQty = maxStock > 0 ? Math.min(item.quantity || 1, maxStock) : (item.quantity || 1);
      map.set(key, { ...item, quantity: cappedQty });
    }
  });

  return Array.from(map.values());
};

interface CartContextType {
  cart: CartItem[];
  cartLoading: boolean;
  isCartLoaded: boolean;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  appliedPromoCode: string;
  promoDiscount: number;
  promoError: string;
  promoSuccess: string;
  promoTotalDetails: any;
  availablePromos: any[];
  toast: { message: string; type: string } | null;
  showToast: (message: string, type?: string) => void;
  addToCart: (product: any, quantity?: number, selectedSize?: string | null, purity?: string | null, variantKey?: string) => void;
  removeFromCart: (target: number | string, variantKey?: string) => void;
  isInCart: (productId: string, variantKey?: string) => boolean;
  updateQuantity: (index: number, newQty: number) => void;
  clearCart: () => Promise<void>;
  validatePromo: (code: string) => Promise<void>;
  clearPromo: () => void;
  cartCount: number;
  cartTotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartLoading, setCartLoading] = useState(true);
  const [isCartLoaded, setIsCartLoaded] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [appliedPromoCode, setAppliedPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoError, setPromoError] = useState('');
  const [promoSuccess, setPromoSuccess] = useState('');
  const [promoTotalDetails, setPromoTotalDetails] = useState<any>(null);
  const [availablePromos, setAvailablePromos] = useState<any[]>([]);
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);

  const syncVersionRef = useRef(0);
  const syncTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((message: string, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3200);
  }, []);

  // Debounced API sync with immediate minimal localStorage persistence and race-condition counter
  const debouncedSync = useCallback((targetItems: CartItem[]) => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);

    const minimalItems = deduplicateCartItems(targetItems);

    // 1. Save normalized 200-byte minimal payload to localStorage immediately (takes < 0.01ms)
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('customer_token');
      if (user || token) {
        localStorage.setItem('cliickg_cart', JSON.stringify(minimalItems));
      } else {
        localStorage.setItem('guest_cart', JSON.stringify(minimalItems));
      }
    }

    // 2. Debounce HTTP backend API sync (300ms) to batch rapid click streams
    syncTimerRef.current = setTimeout(async () => {
      if (typeof window === 'undefined') return;
      const token = localStorage.getItem('customer_token');
      if (!token) return;

      const currentVersion = ++syncVersionRef.current;
      try {
        const backendItems = await cartService.syncCart(minimalItems);
        // Race condition guard: ignore response if a newer request was sent
        if (currentVersion === syncVersionRef.current) {
          setCart(deduplicateCartItems(backendItems));
        }
      } catch (err) {
        console.error('Debounced cart sync failed:', err);
      }
    }, 300);
  }, [user]);

  // Initial SSR mount load with auto-migration of old heavy state
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('customer_token');
    if (token) {
      const saved = localStorage.getItem('cliickg_cart') || localStorage.getItem('aishva_cart');
      const parsed = safeParse<any[]>(saved, [], 'cliickg_cart');
      setCart(deduplicateCartItems(parsed));
    } else {
      const guest = localStorage.getItem('guest_cart');
      const parsed = safeParse<any[]>(guest, [], 'guest_cart');
      setCart(deduplicateCartItems(parsed));
    }
  }, []);

  const loadBackendCart = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('customer_token');
    if (!token) {
      setCartLoading(false);
      setIsCartLoaded(true);
      return;
    }
    setCartLoading(true);
    try {
      const backendItems = await cartService.getCart();
      setCart(deduplicateCartItems(backendItems));
    } catch (err) {
      console.error('Failed to load backend cart:', err);
    } finally {
      setCartLoading(false);
      setIsCartLoaded(true);
    }
  }, []);

  const mergeGuestCart = useCallback(async (guestItems: CartItem[]) => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('customer_token');
    if (!token) {
      setCartLoading(false);
      setIsCartLoaded(true);
      return;
    }
    setCartLoading(true);
    try {
      const backendCart = await cartService.getCart();
      if (guestItems && guestItems.length > 0) {
        const merged = deduplicateCartItems([...backendCart, ...guestItems]);
        localStorage.removeItem('guest_cart');
        await cartService.syncCart(merged);
        setCart(merged);
        showToast('Guest cart merged successfully!');
      } else {
        setCart(deduplicateCartItems(backendCart));
      }
    } catch (err) {
      console.error('Failed to merge guest cart:', err);
    } finally {
      setCartLoading(false);
      setIsCartLoaded(true);
    }
  }, [showToast]);

  useEffect(() => {
    if (authLoading || typeof window === 'undefined') return;

    if (user) {
      const guestRaw = localStorage.getItem('guest_cart');
      const guestItems = safeParse<any[]>(guestRaw, [], 'guest_cart');
      if (guestItems && guestItems.length > 0) {
        mergeGuestCart(guestItems);
      } else {
        loadBackendCart();
      }
    } else {
      const token = localStorage.getItem('customer_token');
      if (!token) {
        const guestRaw = localStorage.getItem('guest_cart');
        setCart(deduplicateCartItems(safeParse<any[]>(guestRaw, [], 'guest_cart')));
        setAppliedPromoCode('');
        setPromoDiscount(0);
        setPromoSuccess('');
        setPromoError('');
        setPromoTotalDetails(null);
        localStorage.removeItem('cliickg_cart');
        localStorage.removeItem('aishva_cart');
        setCartLoading(false);
        setIsCartLoaded(true);
      } else {
        loadBackendCart();
      }
    }
  }, [user, authLoading, loadBackendCart, mergeGuestCart]);

  const addToCart = useCallback((product: any, quantity = 1, selectedSize: string | null = null, purity: string | null = null, variantKey?: string) => {
    if (!product) return;

    const availableStock = getAvailableStock(product);
    if (availableStock <= 0 || product.inStock === false || product.status === 'Inactive' || product.variant?.status === 'Inactive') {
      showToast('Sorry, this variant is currently out of stock.', 'error');
      return;
    }

    const effectivePrice = Number(product.sellingPrice || product.price || product.variant?.price || product.currentVariant?.price || 0);
    if (effectivePrice <= 0) {
      showToast('This product lacks valid pricing configuration and cannot be added to cart.', 'error');
      return;
    }

    const itemToAdd = normalizeCartItem({
      ...product,
      quantity,
      selectedSize: selectedSize || product.selectedSize || null,
      purity: purity || product.purity || null,
      variantKey: variantKey || product.variantKey || null,
    });

    setCart((prev) => {
      const currentList = deduplicateCartItems(prev);
      const targetKey = getItemKey(itemToAdd);
      const existingIdx = currentList.findIndex((item) => getItemKey(item) === targetKey);

      let updated: CartItem[];
      if (existingIdx > -1) {
        updated = [...currentList];
        const existingQty = updated[existingIdx].quantity || 1;

        if (availableStock > 0 && existingQty >= availableStock) {
          showToast(`Quantity already at maximum available stock (${availableStock})`, 'info');
          return currentList;
        }

        const newTotalQty = existingQty + quantity;
        if (availableStock > 0 && newTotalQty > availableStock) {
          updated[existingIdx] = { ...updated[existingIdx], quantity: availableStock };
          showToast(`Quantity set to maximum available stock (${availableStock})`, 'info');
        } else {
          updated[existingIdx] = { ...updated[existingIdx], quantity: newTotalQty };
          showToast(`Updated quantity of "${product.name || 'Item'}" in cart!`);
        }
      } else {
        updated = [...currentList, itemToAdd];
        showToast(`Added "${product.name || 'Item'}" to cart!`);
      }

      const cleanList = deduplicateCartItems(updated);
      debouncedSync(cleanList);
      return cleanList;
    });

    setIsCartOpen(true);
  }, [showToast, debouncedSync]);

  const removeFromCart = useCallback((target: number | string, variantKey?: string) => {
    setCart((prev) => {
      let updated: CartItem[];
      if (typeof target === 'number') {
        updated = prev.filter((_, i) => i !== target);
      } else {
        updated = prev.filter((item) => {
          const idMatch = String(item.productId || item.id || item._id) === String(target);
          if (!idMatch) return true;
          if (variantKey && item.variantKey) {
            return item.variantKey !== variantKey;
          }
          return false;
        });
      }
      const cleanList = deduplicateCartItems(updated);
      debouncedSync(cleanList);
      return cleanList;
    });
    showToast('Removed item from cart', 'info');
  }, [showToast, debouncedSync]);

  const isInCart = useCallback((productId: string, variantKey?: string) => {
    if (!Array.isArray(cart) || !productId) return false;
    return cart.some((item) => {
      const idMatch = String(item.productId || item.id || item._id) === String(productId);
      if (!idMatch) return false;
      if (variantKey && item.variantKey) {
        return item.variantKey === variantKey;
      }
      return true;
    });
  }, [cart]);

  // Fast, cheap quantity update for + / - buttons
  const updateQuantity = useCallback((index: number, newQty: number) => {
    // Quantity minimum is 1; explicit item removal must be done via removeFromCart
    const requestedQty = Math.max(1, Math.floor(Number(newQty) || 1));

    setCart((prev) => {
      if (!prev[index]) return prev;
      const targetItem = prev[index];
      const availableStock = typeof targetItem.stock === 'number' ? targetItem.stock : 9999;
      const finalQty = availableStock > 0 && requestedQty > availableStock ? availableStock : requestedQty;

      if (finalQty === targetItem.quantity) return prev;

      if (availableStock > 0 && requestedQty > availableStock) {
        showToast(`Maximum available stock is ${availableStock}`, 'info');
      }

      // Fast shallow array update: ONLY recreate reference for modified item!
      const updated = [...prev];
      updated[index] = { ...targetItem, quantity: finalQty };

      debouncedSync(updated);
      return updated;
    });
  }, [showToast, debouncedSync]);

  const clearCart = useCallback(async () => {
    setCart([]);
    setAppliedPromoCode('');
    setPromoDiscount(0);
    setPromoSuccess('');
    setPromoError('');
    setPromoTotalDetails(null);
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('customer_token');
      if (token) {
        await cartService.syncCart([]);
      } else {
        localStorage.removeItem('guest_cart');
      }
    }
  }, []);

  const justValidatedRef = useRef(false);

  const validatePromo = useCallback(async (code: string) => {
    const cleanCode = String(code || '').trim().toUpperCase();
    if (!cleanCode) {
      setAppliedPromoCode('');
      setPromoDiscount(0);
      setPromoSuccess('');
      setPromoError('');
      setPromoTotalDetails(null);
      return;
    }
    const currentSubtotal = cart.reduce((total, item) => total + (item.sellingPrice || item.price || 0) * (item.quantity || 1), 0);
    const res = await promotionService.validatePromoCode({
      code: cleanCode,
      promoCode: cleanCode,
      subtotal: currentSubtotal,
      cartItems: cart,
      userId: user?.id || user?._id,
      customerInfo: {
        email: user?.email,
        phone: user?.phone || user?.mobileNumber,
        userId: user?.id || user?._id,
      },
    });

    if (res.success || res.valid) {
      const discount = Number(res.discountAmount || res.discount || 0);
      justValidatedRef.current = true;
      setAppliedPromoCode(cleanCode);
      setPromoDiscount(discount);
      setPromoTotalDetails(res);
      setPromoSuccess(res.message || `Promo '${cleanCode}' Applied Successfully`);
      setPromoError('');
      showToast(`Promo Code '${cleanCode}' applied! Saved ₹${discount.toLocaleString('en-IN')}`, 'success');
    } else {
      setPromoError(res.message || 'Failed to apply promo code');
      setPromoSuccess('');
      setPromoDiscount(0);
      setPromoTotalDetails(null);
      showToast(res.message || 'Failed to apply promo code', 'error');
    }
  }, [cart, user, showToast]);

  const clearPromo = useCallback(() => {
    setAppliedPromoCode('');
    setPromoDiscount(0);
    setPromoSuccess('');
    setPromoError('');
    setPromoTotalDetails(null);
  }, []);

  // SPEC-10: Debounced (400ms) auto-revalidation effect for applied promo code when cart items change
  const prevCartRef = useRef(cart);
  const revalidateTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!appliedPromoCode) return;

    // Prevent immediate duplicate validation right after manual APPLY click
    if (justValidatedRef.current) {
      justValidatedRef.current = false;
      prevCartRef.current = cart;
      return;
    }

    if (prevCartRef.current === cart) return;
    prevCartRef.current = cart;

    if (cart.length === 0) {
      clearPromo();
      return;
    }

    if (revalidateTimerRef.current) {
      clearTimeout(revalidateTimerRef.current);
    }

    revalidateTimerRef.current = setTimeout(() => {
      const currentSubtotal = cart.reduce((total, item) => total + (item.sellingPrice || item.price || 0) * (item.quantity || 1), 0);
      promotionService.validatePromoCode({
        code: appliedPromoCode,
        promoCode: appliedPromoCode,
        subtotal: currentSubtotal,
        cartItems: cart,
        userId: user?.id || user?._id,
        customerInfo: {
          email: user?.email,
          phone: user?.phone || user?.mobileNumber,
          userId: user?.id || user?._id,
        },
      }).then((res) => {
        if (res.success || res.valid) {
          const discount = Number(res.discountAmount || res.discount || 0);
          setPromoDiscount(discount);
          setPromoTotalDetails(res);
        } else {
          clearPromo();
          showToast(`Promo '${appliedPromoCode}' removed: ${res.message || 'Cart no longer meets criteria.'}`, 'info');
        }
      }).catch(() => {
        clearPromo();
      });
    }, 400);

    return () => {
      if (revalidateTimerRef.current) {
        clearTimeout(revalidateTimerRef.current);
      }
    };
  }, [cart, appliedPromoCode, user, clearPromo, showToast]);

  // Debounced (400ms) available promos fetch whenever cart or user changes
  const fetchAvailablePromosTimerRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (fetchAvailablePromosTimerRef.current) {
      clearTimeout(fetchAvailablePromosTimerRef.current);
    }
    fetchAvailablePromosTimerRef.current = setTimeout(() => {
      const subtotal = cart.reduce((total, item) => total + (item.sellingPrice || item.price || 0) * (item.quantity || 1), 0);
      promotionService.getAvailablePromos({ subtotal, cartItems: cart }).then((promos) => {
        if (Array.isArray(promos)) {
          setAvailablePromos(promos);
        }
      }).catch((err) => {
        console.warn('Error fetching available promos:', err);
      });
    }, 400);

    return () => {
      if (fetchAvailablePromosTimerRef.current) {
        clearTimeout(fetchAvailablePromosTimerRef.current);
      }
    };
  }, [cart, user]);


  const cartCount = cart.reduce((total, item) => total + (item.quantity || 1), 0);
  const cartTotal = cart.reduce((total, item) => total + (item.sellingPrice || item.price || 0) * (item.quantity || 1), 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        cartLoading,
        isCartLoaded,
        isCartOpen,
        setIsCartOpen,
        appliedPromoCode,
        promoDiscount,
        promoError,
        promoSuccess,
        promoTotalDetails,
        availablePromos,
        toast,
        showToast,
        addToCart,
        removeFromCart,
        isInCart,
        updateQuantity,
        clearCart,
        validatePromo,
        clearPromo,
        cartCount,
        cartTotal,
      }}
    >
      {children}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            backgroundColor: toast.type === 'error' ? '#ef4444' : toast.type === 'info' ? '#334155' : 'var(--color-primary)',
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
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export default CartContext;
