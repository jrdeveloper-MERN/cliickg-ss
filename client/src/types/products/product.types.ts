export interface ProductVariant {
  id?: string;
  _id?: string;
  sku?: string;
  skuCode?: string;
  size?: string;
  weightGram?: number;
  weight?: number;
  stockQuantity?: number;
  price?: number;
  sellingPrice?: number;
  mrp?: number;
  offerPrice?: number;
  gst?: number;
  attributes?: Record<string, string>;
  image?: string;
}

export interface Product {
  id: string;
  _id?: string;
  name: string;
  sku?: string;
  skuCode?: string;
  description?: string;
  shortDescription?: string;
  mainCategoryId?: string;
  categoryId?: string;
  subCategoryId?: string;
  mainCategoryName?: string;
  categoryName?: string;
  subCategoryName?: string;
  gender?: string;
  gstPercentage?: number;
  mrp?: number;
  price?: number;
  sellingPrice?: number;
  discountPercentage?: number;
  stockQuantity?: number;
  inStock?: boolean;
  isFeatured?: boolean;
  isTodayDeal?: boolean;
  image?: string;
  images?: string[];
  variants?: ProductVariant[];
  productDetails?: any[];
  certificates?: any;
  offerText?: string;
  attributes?: Record<string, string>;
  rating?: number;
  reviewsCount?: number;
  createdAt?: string;
}

export interface ProductQuery {
  search?: string;
  q?: string;
  category?: string;
  mainCategory?: string;
  subCategory?: string;
  minPrice?: number | string;
  maxPrice?: number | string;
  sort?: 'price_asc' | 'price_desc' | 'newest' | string;
  page?: number;
  limit?: number;
}
