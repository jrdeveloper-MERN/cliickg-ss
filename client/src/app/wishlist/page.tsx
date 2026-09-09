'use client';

import React from 'react';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import ProductGrid from '../../components/products/ProductGrid';
import { useWishlist } from '../../contexts/WishlistContext';

export default function WishlistPage() {
  const { wishlist } = useWishlist();

  if (wishlist.length === 0) {
    return (
      <div className="w-[min(100%-2rem,1360px)] md:w-[min(100%-3rem,1360px)] mx-auto py-20 text-center">
        <Heart size={64} className="text-slate-300 mx-auto mb-4" />
        <h2 className="font-serif text-3xl font-light text-slate-800 mb-2">
          Your Wishlist is Empty
        </h2>
        <p className="text-slate-500 text-sm mb-8">
          Save your favorite products to review anytime.
        </p>
        <Link
          href="/shop"
          className="inline-block bg-primary hover:bg-primary-hover text-white py-2.5 px-7 rounded-lg font-bold text-sm no-underline shadow-md transition-colors"
        >
          Browse Collections
        </Link>
      </div>
    );
  }

  return (
    <div className="w-[min(100%-2rem,1360px)] md:w-[min(100%-3rem,1360px)] mx-auto py-10 pb-16">
      <h2 className="font-serif text-3xl font-light text-slate-800 mb-7">
        My Saved Wishlist ({wishlist.length} items)
      </h2>
      <ProductGrid products={wishlist} />
    </div>
  );
}
