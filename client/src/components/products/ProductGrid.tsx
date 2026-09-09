'use client';

import React from 'react';
import ProductCard from './ProductCard';
import { Product } from '../../types/products/product.types';
import { ProductCardSkeleton } from '../ui/Skeleton/Skeleton';

export interface ProductGridProps {
  products?: Product[];
  loading?: boolean;
  emptyMessage?: string;
  gridClass?: string;
  columns?: number;
}

export const ProductGrid: React.FC<ProductGridProps> = ({
  products = [],
  loading = false,
  emptyMessage = 'No products available at the moment.',
  gridClass,
  columns = 4,
}) => {
  const safeProducts: Product[] = [];
  const seenIds = new Set<string>();

  for (const item of products) {
    if (!item) continue;
    const idKey = String(item.id || item._id || '');
    if (idKey && seenIds.has(idKey)) continue;
    if (idKey) seenIds.add(idKey);
    safeProducts.push(item);
  }

  const defaultGridClass =
    columns === 1
      ? 'grid grid-cols-1 w-full max-w-[1360px] gap-6 mx-auto px-3 sm:px-6'
      : columns === 2
      ? 'grid grid-cols-1 sm:grid-cols-2 w-full max-w-[1360px] gap-4 sm:gap-6 mx-auto px-3 sm:px-6'
      : columns === 3
      ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 w-full max-w-[1360px] gap-4 sm:gap-6 mx-auto px-3 sm:px-6'
      : columns === 6
      ? 'grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 w-full max-w-[1360px] gap-3 sm:gap-4 mx-auto px-3 sm:px-6'
      : columns === 5
      ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 w-full max-w-[1360px] gap-3.5 sm:gap-5 mx-auto px-3 sm:px-6'
      : 'grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 w-full max-w-[1360px] gap-3.5 sm:gap-5 lg:gap-6 mx-auto px-3 sm:px-6';

  const containerClass = gridClass || defaultGridClass;

  if (loading) {
    return (
      <div className={containerClass}>
        {[1, 2, 3, 4, 5, 6, 7, 8].slice(0, columns * 2).map((n) => (
          <div key={n} className="w-full flex">
            <ProductCardSkeleton />
          </div>
        ))}
      </div>
    );
  }

  if (safeProducts.length === 0) {
    return (
      <div className="text-center py-12 px-4 text-slate-500 bg-white rounded-lg border border-slate-200 w-full">
        <p className="text-sm font-medium">{emptyMessage}</p>
      </div>
    );
  }

  if (safeProducts.length === 1) {
    return (
      <div className="flex justify-center w-full max-w-[1360px] mx-auto px-3 sm:px-6">
        <div className="w-full max-w-[290px]">
          <ProductCard product={safeProducts[0]} />
        </div>
      </div>
    );
  }

  if (safeProducts.length === 2 && columns >= 3) {
    return (
      <div className="grid grid-cols-2 max-w-[620px] w-full gap-3.5 sm:gap-6 mx-auto px-3 sm:px-6">
        {safeProducts.map((product, idx) => (
          <div key={product.id || product._id || idx} className="w-full flex">
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={containerClass}>
      {safeProducts.map((product, idx) => (
        <div key={product.id || product._id || idx} className="w-full flex">
          <ProductCard product={product} />
        </div>
      ))}
    </div>
  );
};

export default ProductGrid;
