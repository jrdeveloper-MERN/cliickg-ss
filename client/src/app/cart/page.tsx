'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Minus, X } from 'lucide-react';
import { useCart, getAvailableStock } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { CartItem } from '../../types/cart/cart.types';
import getImageUrl from '../../utils/image.utils';
import CouponsOffers from '../../components/cart/CouponsOffers';

interface CartItemRowProps {
  item: CartItem;
  idx: number;
  onRemove: (idx: number) => void;
  onUpdateQuantity: (idx: number, newQty: number) => void;
}

const CartItemRow = React.memo<CartItemRowProps>(
  ({ item, idx, onRemove, onUpdateQuantity }) => {
    const price = Number(item.sellingPrice || item.price || 0);
    const imageSrc = getImageUrl(item.image || '');
    const itemStock = getAvailableStock(item);
    const isMaxStockReached = itemStock > 0 && item.quantity >= itemStock;

    return (
      <div className="flex bg-white rounded-xl border border-slate-200 overflow-hidden flex-col shadow-[0_4px_12px_rgba(0,0,0,0.02)]">
        <div className="flex relative">
          <div className="w-30 flex flex-col border-r border-slate-200 bg-slate-50 shrink-0">
            <div className="grow flex items-center justify-center p-2.5">
              <img src={imageSrc} alt={item.name || 'Product'} className="w-20 h-20 object-contain" />
            </div>
          </div>

          <div className="grow p-5 flex flex-col justify-between relative">
            <button
              type="button"
              onClick={() => onRemove(idx)}
              className="absolute top-3 right-3 bg-transparent border-none text-slate-400 hover:text-slate-700 cursor-pointer p-1 transition-colors"
              title="Remove Item"
              aria-label={`Remove ${item.name || 'item'} from cart`}
            >
              <X size={18} />
            </button>

            <div>
              <h3 className="text-base font-bold text-slate-800 m-0 mb-1 pr-6">
                {item.name}
              </h3>
              {item.selectedSize && <p className="text-xs text-slate-500 m-0">Size: {item.selectedSize}</p>}
            </div>

            <div className="flex items-center justify-between mt-5">
              <span className="text-xl font-extrabold text-slate-800">
                ₹{(price * item.quantity).toLocaleString('en-IN')}
              </span>

              <div className="flex items-center border border-slate-200 rounded-md overflow-hidden">
                <button
                  type="button"
                  onClick={() => onUpdateQuantity(idx, item.quantity - 1)}
                  disabled={item.quantity <= 1}
                  aria-label="Decrease Quantity"
                  className={`border-none w-8 h-8 flex items-center justify-center text-base font-bold transition-colors ${
                    item.quantity <= 1
                      ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                      : 'bg-rose-50 hover:bg-rose-100 text-primary cursor-pointer'
                  }`}
                  title={item.quantity <= 1 ? 'Minimum quantity is 1' : 'Decrease Quantity'}
                >
                  <Minus size={14} />
                </button>
                <span className="w-9 h-8 flex items-center justify-center text-sm font-bold text-slate-800 bg-white">
                  {item.quantity}
                </span>
                <button
                  type="button"
                  onClick={() => onUpdateQuantity(idx, item.quantity + 1)}
                  disabled={isMaxStockReached}
                  aria-label="Increase Quantity"
                  className={`border-none w-8 h-8 flex items-center justify-center text-base font-bold transition-colors ${isMaxStockReached
                    ? 'bg-slate-300 text-white cursor-not-allowed'
                    : 'bg-primary hover:bg-primary-hover text-white cursor-pointer'
                    }`}
                  title={isMaxStockReached ? `Maximum available stock (${itemStock}) reached` : 'Increase Quantity'}
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.idx === nextProps.idx &&
      prevProps.item.id === nextProps.item.id &&
      prevProps.item.quantity === nextProps.item.quantity &&
      prevProps.item.sellingPrice === nextProps.item.sellingPrice &&
      prevProps.item.price === nextProps.item.price &&
      prevProps.item.stock === nextProps.item.stock &&
      prevProps.item.name === nextProps.item.name &&
      prevProps.item.image === nextProps.item.image
    );
  }
);

