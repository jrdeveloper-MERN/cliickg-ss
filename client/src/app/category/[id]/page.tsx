'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import productService from '../../../services/product.service';
import categoryService from '../../../services/category.service';
import ProductGrid from '../../../components/products/ProductGrid';
import { Product } from '../../../types/products/product.types';
import ErrorState from '../../../components/ui/ErrorState/ErrorState';
import { parseAppError, isNetworkOrServerDown, AppError } from '../../../utils/error-handler.utils';

export default function CategoryDetailPage() {
  const params = useParams();
  const categoryId = params?.id as string;

  const [products, setProducts] = useState<Product[]>([]);
  const [categoryName, setCategoryName] = useState('Category Collection');
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<AppError | null>(null);

  useEffect(() => {
    if (!categoryId) return;
    fetchCategoryProducts();
  }, [categoryId]);

  const fetchCategoryProducts = async () => {
    try {
      setLoading(true);
      setPageError(null);
      const [allCats, prodsRes] = await Promise.all([
        categoryService.getCategories(),
        productService.getProducts({ limit: 100 }),
      ]);

      const foundCat = allCats.find((c) => String(c.id || c._id) === String(categoryId));
      if (foundCat) {
        setCategoryName(foundCat.name);
      }

      const extractId = (val: any): string => {
        if (!val) return '';
        if (typeof val === 'string') return val;
        return val.id || val._id || '';
      };

      const filtered = prodsRes.data.filter((p: any) => {
        const catId = extractId(p.categoryId);
        const mainCatId = extractId(p.mainCategoryId);
        const subCatId = extractId(p.subCategoryId);
        return (
          String(catId) === String(categoryId) ||
          String(mainCatId) === String(categoryId) ||
          String(subCatId) === String(categoryId) ||
          (foundCat && (p.categoryName === foundCat.name || p.category?.name === foundCat.name))
        );
      });

      setProducts(filtered);
    } catch (err: any) {
      console.error('Error loading category products:', err);
      if (isNetworkOrServerDown(err)) {
        setPageError(parseAppError(err));
      }
    } finally {
      setLoading(false);
    }
  };

  if (pageError) {
    return (
      <div className="w-full min-h-[75vh] flex items-center justify-center">
        <ErrorState error={pageError} onRetry={fetchCategoryProducts} fullPage />
      </div>
    );
  }

  return (
    <div className="w-[min(100%-2rem,1360px)] md:w-[min(100%-3rem,1360px)] mx-auto py-8 pb-16">
      <div className="mb-8 border-b border-slate-200 pb-4">
        <h1 className="font-serif text-3xl sm:text-4xl font-light text-slate-900 m-0">
          {categoryName}
        </h1>
      </div>

      <ProductGrid products={products} loading={loading} />
    </div>
  );
}
