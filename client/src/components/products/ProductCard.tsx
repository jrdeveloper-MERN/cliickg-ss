'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import { useWishlist } from '../../contexts/WishlistContext';
import getImageUrl from '../../utils/image.utils';
import { Product } from '../../types/products/product.types';

export interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { toggleWishlist, isInWishlist } = useWishlist();
  const [isHovered, setIsHovered] = useState(false);

  if (!product) return null;

  const prodId = product.id || product._id || '';
  const isLiked = isInWishlist(prodId);

  // Main image resolution (matching client React project logic)
  const mainImageRaw =
    (product as any).productImage ||
    product.image ||
    (Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : null) ||
    (product as any).thumbnail ||
    (Array.isArray(product.productDetails) && product.productDetails.length > 0
      ? product.productDetails[0].image || (Array.isArray(product.productDetails[0].images) ? product.productDetails[0].images[0] : null)
      : null) ||
    (Array.isArray(product.variants) && product.variants.length > 0
      ? product.variants[0].image
      : null);

  const mainImage = getImageUrl(mainImageRaw);

  // Secondary/Hover image resolution (matching client React project logic)
  const hoverImageRaw =
    (product as any).secondaryImage ||
    (Array.isArray(product.images) && product.images.length > 1 ? product.images[1] : null) ||
    (Array.isArray(product.productDetails) && product.productDetails.length > 1
      ? product.productDetails[1].image
      : (Array.isArray(product.productDetails) && product.productDetails.length > 0 && Array.isArray(product.productDetails[0].images) && product.productDetails[0].images.length > 1)
        ? product.productDetails[0].images[1]
        : null) ||
    (Array.isArray(product.variants) && product.variants.length > 1
      ? product.variants[1].image
      : null);

  const hoverImage = hoverImageRaw ? getImageUrl(hoverImageRaw) : null;

  // Active image display based on hover state
  const imageSrc = isHovered && hoverImage ? hoverImage : mainImage;

  const price = Number(product.sellingPrice || product.price || 0);
  const mrp = Number(product.mrp || (product as any).originalPrice || price);
  const discountAmount = mrp > price ? mrp - price : 0;
  const discountPercent = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const isOutOfStock = (product as any).stock === 0 || product.stockQuantity === 0 || product.inStock === false;

  return (
    <div
      className="bg-white rounded-2xl border border-slate-100 overflow-hidden flex flex-col relative shadow-[0_4px_16px_rgba(0,0,0,0.03)] hover:-translate-y-1 hover:shadow-[0_12px_28px_rgba(2,60,35,0.12)] hover:border-primary-border transition-all duration-300 h-full group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleWishlist(product);
        }}
        className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur-sm border-none rounded-full w-8.5 h-8.5 flex items-center justify-center cursor-pointer shadow-sm hover:scale-110 transition-transform duration-200 p-2"
        title={isLiked ? 'Remove from Wishlist' : 'Add to Wishlist'}
      >
        <Heart
          size={16}
          className={isLiked ? 'text-primary fill-primary' : 'text-slate-500'}
        />
      </button>

      <div className="p-3 pb-0 relative">
        {((product as any).promoBadge || (product as any).offerText || discountAmount > 0) && (
          <div className="absolute top-5.5 left-3 bg-[#ff6584] text-white text-[0.74rem] font-semibold py-1 pr-5 pl-2.5 [clip-path:polygon(0_0,85%_0,100%_50%,85%_100%,0_100%)] z-10 tracking-wide shadow-[0_2px_6px_rgba(255,101,132,0.3)]">
            {(product as any).promoBadge || (product as any).offerText || `Save ₹${discountAmount.toLocaleString('en-IN')}`}
          </div>
        )}

        <Link
          href={`/product/${prodId}`}
          className="block w-full aspect-square bg-[#faf9f8] rounded-xl overflow-hidden relative no-underline"
        >
          <img
            src={imageSrc}
            alt={product.name}
            onError={(e) => {
              e.currentTarget.src = '/assets/images/fallback-product.png';
            }}
            className="w-full h-full object-contain p-3 transition-transform duration-400 group-hover:scale-105"
          />
          {isOutOfStock && (
            <div className="absolute inset-0 bg-slate-900/45 text-white font-bold text-xs flex items-center justify-center tracking-wider">
              OUT OF STOCK
            </div>
          )}
        </Link>
      </div>

      <div className="p-3.5 flex flex-col grow justify-between">
        <div className="text-center mb-2.5">
          <Link href={`/product/${prodId}`} className="no-underline">
            <h4 className="text-sm font-semibold text-slate-800 mb-1.5 font-sans line-clamp-1 leading-snug hover:text-primary transition-colors">
              {product.name}
            </h4>
          </Link>

          <div className="flex flex-col items-center gap-0.5">
            <div className="flex items-baseline justify-center gap-2">
              {price > 0 ? (
                <>
                  <span className="text-base font-bold text-slate-900">
                    ₹{price.toLocaleString('en-IN')}
                  </span>
                  {mrp > price && (
                    <span className="text-xs text-slate-400 line-through">
                      ₹{mrp.toLocaleString('en-IN')}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-xs font-bold text-slate-500 italic">
                  Price on Request
                </span>
              )}
            </div>

            {price > 0 && discountAmount > 0 && (
              <span className="text-[0.72rem] text-primary font-semibold tracking-wide">
                Discount: -₹{discountAmount.toLocaleString('en-IN')} ({discountPercent}% OFF)
              </span>
            )}
          </div>
        </div>

        <Link
          href={`/product/${prodId}`}
          className="flex items-center justify-center w-full bg-primary hover:bg-primary-hover text-white border-none py-2.5 text-xs font-bold tracking-widest uppercase no-underline rounded-lg shadow-sm hover:shadow-md transition-all duration-300 mt-1"
        >
          VIEW NOW
        </Link>
      </div>
    </div>
  );
};

export default ProductCard;