export default function CartPage() {
  const {
    cart,
    removeFromCart,
    updateQuantity,
    cartTotal,
    promoDiscount,
    availablePromos,
  } = useCart();
  const router = useRouter();

  const handleRemoveItem = useCallback((idx: number) => {
    removeFromCart(idx);
  }, [removeFromCart]);

  const handleUpdateQuantity = useCallback((idx: number, newQty: number) => {
    updateQuantity(idx, newQty);
  }, [updateQuantity]);

  const subtotal = cartTotal;
  const discountAmount = promoDiscount || 0;
  const grandTotal = Math.max(0, subtotal - discountAmount);

  if (cart.length === 0) {
    return (
      <div className="w-[min(100%-2rem,1360px)] md:w-[min(100%-3rem,1360px)] mx-auto py-24 flex flex-col items-center justify-center text-center min-h-[55vh]">
        <img
          src="/assets/images/cart-empty.svg"
          alt="Empty Cart Illustration"
          className="w-64 h-auto sm:w-72 md:w-80 block mb-4 max-w-full"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
        <div className="text-xs font-extrabold text-slate-800 tracking-wider mt-3 uppercase">
          EMPTY CART
        </div>
        <h2 className="text-3xl sm:text-4xl font-light text-slate-800 mt-6 mb-2">
          Your cart is empty
        </h2>
        <p className="text-slate-500 text-sm mb-7">
          Looks like you haven't added anything to your cart yet.
        </p>
        <Link
          href="/shop"
          className="bg-primary hover:bg-primary-hover text-white py-2.5 px-7 rounded font-semibold text-sm inline-block transition-colors"
        >
          Continue Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="w-[min(100%-2rem,1360px)] md:w-[min(100%-3rem,1360px)] mx-auto py-12 pb-20">
      <div className="flex items-baseline gap-2 mb-9 border-b border-slate-100 pb-4">
        <h2 className="font-serif text-3xl sm:text-4xl font-light text-slate-800 m-0">
          Shopping Cart
        </h2>
        <span className="text-lg text-slate-400 font-normal">
          ({cart.reduce((sum, item) => sum + item.quantity, 0)} Items)
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-10 items-start">
        {/* Cart Items List */}
        <div className="flex flex-col gap-6">
          {cart.map((item, idx) => (
            <CartItemRow
              key={item.id || item._id || `${item.productId}_${item.variantKey || idx}`}
              item={item}
              idx={idx}
              onRemove={handleRemoveItem}
              onUpdateQuantity={handleUpdateQuantity}
            />
          ))}
        </div>

        {/* Order Summary & Promo Code Section */}
        <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-[0_4px_20px_rgba(0,0,0,0.02)] sticky top-24">
          <h3 className="font-serif text-2xl font-light text-slate-800 mb-5 border-b border-slate-100 pb-3">
            Order Summary
          </h3>

          <CouponsOffers availablePromos={availablePromos} subtotal={subtotal} />

          <div className="flex flex-col gap-2.5 text-sm text-slate-600 border-b border-slate-100 pb-4 mb-4">
            <div className="flex justify-between">
              <span>Item Subtotal (incl. GST):</span>
              <span className="font-bold text-slate-800">₹{subtotal.toLocaleString('en-IN')}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-emerald-600 font-bold">
                <span>Discount:</span>
                <span>-₹{discountAmount.toLocaleString('en-IN')}</span>
              </div>
            )}
          </div>

          <div className="flex justify-between items-baseline mb-6">
            <span className="text-base font-bold text-slate-800">Total Amount:</span>
            <span className="text-2xl font-extrabold text-primary">
              ₹{grandTotal.toLocaleString('en-IN')}
            </span>
          </div>

          <button
            type="button"
            onClick={() => router.push('/checkout')}
            className="w-full bg-primary hover:bg-primary-hover text-white border-none p-4 rounded-lg font-bold text-sm tracking-wider cursor-pointer shadow-md uppercase transition-colors"
          >
            Proceed to Checkout
          </button>
        </div>
      </div>
    </div>
  );
}
