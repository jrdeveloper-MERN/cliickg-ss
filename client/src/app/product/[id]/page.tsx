'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ShoppingBag,
  Heart,
  ShieldCheck,
  Share2,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  CheckCircle,
  Award,
  X,
  Sparkles,
  Gem,
  Tag,
  Users,
} from 'lucide-react';
import { useCart } from '../../../contexts/CartContext';
import { useWishlist } from '../../../contexts/WishlistContext';
import ProductGrid from '../../../components/products/ProductGrid';
import productService from '../../../services/product.service';
import cmsService from '../../../services/cms.service';
import getImageUrl from '../../../utils/image.utils';
import sanitizeHtml from '../../../utils/sanitizer.utils';
import { calculatePricing } from '../../../utils/pricing.utils';
import { StorePromise, FAQ } from '../../../types/cms/cms.types';
import ErrorState from '../../../components/ui/ErrorState/ErrorState';
import { parseAppError, isNetworkOrServerDown, AppError } from '../../../utils/error-handler.utils';
import { ProductDetailSkeleton } from '../../../components/ui/Skeleton/Skeleton';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [product, setProduct] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [selectedAttrs, setSelectedAttrs] = useState<Record<string, string>>({});
  const [openAccordion, setOpenAccordion] = useState({ details: false, breakup: false, desc: false });
  const [openFaqs, setOpenFaqs] = useState<Record<string, boolean>>({});
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [storePromises, setStorePromises] = useState<StorePromise[]>([]);
  const [promisesBanner, setPromisesBanner] = useState<string>('');
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [certificatesList, setCertificatesList] = useState<string[]>([]);
  const [activeCertModal, setActiveCertModal] = useState<string | null>(null);
  const [activeImageModal, setActiveImageModal] = useState<string | null>(null);
  const [isHoveringGallery, setIsHoveringGallery] = useState(false);
  const isHoveringRef = useRef(false);
  const thumbnailsRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<AppError | null>(null);
  const [pincode, setPincode] = useState('');
  const [pincodeResult, setPincodeResult] = useState<any>(null);
  const [checkingPincode, setCheckingPincode] = useState(false);
  const [showRemoveAlert, setShowRemoveAlert] = useState(false);

  const { addToCart, removeFromCart, isInCart, appliedPromoCode, promoTotalDetails } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();

  useEffect(() => {
    if (!id) return;
    fetchProductAndData();
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
    }
  }, [id]);

  useEffect(() => {
    setSelectedImage(0);
    setQuantity(1);
  }, [selectedVariantIndex]);

  // Auto-scroll images every 3.5 seconds when there are multiple images and user is not hovering
  useEffect(() => {
    if (!product) return;

    const timer = setInterval(() => {
      if (isHoveringRef.current) return;

      const vList = product.productDetails || product.variants || [];
      const cVar = vList[selectedVariantIndex] || vList[0] || {};
      const vImgs = Array.isArray(cVar?.images) && cVar.images.length > 0 ? cVar.images.filter(Boolean) : [];
      const totalCount = vImgs.length > 0
        ? vImgs.length
        : (Array.isArray(product.images) && product.images.length > 0
          ? product.images.length
          : (product.secondaryImage ? 2 : 1));

      if (totalCount > 1) {
        setSelectedImage((prev) => (prev + 1) % totalCount);
      }
    }, 3500);

    return () => clearInterval(timer);
  }, [product, selectedVariantIndex]);

  // Keep active thumbnail scrolled into view inside the thumbnails container only (do NOT scroll the browser window)
  useEffect(() => {
    if (!thumbnailsRef.current) return;
    const container = thumbnailsRef.current;
    const activeThumb = container.children[selectedImage] as HTMLElement;
    if (activeThumb) {
      const thumbLeft = activeThumb.offsetLeft;
      const thumbWidth = activeThumb.offsetWidth;
      const containerWidth = container.offsetWidth;
      const targetScrollLeft = thumbLeft - containerWidth / 2 + thumbWidth / 2;

      container.scrollTo({
        left: Math.max(0, targetScrollLeft),
        behavior: 'smooth',
      });
    }
  }, [selectedImage]);

  const fetchProductAndData = async () => {
    setLoading(true);
    setPageError(null);
    try {
      const [mainProd, promisesRes, bannerRes, faqsRes, certsRes, relatedRes] = await Promise.all([
        productService.getProductById(id),
        cmsService.getStorePromises().catch(() => []),
        cmsService.getStorePromiseBanner().catch(() => ''),
        cmsService.getFaqs().catch(() => []),
        cmsService.getCertificates().catch(() => []),
        productService.getProducts({ limit: 5 }).catch(() => ({ data: [] })),
      ]);

      setProduct(mainProd);
      setPromisesBanner(bannerRes || '');

      const prodVariants = mainProd?.productDetails || mainProd?.variants || [];
      if (prodVariants.length > 0) {
        setSelectedVariantIndex(0);
        const firstVariant = prodVariants[0];
        const initial: Record<string, string> = {};
        if (firstVariant.purity) initial['Metal Purity'] = firstVariant.purity;
        const col = firstVariant.color || firstVariant.metalType;
        if (col) initial['Metal Color'] = col;
        if (firstVariant.grossWeight) initial['Approx weight'] = firstVariant.grossWeight + 'g';
        if (firstVariant.attributes) {
          Object.entries(firstVariant.attributes).forEach(([k, v]) => {
            if (v) initial[k] = String(v);
          });
        }
        setSelectedAttrs(initial);
      }

      setStorePromises(Array.isArray(promisesRes) ? promisesRes.filter((p: any) => p.status !== 'Inactive') : []);
      setFaqs(Array.isArray(faqsRes) ? faqsRes.filter((f: any) => f.status !== 'Inactive') : []);

      let rawCerts = mainProd?.certificates || [];
      let parsedCerts: any[] = [];
      if (typeof rawCerts === 'string') {
        try {
          parsedCerts = JSON.parse(rawCerts);
        } catch (e) {
          parsedCerts = [rawCerts];
        }
      } else if (Array.isArray(rawCerts)) {
        rawCerts.forEach((c) => {
          if (typeof c === 'string' && (c.startsWith('[') || c.startsWith('{'))) {
            try {
              const item = JSON.parse(c);
              if (Array.isArray(item)) parsedCerts.push(...item);
              else parsedCerts.push(item);
            } catch (e) {
              parsedCerts.push(c);
            }
          } else if (c) {
            parsedCerts.push(c);
          }
        });
      }

      let finalCertImages = parsedCerts.map((c) => (typeof c === 'object' && c.image ? c.image : c)).filter(Boolean);
      if (finalCertImages.length === 0 && Array.isArray(certsRes) && certsRes.length > 0) {
        finalCertImages = certsRes.map((c: any) => c.image || c).filter(Boolean);
      }
      setCertificatesList(finalCertImages);

      const relList = Array.isArray(relatedRes.data) ? relatedRes.data : [];
      setRelatedProducts(relList.filter((p: any) => String(p.id || p._id) !== String(id)));
    } catch (err: any) {
      console.error('Error fetching product details:', err);
      if (isNetworkOrServerDown(err)) {
        setPageError(parseAppError(err));
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="w-[min(100%-2rem,1360px)] md:w-[min(100%-3rem,1360px)] mx-auto py-6 pb-16">
        <ProductDetailSkeleton />
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="w-full min-h-[75vh] flex items-center justify-center">
        <ErrorState error={pageError} onRetry={fetchProductAndData} fullPage />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="w-[min(100%-2rem,1360px)] md:w-[min(100%-3rem,1360px)] mx-auto py-20 text-center">
        <h3 className="text-slate-800 mb-4 font-bold text-xl">Product Not Found</h3>
        <Link
          href="/shop"
          className="bg-primary hover:bg-primary-hover border-none py-2.5 px-6 rounded-md text-white no-underline font-bold"
        >
          Back to Shop
        </Link>
      </div>
    );
  }

  const variants = product.productDetails || product.variants || [];
  const currentVariant = variants[selectedVariantIndex] || variants[0] || {};

  const availablePurities = Array.from(new Set(variants.map((v: any) => v.purity).filter(Boolean))) as string[];
  const selectedPurity = selectedAttrs['Metal Purity'] || currentVariant.purity || availablePurities[0] || '';
  const purityMatchingVariants = variants.filter((v: any) => !selectedPurity || v.purity === selectedPurity);

  const availableColors = Array.from(new Set(
    (purityMatchingVariants.length > 0 ? purityMatchingVariants : variants)
      .map((v: any) => v.color || v.metalType)
      .filter(Boolean)
  )) as string[];

  const selectedColor = selectedAttrs['Metal Color'] || currentVariant.color || currentVariant.metalType || availableColors[0] || '';
  const colorMatchingVariants = (purityMatchingVariants.length > 0 ? purityMatchingVariants : variants).filter(
    (v: any) => !selectedColor || (v.color || v.metalType) === selectedColor
  );

  const availableWeights = Array.from(new Set(
    (colorMatchingVariants.length > 0 ? colorMatchingVariants : purityMatchingVariants.length > 0 ? purityMatchingVariants : variants)
      .map((v: any) => (v.grossWeight ? v.grossWeight + 'g' : v.netWeight ? v.netWeight + 'g' : null))
      .filter(Boolean)
  )) as string[];

  const dynamicAttributes: Record<string, string[]> = {};

  if (availablePurities.length > 0) {
    dynamicAttributes['Metal Purity'] = availablePurities;
  }
  if (availableColors.length > 0) {
    dynamicAttributes['Metal Color'] = availableColors;
  }
  if (availableWeights.length > 0) {
    dynamicAttributes['Approx weight'] = availableWeights;
  }

  variants.forEach((v: any) => {
    if (v.attributes && typeof v.attributes === 'object') {
      Object.entries(v.attributes).forEach(([k, val]) => {
        if (k === 'pricingConfig' || typeof val === 'object' || Array.isArray(val)) return;
        if (val !== undefined && val !== null && val !== '') {
          if (!dynamicAttributes[k]) dynamicAttributes[k] = [];
          const strVal = String(val).trim();
          if (strVal && !dynamicAttributes[k].includes(strVal)) {
            dynamicAttributes[k].push(strVal);
          }
        }
      });
    }
  });

  const selectVariant = (index: number) => {
    if (index < 0 || index >= variants.length) return;
    setSelectedVariantIndex(index);
    setSelectedImage(0);
    const targetVariant = variants[index];
    const newAttrs: Record<string, string> = {};
    if (targetVariant.purity) newAttrs['Metal Purity'] = targetVariant.purity;
    const targetCol = targetVariant.color || targetVariant.metalType;
    if (targetCol) newAttrs['Metal Color'] = targetCol;
    const targetWeight = targetVariant.grossWeight
      ? targetVariant.grossWeight + 'g'
      : targetVariant.netWeight
        ? targetVariant.netWeight + 'g'
        : '';
    if (targetWeight) newAttrs['Approx weight'] = targetWeight;
    if (targetVariant.attributes && typeof targetVariant.attributes === 'object') {
      Object.entries(targetVariant.attributes).forEach(([k, v]) => {
        if (k !== 'pricingConfig' && typeof v !== 'object') {
          newAttrs[k] = String(v);
        }
      });
    }
    setSelectedAttrs(newAttrs);
  };

  const handleAttributeSelect = (key: string, val: string) => {
    const nextAttrs = { ...selectedAttrs, [key]: val };
    let bestIdx = 0;
    let maxScore = -1;

    variants.forEach((v: any, idx: number) => {
      let score = 0;
      if (key === 'Metal Purity' && v.purity === val) {
        score += 10;
      } else if (v.purity && nextAttrs['Metal Purity'] === v.purity) {
        score += 5;
      }

      const col = v.color || v.metalType;
      if (key === 'Metal Color' && col === val) {
        score += 10;
      } else if (col && nextAttrs['Metal Color'] === col) {
        score += 5;
      }

      const w = v.grossWeight ? v.grossWeight + 'g' : v.netWeight ? v.netWeight + 'g' : '';
      if (key === 'Approx weight' && w === val) {
        score += 10;
      } else if (w && nextAttrs['Approx weight'] === w) {
        score += 5;
      }

      if (v.attributes && typeof v.attributes === 'object') {
        Object.entries(v.attributes).forEach(([k, attrVal]) => {
          if (k !== 'pricingConfig' && typeof attrVal !== 'object' && nextAttrs[k] === String(attrVal)) {
            score += 2;
          }
        });
      }

      if (score > maxScore) {
        maxScore = score;
        bestIdx = idx;
      }
    });

    const targetVariant = variants[bestIdx] || variants[0];
    const updatedAttrs: Record<string, string> = { ...nextAttrs };

    if (targetVariant) {
      if (targetVariant.purity) updatedAttrs['Metal Purity'] = targetVariant.purity;
      const targetCol = targetVariant.color || targetVariant.metalType;
      if (targetCol) updatedAttrs['Metal Color'] = targetCol;
      const targetWeight = targetVariant.grossWeight
        ? targetVariant.grossWeight + 'g'
        : targetVariant.netWeight
          ? targetVariant.netWeight + 'g'
          : '';
      if (targetWeight) updatedAttrs['Approx weight'] = targetWeight;
      if (targetVariant.attributes && typeof targetVariant.attributes === 'object') {
        Object.entries(targetVariant.attributes).forEach(([k, v]) => {
          if (k !== 'pricingConfig' && typeof v !== 'object') {
            updatedAttrs[k] = String(v);
          }
        });
      }
    }

    setSelectedAttrs(updatedAttrs);
    setSelectedVariantIndex(bestIdx);
    setSelectedImage(0);
  };

  const variantImages =
    Array.isArray(currentVariant?.images) && currentVariant.images.length > 0
      ? currentVariant.images.filter(Boolean)
      : currentVariant.image
        ? [currentVariant.image]
        : [];

  const imageList: string[] = [];
  if (variantImages.length > 0) {
    variantImages.forEach((img: string) => imageList.push(img));
  } else {
    if (product.productImage) imageList.push(product.productImage);
    if (product.image) imageList.push(product.image);
    if (product.secondaryImage && !imageList.includes(product.secondaryImage)) imageList.push(product.secondaryImage);
    if (Array.isArray(product.images)) {
      product.images.forEach((img: string) => {
        if (img && !imageList.includes(img)) imageList.push(img);
      });
    }
    if (imageList.length === 0) imageList.push('/uploads/fallbackimg.png');
  }

  const handlePrevImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (imageList.length <= 1) return;
    setSelectedImage((prev) => (prev === 0 ? imageList.length - 1 : prev - 1));
  };

  const handleNextImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (imageList.length <= 1) return;
    setSelectedImage((prev) => (prev + 1) % imageList.length);
  };

  const activeDetail = {
    ...product,
    ...currentVariant,
    mrp: currentVariant.mrp !== undefined ? currentVariant.mrp : product.mrp,
    offerPrice:
      currentVariant.offerPrice !== undefined
        ? currentVariant.offerPrice
        : product.offerPrice || product.sellingPrice,
    enableGst:
      currentVariant.enableGst !== undefined
        ? currentVariant.enableGst
        : currentVariant.attributes?.pricingConfig?.enableGst !== undefined
          ? currentVariant.attributes.pricingConfig.enableGst
          : product.enableGst !== undefined
            ? product.enableGst
            : true,
    gstMode:
      currentVariant.gstMode ||
      currentVariant.attributes?.pricingConfig?.gstMode ||
      product.gstMode ||
      'EXCLUSIVE',
    gstType:
      currentVariant.gstType ||
      currentVariant.attributes?.pricingConfig?.gstType ||
      product.gstType ||
      'CGST + SGST',
    finalGstRate:
      currentVariant.gst !== undefined && currentVariant.gst !== ''
        ? currentVariant.gst
        : product.finalGstRate !== undefined && product.finalGstRate !== ''
          ? product.finalGstRate
          : product.gst !== undefined
            ? product.gst
            : 0,
  };

  const pricing: any = calculatePricing(activeDetail);
  const basePrice = pricing.basePrice || 0;
  const gstAmount = pricing.finalGstAmount || 0;
  const gstRate = pricing.finalGstRate || 0;
  const finalPrice =
    pricing.finalPayablePrice ||
    pricing.finalPrice ||
    Number(currentVariant.sellingPrice || currentVariant.price || product.sellingPrice || product.price || 0);

  // Variant Specific Pricing & Breakup Calculations (Strictly from Product Management)
  const variantPricingConfig = currentVariant.attributes?.pricingConfig || {};

  const variantMrp = Math.max(
    0,
    Number(currentVariant.mrp !== undefined && currentVariant.mrp !== '' ? currentVariant.mrp : product.mrp || 0)
  );

  const isDiscountEnabled =
    currentVariant.enableDiscount !== undefined
      ? Boolean(currentVariant.enableDiscount)
      : Boolean(variantPricingConfig.enableDiscount);

  const isDiscountActive =
    currentVariant.isDiscountActive !== undefined
      ? Boolean(currentVariant.isDiscountActive)
      : variantPricingConfig.isDiscountActive !== false;

  const discountType =
    currentVariant.discountType || variantPricingConfig.discountType || 'Flat';

  const discountVal = Math.max(
    0,
    Number(
      currentVariant.discountValue !== undefined && currentVariant.discountValue !== ''
        ? currentVariant.discountValue
        : variantPricingConfig.discountValue || 0
    )
  );

  let variantDiscountAmt = 0;
  if (isDiscountEnabled && isDiscountActive && variantMrp > 0 && discountVal > 0) {
    if (discountType === 'Percentage') {
      const validRate = Math.min(100, discountVal);
      variantDiscountAmt = Math.round(((variantMrp * validRate) / 100) * 100) / 100;
    } else {
      variantDiscountAmt = Math.min(variantMrp, discountVal);
    }
  } else if (
    currentVariant.offerPrice !== undefined &&
    Number(currentVariant.offerPrice) > 0 &&
    variantMrp > Number(currentVariant.offerPrice)
  ) {
    variantDiscountAmt = variantMrp - Number(currentVariant.offerPrice);
  }

  const variantOfferPrice =
    currentVariant.offerPrice !== undefined && Number(currentVariant.offerPrice) > 0
      ? Number(currentVariant.offerPrice)
      : currentVariant.sellingPrice !== undefined && Number(currentVariant.sellingPrice) > 0
        ? Number(currentVariant.sellingPrice)
        : currentVariant.price !== undefined && Number(currentVariant.price) > 0
          ? Number(currentVariant.price)
          : Math.max(0, variantMrp - variantDiscountAmt);

  const effectiveSellingPrice = variantOfferPrice > 0 ? variantOfferPrice : (variantMrp > 0 ? variantMrp : 0);

  const isGstEnabled =
    currentVariant.enableGst !== undefined
      ? Boolean(currentVariant.enableGst)
      : variantPricingConfig.enableGst !== undefined
        ? Boolean(variantPricingConfig.enableGst)
        : (currentVariant.gst !== undefined && currentVariant.gst !== '' && Number(currentVariant.gst) > 0) ||
        (product.enableGst !== undefined ? Boolean(product.enableGst) : (product.gst !== undefined && Number(product.gst) > 0));

  const rawGstRate = isGstEnabled
    ? Number(
      currentVariant.gst !== undefined && currentVariant.gst !== ''
        ? currentVariant.gst
        : product.finalGstRate !== undefined && product.finalGstRate !== ''
          ? product.finalGstRate
          : product.gst || 0
    )
    : 0;

  const effectiveGstRate = Math.max(0, isNaN(rawGstRate) ? 0 : rawGstRate);
  const gstType =
    currentVariant.gstType ||
    variantPricingConfig.gstType ||
    product.gstType ||
    'CGST + SGST';

  const isCgstSgst = gstType === 'CGST + SGST';
  const halfGstRate = effectiveGstRate / 2;

  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;
  let totalGstAmount = 0;

  if (isGstEnabled && effectiveGstRate > 0) {
    if (isCgstSgst) {
      cgstAmount = parseFloat(((effectiveSellingPrice * halfGstRate) / 100).toFixed(2));
      sgstAmount = parseFloat(((effectiveSellingPrice * halfGstRate) / 100).toFixed(2));
      totalGstAmount = parseFloat((cgstAmount + sgstAmount).toFixed(2));
    } else {
      igstAmount = parseFloat(((effectiveSellingPrice * effectiveGstRate) / 100).toFixed(2));
      totalGstAmount = igstAmount;
    }
  }

  const finalTotalAmount = parseFloat((effectiveSellingPrice + totalGstAmount).toFixed(2));
  const mrpPrice =
    variantMrp > effectiveSellingPrice ? variantMrp : effectiveSellingPrice;

  let promoDiscountVal = 0;
  let promoCodeName = '';
  if (appliedPromoCode && promoTotalDetails && promoTotalDetails.discount > 0) {
    promoCodeName = appliedPromoCode;
    promoDiscountVal = promoTotalDetails.discount;
  }
  const discountedPrice = Math.max(0, finalPrice - promoDiscountVal);

  const isLiked = isInWishlist(product.id || product._id);
  const stockQty =
    currentVariant.stockQuantity !== undefined
      ? Number(currentVariant.stockQuantity)
      : currentVariant.stock !== undefined
        ? Number(currentVariant.stock)
        : Number(product.stockQuantity || product.stock || 0);

  const isOutOfStock =
    stockQty <= 0 || product.inStock === false || product.status === 'Inactive' || currentVariant.status === 'Inactive';

  const variantKey =
    currentVariant.id ||
    currentVariant._id ||
    currentVariant.sku ||
    String(selectedVariantIndex);

  const productToAdd = {
    ...product,
    _id: product._id || product.id,
    id: product.id || product._id,
    stock: stockQty,
    variant: currentVariant,
    price: finalPrice,
    sellingPrice: finalPrice,
    mrp: mrpPrice,
    image: imageList[0] || product.image,
    variantKey,
  };

  const itemInCart = isInCart(product._id || product.id, variantKey);

  const toggleAccordion = (key: 'details' | 'breakup' | 'desc') => {
    setOpenAccordion((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleFaq = (faqId: string) => {
    setOpenFaqs((prev) => ({ ...prev, [faqId]: !prev[faqId] }));
  };

  const currentGrossWeight = currentVariant.grossWeight || product.grossWeightGram || product.grossWeight;
  const currentNetWeight = currentVariant.netWeight || product.netWeightGram || product.netWeight;

  const handleShare = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({
          title: product.name,
          text: `Check out ${product.name} on CLIICKG!`,
          url: window.location.href,
        });
      } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  return (
    <div className="w-[min(100%-2rem,1360px)] md:w-[min(100%-3rem,1360px)] mx-auto py-6 pb-16">
      {/* Breadcrumbs */}
      <div className="text-xs text-slate-500 mb-6 flex items-center gap-1.5 flex-wrap">
        <Link href="/" className="text-slate-500 hover:text-primary no-underline transition-colors">
          Home
        </Link>{' '}
        /{' '}
        <Link href="/shop" className="text-slate-500 hover:text-primary no-underline transition-colors">
          {product.mainCategoryName || product.mainCategoryId?.name || 'Catalog'}
        </Link>{' '}
        /{' '}
        <span className="text-slate-800 font-bold">{product.name}</span>
      </div>

      {/* Main Product Showcase Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-16">
        {/* Left Column: Image Gallery with Lightbox & Auto-Scroll */}
        <div
          onMouseEnter={() => {
            isHoveringRef.current = true;
            setIsHoveringGallery(true);
          }}
          onMouseLeave={() => {
            isHoveringRef.current = false;
            setIsHoveringGallery(false);
          }}
          className="md:sticky md:top-24 self-start"
        >
          <div
            onMouseEnter={() => {
              isHoveringRef.current = true;
              setIsHoveringGallery(true);
            }}
            onMouseLeave={() => {
              isHoveringRef.current = false;
              setIsHoveringGallery(false);
            }}
            onClick={() => setActiveImageModal(getImageUrl(imageList[selectedImage]))}
            className="w-full aspect-square max-h-[480px] min-h-[280px] bg-white rounded-2xl overflow-hidden border border-slate-200/90 mb-4 shadow-sm flex items-center justify-center cursor-pointer relative group transition-all duration-300 hover:shadow-md"
            title="Click to view full image"
          >
            <img
              src={getImageUrl(imageList[selectedImage])}
              alt={product.name}
              className="max-h-full max-w-full object-contain block mx-auto p-4 transition-transform duration-500 group-hover:scale-102"
            />

            {/* Left & Right Arrow Navigation */}
            {imageList.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrevImage}
                  className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-slate-700 hover:text-primary rounded-full w-9 h-9 flex items-center justify-center shadow-md cursor-pointer transition-all opacity-80 group-hover:opacity-100 hover:scale-110 border border-slate-200/80 z-10"
                  title="Previous image"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  type="button"
                  onClick={handleNextImage}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-slate-700 hover:text-primary rounded-full w-9 h-9 flex items-center justify-center shadow-md cursor-pointer transition-all opacity-80 group-hover:opacity-100 hover:scale-110 border border-slate-200/80 z-10"
                  title="Next image"
                >
                  <ChevronRight size={20} />
                </button>
              </>
            )}

            {/* Top Right Zoom Icon */}
            <div className="absolute top-3.5 right-3.5 bg-slate-900/60 hover:bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center shadow-md transition-colors">
              <ZoomIn size={16} />
            </div>

            {/* Image Indicator Dots / Counter */}
            {imageList.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-slate-900/60 backdrop-blur-xs py-1 px-2.5 rounded-full z-10">
                {imageList.map((_, dotIdx) => (
                  <span
                    key={dotIdx}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedImage(dotIdx);
                    }}
                    className={`rounded-full transition-all duration-300 cursor-pointer ${selectedImage === dotIdx
                      ? 'w-5 h-1.5 bg-white'
                      : 'w-1.5 h-1.5 bg-white/50 hover:bg-white/80'
                      }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Thumbnail Gallery Strip with Auto-Center */}
          {imageList.length > 1 && (
            <div
              ref={thumbnailsRef}
              onMouseEnter={() => setIsHoveringGallery(true)}
              onMouseLeave={() => setIsHoveringGallery(false)}
              className="flex gap-3 overflow-x-auto pb-2 pt-1 scrollbar-thin scroll-smooth items-center justify-center"
            >
              {imageList.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedImage(idx)}
                  className={`w-16 h-16 sm:w-20 sm:h-20 min-w-[64px] min-h-[64px] rounded-xl overflow-hidden cursor-pointer p-1 bg-white shrink-0 transition-all duration-200 ${selectedImage === idx
                    ? 'border-2 border-primary shadow-sm scale-105 ring-2 ring-primary/20'
                    : 'border border-slate-200/80 hover:border-slate-400 opacity-70 hover:opacity-100'
                    }`}
                  title={`View image ${idx + 1}`}
                >
                  <img src={getImageUrl(img)} alt={`${product.name} thumbnail ${idx + 1}`} className="w-full h-full object-cover rounded-lg" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Product Overview & Actions */}
        <div>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="font-serif text-3xl font-bold text-slate-800 m-0 leading-tight">
                {product.name}
              </h1>
              {product.offerText && (
                <span className="bg-rose-50 text-primary border border-rose-200 text-xs py-1 px-2.5 mt-1.5 rounded inline-block font-semibold">
                  {product.offerText}
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => toggleWishlist(product)}
                className="bg-white border border-slate-200 rounded-full w-10 h-10 shrink-0 aspect-square flex items-center justify-center cursor-pointer text-slate-500 hover:text-primary transition-colors shadow-xs"
                title={isLiked ? 'Remove from Wishlist' : 'Add to Wishlist'}
              >
                <Heart size={18} className={isLiked ? 'text-primary fill-primary' : 'text-slate-500'} />
              </button>
              <button
                type="button"
                onClick={handleShare}
                className="bg-white border border-slate-200 rounded-full w-10 h-10 shrink-0 aspect-square flex items-center justify-center cursor-pointer text-slate-500 hover:text-slate-800 transition-colors shadow-xs"
                title="Share"
              >
                <Share2 size={18} />
              </button>
            </div>
          </div>

          {/* Short Description (Tiptap Rich-Text Rendered) */}
          {product.shortDescription && (
            <div
              className="tiptap-content mt-2.5 mb-5"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(product.shortDescription) }}
            />
          )}

          {/* Price Banner */}
          <div className="flex items-baseline gap-3 mb-6 mt-4 flex-wrap">
            <span className="text-3xl sm:text-4xl font-extrabold text-primary">
              ₹{(promoDiscountVal > 0 ? discountedPrice : finalPrice).toLocaleString('en-IN')}
            </span>

            {promoDiscountVal > 0 ? (
              <span className="text-xl text-slate-400 line-through">
                ₹{finalPrice.toLocaleString('en-IN')}
              </span>
            ) : mrpPrice > finalPrice && (
              <span className="text-lg text-slate-400 line-through">
                ₹{mrpPrice.toLocaleString('en-IN')}
              </span>
            )}

            {promoDiscountVal > 0 ? (
              <span className="text-xs text-emerald-700 font-bold bg-emerald-50 py-1 px-2.5 rounded-md border border-emerald-200">
                SAVE ₹{promoDiscountVal.toLocaleString('en-IN')} with {promoCodeName}
              </span>
            ) : (
              <span className="text-xs text-emerald-600 font-bold bg-emerald-50 py-1 px-2 rounded">
                Inclusive of all taxes
              </span>
            )}
          </div>

          {/* SKU Code & Stock Availability */}
          <div className="flex gap-4 text-xs text-slate-500 mb-6 flex-wrap">
            {(currentVariant.sku || currentVariant.skuCode || product.sku || product.hsnCode) && (
              <span>
                SKU Code: <strong className="text-slate-800">{currentVariant.sku || currentVariant.skuCode || product.sku || product.hsnCode}</strong>
              </span>
            )}
            <span>
              Availability:{' '}
              <strong className={isOutOfStock ? 'text-rose-500' : stockQty <= 5 ? 'text-amber-500' : 'text-emerald-600'}>
                {isOutOfStock
                  ? 'Out of Stock'
                  : stockQty <= 5
                    ? `Only ${stockQty} left in stock!`
                    : `In Stock (${stockQty} available)`}
              </strong>
            </span>
          </div>



          {/* Dynamic DB Attribute Selectors */}
          {Object.entries(dynamicAttributes).map(([keyName, valueSet]) => {
            const valuesArray = Array.from(valueSet);
            const selectedVal = selectedAttrs[keyName];
            const formattedKey = keyName.replace(/_/g, ' ');

            return (
              <div key={keyName} className="mb-5">
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  {formattedKey}: <span className="text-primary font-extrabold">{selectedVal || ''}</span>
                </label>
                <div className="flex gap-2.5 flex-wrap">
                  {valuesArray.map((val) => {
                    const isSelected = selectedVal === val;
                    const isColor = keyName.toLowerCase().includes('color');

                    let dotColor = null;
                    if (isColor) {
                      if (val.toLowerCase().includes('yellow') || val.toLowerCase().includes('gold')) dotColor = '#eab308';
                      else if (val.toLowerCase().includes('white') || val.toLowerCase().includes('silver')) dotColor = '#cbd5e1';
                      else if (val.toLowerCase().includes('rose')) dotColor = '#f43f5e';
                      else dotColor = '#cbd5e1';
                    }

                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handleAttributeSelect(keyName, val)}
                        className={`flex items-center text-xs font-semibold cursor-pointer transition-all duration-150 ${isColor ? 'gap-2 py-1.5 px-4 rounded-full' : 'py-2 px-5 rounded-md'
                          } ${isSelected
                            ? 'border-2 border-primary bg-primary-light text-primary'
                            : 'border border-slate-300 bg-white text-slate-600 hover:border-primary'
                          }`}
                      >
                        {isColor && dotColor && (
                          <span
                            className="w-3 h-3 rounded-full inline-block"
                            style={{
                              backgroundColor: dotColor,
                              border: val.toLowerCase().includes('white') ? '1px solid #94a3b8' : 'none',
                            }}
                          />
                        )}
                        {val}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Quantity Selector */}
          <div className="flex items-center gap-3 mb-5">
            <span className="text-sm font-semibold text-slate-800">Quantity:</span>
            <div className={`flex items-center border border-slate-300 rounded-md overflow-hidden ${isOutOfStock ? 'opacity-60' : 'opacity-100'}`}>
              <button
                type="button"
                disabled={quantity <= 1 || isOutOfStock}
                onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                className="border-none bg-slate-50 py-1.5 px-3.5 text-slate-800 font-bold text-base cursor-pointer disabled:cursor-not-allowed disabled:text-slate-300"
              >
                -
              </button>
              <span className="py-1.5 px-4 text-sm font-bold text-slate-800 select-none">
                {quantity}
              </span>
              <button
                type="button"
                disabled={quantity >= stockQty || isOutOfStock}
                onClick={() => setQuantity((prev) => (prev < stockQty ? prev + 1 : prev))}
                className="border-none bg-slate-50 py-1.5 px-3.5 text-slate-800 font-bold text-base cursor-pointer disabled:cursor-not-allowed disabled:text-slate-300"
              >
                +
              </button>
            </div>
            {stockQty > 0 && (
              <span className="text-xs text-slate-500">
                (Max {stockQty})
              </span>
            )}
          </div>

          {/* Action Buttons: Cart Actions */}
          {itemInCart ? (
            <div className="grid grid-cols-2 gap-4 mb-8">
              <button
                type="button"
                onClick={() => router.push('/cart')}
                className="bg-primary hover:bg-primary-hover text-white border-none py-3 px-5 rounded-lg font-bold text-sm cursor-pointer flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                <ShoppingBag size={18} />
                View in Cart
              </button>
              <button
                type="button"
                onClick={() => setShowRemoveAlert(true)}
                className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 py-3 px-5 rounded-lg font-bold text-sm cursor-pointer transition-colors flex items-center justify-center"
              >
                Remove from Cart
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 mb-8">
                <button
                  type="button"
                  onClick={() => {
                    addToCart(productToAdd, quantity, selectedAttrs['Size'] || null, null, variantKey);
                    router.push('/cart');
                  }}
                  disabled={isOutOfStock || finalPrice <= 0}
                  className="bg-white hover:bg-primary-light text-primary border-2 border-primary py-3 rounded-lg font-bold text-sm cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
                  title={finalPrice <= 0 ? 'Pricing configuration unavailable' : isOutOfStock ? 'Product out of stock' : 'Buy Now'}
                >
                  Buy Now
                </button>

                <button
                  type="button"
                  onClick={() => addToCart(productToAdd, quantity, selectedAttrs['Size'] || null, null, variantKey)}
                  disabled={isOutOfStock || finalPrice <= 0}
                  className="bg-primary hover:bg-primary-hover text-white border-none py-3 rounded-lg font-bold text-sm cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2 transition-colors shadow-sm"
                  title={finalPrice <= 0 ? 'Pricing configuration unavailable' : isOutOfStock ? 'Product out of stock' : 'Add to Cart'}
                >
                  <ShoppingBag size={18} />
                  {finalPrice <= 0 ? 'Unavailable' : isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
                </button>
              </div>
              {finalPrice <= 0 && (
                <p className="text-xs text-rose-500 font-semibold mb-6">
                  * This product currently lacks pricing configuration. Please contact store support.
                </p>
              )}
            </>
          )}

          {/* Structured Product Details & Invoice-Style Price Breakup Card */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
            {/* 1. Product Details Accordion */}
            <div className="border-b border-slate-200">
              <button
                type="button"
                onClick={() => toggleAccordion('details')}
                className="w-full p-4 flex items-center justify-between bg-transparent border-none cursor-pointer hover:bg-slate-50/50 transition-colors"
              >
                <span className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  Product Details
                </span>
                {openAccordion.details ? <ChevronUp size={18} className="text-primary" /> : <ChevronDown size={18} className="text-slate-500" />}
              </button>

              {openAccordion.details && (
                <div className="p-4 pt-0 bg-white">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700">
                    <div className="flex justify-between border-b border-slate-100 pb-1.5">
                      <span className="text-slate-500">Selected Variant SKU:</span>
                      <strong className="text-slate-900 font-mono font-bold">{currentVariant.sku || currentVariant.skuCode || product.hsnCode || 'N/A'}</strong>
                    </div>

                    <div className="flex justify-between border-b border-slate-100 pb-1.5">
                      <span className="text-slate-500">Stock Availability:</span>
                      <strong className={isOutOfStock ? 'text-rose-500 font-bold' : 'text-emerald-600 font-bold'}>
                        {isOutOfStock ? 'Out of Stock' : `In Stock (${stockQty} available)`}
                      </strong>
                    </div>

                    {product.category?.name && (
                      <div className="flex justify-between border-b border-slate-100 pb-1.5">
                        <span className="text-slate-500">Category:</span>
                        <strong className="text-slate-800">{product.category.name}</strong>
                      </div>
                    )}

                    {product.subCategory?.name && (
                      <div className="flex justify-between border-b border-slate-100 pb-1.5">
                        <span className="text-slate-500">Sub Category:</span>
                        <strong className="text-slate-800">{product.subCategory.name}</strong>
                      </div>
                    )}

                    {product.hsnCode && (
                      <div className="flex justify-between border-b border-slate-100 pb-1.5">
                        <span className="text-slate-500">HSN Code:</span>
                        <strong className="text-slate-800 font-mono">{product.hsnCode}</strong>
                      </div>
                    )}

                    {product.gender && (
                      <div className="flex justify-between border-b border-slate-100 pb-1.5">
                        <span className="text-slate-500">Gender / Specification:</span>
                        <strong className="text-slate-800">{product.gender}</strong>
                      </div>
                    )}

                    {/* Variant Specific Attributes */}
                    {currentVariant.attributes && typeof currentVariant.attributes === 'object' && (
                      Object.entries(currentVariant.attributes).map(([attrKey, attrVal]) => {
                        if (attrKey === 'pricingConfig' || typeof attrVal === 'object' || Array.isArray(attrVal) || !attrVal) return null;
                        return (
                          <div key={attrKey} className="flex justify-between border-b border-slate-100 pb-1.5">
                            <span className="text-slate-500">{attrKey}:</span>
                            <strong className="text-slate-800">{String(attrVal)}</strong>
                          </div>
                        );
                      })
                    )}

                    {/* Optional Product Attributes */}
                    {(currentVariant.grade || product.grade || selectedAttrs['Grade']) && (
                      <div className="flex justify-between border-b border-slate-100 pb-1.5">
                        <span className="text-slate-500">Grade:</span>
                        <strong className="text-slate-800">{currentVariant.grade || product.grade || selectedAttrs['Grade']}</strong>
                      </div>
                    )}
                    {(currentVariant.material || product.material || selectedAttrs['Material']) && (
                      <div className="flex justify-between border-b border-slate-100 pb-1.5">
                        <span className="text-slate-500">Material:</span>
                        <strong className="text-slate-800">{currentVariant.material || product.material || selectedAttrs['Material']}</strong>
                      </div>
                    )}
                    {(currentVariant.purity || selectedAttrs['Metal Purity'] || selectedAttrs['Purity']) && (
                      <div className="flex justify-between border-b border-slate-100 pb-1.5">
                        <span className="text-slate-500">Purity / Spec:</span>
                        <strong className="text-slate-800">{currentVariant.purity || selectedAttrs['Metal Purity'] || selectedAttrs['Purity']}</strong>
                      </div>
                    )}
                    {(currentVariant.dimensions || product.dimensions || selectedAttrs['Dimensions']) && (
                      <div className="flex justify-between border-b border-slate-100 pb-1.5">
                        <span className="text-slate-500">Dimensions:</span>
                        <strong className="text-slate-800">{currentVariant.dimensions || product.dimensions || selectedAttrs['Dimensions']}</strong>
                      </div>
                    )}
                    {(currentVariant.brand || product.brand || selectedAttrs['Brand']) && (
                      <div className="flex justify-between border-b border-slate-100 pb-1.5">
                        <span className="text-slate-500">Brand:</span>
                        <strong className="text-slate-800">{currentVariant.brand || product.brand || selectedAttrs['Brand']}</strong>
                      </div>
                    )}
                    {currentGrossWeight && (
                      <div className="flex justify-between border-b border-slate-100 pb-1.5">
                        <span className="text-slate-500">Gross Weight:</span>
                        <strong className="text-slate-800">{currentGrossWeight} g</strong>
                      </div>
                    )}
                    {currentNetWeight && (
                      <div className="flex justify-between border-b border-slate-100 pb-1.5">
                        <span className="text-slate-500">Net Weight:</span>
                        <strong className="text-slate-800">{currentNetWeight} g</strong>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Variant Specific Price Breakup Section (MRP, MRP Discount, CGST/SGST) */}
            <div className="border-b border-slate-200">
              <button
                type="button"
                onClick={() => toggleAccordion('breakup')}
                className="w-full p-4 flex items-center justify-between bg-transparent border-none cursor-pointer hover:bg-slate-50/50 transition-colors"
              >
                <span className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  Price Breakup
                </span>
                {openAccordion.breakup ? <ChevronUp size={18} className="text-primary" /> : <ChevronDown size={18} className="text-slate-500" />}
              </button>

              {openAccordion.breakup && (
                <div className="pb-4 bg-white">
                  <div className="px-4 flex flex-col gap-2.5">
                    {/* Selected Variant Identifier */}
                    <div className="flex items-center justify-between py-1.5 px-3 bg-slate-50 border border-slate-100 rounded-lg text-xs">
                      <span className="text-slate-500 font-medium">Selected Variant SKU:</span>
                      <span className="font-mono font-bold text-slate-800">{currentVariant.sku || currentVariant.skuCode || 'Standard'}</span>
                    </div>

                    {/* Clean Invoice Breakup Box */}
                    <div className="border border-slate-200/80 rounded-xl overflow-hidden bg-white shadow-xs">
                      <div className="p-3.5 flex flex-col gap-2.5 text-xs">
                        {/* 1. MRP */}
                        <div className="flex justify-between items-center py-1 border-b border-slate-100">
                          <span className="text-slate-600 font-medium">Maximum Retail Price (MRP):</span>
                          <span className={`font-semibold ${variantDiscountAmt > 0 ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                            ₹{variantMrp.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>

                        {/* 2. MRP Discount */}
                        {variantDiscountAmt > 0 && (
                          <div className="flex justify-between items-center py-1 border-b border-slate-100 text-rose-600">
                            <span className="font-medium flex items-center gap-1.5">
                              <span>MRP Discount:</span>
                              {discountType === 'Percentage' && discountVal > 0 && (
                                <span className="bg-rose-50 text-rose-600 text-[10px] font-bold py-0.5 px-1.5 rounded">
                                  {discountVal}% OFF
                                </span>
                              )}
                            </span>
                            <span className="font-bold">
                              - ₹{variantDiscountAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        )}

                        {/* 3. Selling Price */}
                        <div className="flex justify-between items-center py-1 border-b border-slate-100">
                          <span className="text-slate-700 font-semibold">Selling Price:</span>
                          <span className="font-bold text-slate-900">
                            ₹{effectiveSellingPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>

                        {/* 4. GST Breakdown (CGST + SGST or IGST) */}
                        {isGstEnabled && effectiveGstRate > 0 ? (
                          <>
                            <div className="flex justify-between items-center py-1 border-b border-slate-100 text-xs">
                              <span className="text-slate-600 font-medium">GST Tax Status:</span>
                              <span className={`font-semibold text-[11px] px-2 py-0.5 rounded ${
                                activeDetail.gstMode === 'INCLUSIVE'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}>
                                {activeDetail.gstMode === 'INCLUSIVE' ? 'Included in Price (Inclusive)' : 'Excluded from Price (Added Extra)'}
                              </span>
                            </div>
                            {isCgstSgst ? (
                              <>
                                <div className="flex justify-between items-center py-1 border-b border-slate-100 text-slate-600">
                                  <span>CGST ({halfGstRate}%):</span>
                                  <span className="font-medium text-slate-800">
                                    {activeDetail.gstMode === 'INCLUSIVE' ? '₹' + cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' (Included)' : '+ ₹' + cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' (Excluded)'}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center py-1 border-b border-slate-100 text-slate-600">
                                  <span>SGST ({halfGstRate}%):</span>
                                  <span className="font-medium text-slate-800">
                                    {activeDetail.gstMode === 'INCLUSIVE' ? '₹' + sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' (Included)' : '+ ₹' + sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' (Excluded)'}
                                  </span>
                                </div>
                              </>
                            ) : (
                              <div className="flex justify-between items-center py-1 border-b border-slate-100 text-slate-600">
                                <span>IGST ({effectiveGstRate}%):</span>
                                <span className="font-medium text-slate-800">
                                  {activeDetail.gstMode === 'INCLUSIVE' ? '₹' + igstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' (Included)' : '+ ₹' + igstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' (Excluded)'}
                                </span>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="flex justify-between items-center py-1 border-b border-slate-100 text-slate-500 text-[11px]">
                            <span>GST Status:</span>
                            <span className="font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Included in Price</span>
                          </div>
                        )}

                        {/* 5. Optional Promo Discount */}
                        {promoDiscountVal > 0 && (
                          <div className="flex justify-between items-center py-1 border-b border-slate-100 text-emerald-600 font-bold">
                            <span>Promo Discount ({promoCodeName}):</span>
                            <span>
                              - ₹{promoDiscountVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Final Total Payable Amount Bar */}
                    <div className="bg-primary text-white py-3 px-4 rounded-xl flex items-center justify-between font-extrabold text-xs shadow-sm">
                      <span>Total Payable Amount</span>
                      <span className="text-base font-sans">
                        ₹{Math.max(0, (pricing.finalPayablePrice || finalTotalAmount) - promoDiscountVal).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Description Section (Tiptap HTML Support) */}
            {(product.description || product.shortDescription) && (
              <div>
                <button
                  type="button"
                  onClick={() => toggleAccordion('desc')}
                  className="w-full p-4 flex items-center justify-between bg-transparent border-none cursor-pointer hover:bg-slate-50/50 transition-colors"
                >
                  <span className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    Product Description
                  </span>
                  {openAccordion.desc ? <ChevronUp size={18} className="text-primary" /> : <ChevronDown size={18} className="text-slate-500" />}
                </button>

                {openAccordion.desc && (
                  <div className="p-4 pt-0 bg-white">
                    {(product.description && product.description.replace(/<[^>]*>/g, '').trim()) || (product.shortDescription && product.shortDescription.replace(/<[^>]*>/g, '').trim()) ? (
                      <div
                        className="tiptap-content text-slate-600 text-xs sm:text-sm leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(product.description || product.shortDescription) }}
                      />
                    ) : (
                      <p className="text-xs text-slate-400 italic py-2 m-0">
                        Detailed craftsmanship and specifications for this product will be updated shortly.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Standalone Certificate of Authenticity Section */}
          {certificatesList.length > 0 && (
            <div className="mt-6 border border-slate-200 rounded-xl p-5 bg-white shadow-sm">
              <h4 className="font-serif text-base font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">
                Certificate of Authenticity
              </h4>
              <div
                onClick={() => setActiveCertModal(certificatesList[0])}
                className="cursor-pointer rounded-lg overflow-hidden border border-slate-100"
              >
                <img
                  src={getImageUrl(certificatesList[0])}
                  alt="Certificate of Authenticity"
                  className="w-full h-auto object-contain block"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dynamic Store Promises Section from DB */}
      {storePromises.length > 0 && (
        <section className="my-16 bg-slate-50 rounded-2xl p-10 border border-slate-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <div className="flex items-center justify-center bg-[#00676b] rounded-xl overflow-hidden h-[340px] relative">
              {promisesBanner ? (
                <img
                  src={getImageUrl(promisesBanner)}
                  alt="Our Promises"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center gap-3 p-6 text-white text-center">
                  <h4 className="font-serif text-2xl font-bold tracking-wide m-0 text-white">
                    CLIICKG Promises
                  </h4>

                </div>
              )}
            </div>

            <div>
              <h3 className="font-serif text-3xl font-normal text-slate-800 mb-6">
                Our Promises
              </h3>

              <div className="flex flex-col gap-5">
                {(() => {
                  const getPromiseIcon = (title = '') => {
                    const lower = title.toLowerCase();
                    if (lower.includes('quality') || lower.includes('shield')) return <ShieldCheck size={18} />;
                    if (lower.includes('brand') || lower.includes('trust')) return <Gem size={18} />;
                    if (lower.includes('pricing') || lower.includes('price')) return <Tag size={18} />;
                    if (lower.includes('design')) return <Sparkles size={18} />;
                    if (lower.includes('customer') || lower.includes('people')) return <Users size={18} />;
                    return <CheckCircle size={18} />;
                  };

                  return storePromises.map((p: any) => (
                    <div key={p.id || p._id} className="flex gap-4 items-center">
                      <div className="flex items-center justify-center w-9 h-9 rounded-full border border-primary bg-primary-light text-primary shrink-0">
                        {p.icon ? (
                          <img src={getImageUrl(p.icon)} alt={p.title || p.name} className="w-5 h-5 object-contain" />
                        ) : (
                          getPromiseIcon(p.title || p.name)
                        )}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-800 m-0">{p.title || p.name}</h4>
                        <p className="text-xs text-slate-500 m-0 mt-0.5 leading-snug">{p.description || p.subtitle}</p>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Dynamic FAQs Section from DB */}
      {faqs.length > 0 && (
        <section className="my-16">
          <h3 className="font-serif text-3xl font-normal text-slate-800 text-center mb-8">
            FAQs
          </h3>
          <div className="max-w-[750px] mx-auto flex flex-col gap-3.5">
            {faqs.map((faq: any) => {
              const faqId = faq.id || faq._id;
              const isOpen = openFaqs[faqId];
              return (
                <div key={faqId} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleFaq(faqId)}
                    className="w-full bg-transparent border-none flex items-center justify-between p-4 px-5 cursor-pointer text-left"
                  >
                    <span className="text-sm font-semibold text-slate-800">{faq.question}</span>
                    {isOpen ? <ChevronUp size={16} className="text-primary" /> : <ChevronDown size={16} className="text-slate-500" />}
                  </button>
                  {isOpen && (
                    <div className="p-5 pt-3 border-t border-slate-100 bg-slate-50/50">
                      <div
                        className="tiptap-content text-slate-600 text-xs sm:text-sm leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(faq.answer || '') }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Related Products Section */}
      {relatedProducts.length > 0 && (
        <section className="my-16">
          <div className="text-center mb-8">
            <h3 className="font-serif text-3xl font-extrabold text-slate-800">
              You Might Also Like
            </h3>
          </div>
          <ProductGrid products={relatedProducts} />
        </section>
      )}

      {/* Product Image Middle Popup Lightbox Modal */}
      {activeImageModal && (
        <div
          onClick={() => setActiveImageModal(null)}
          className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-6 animate-drawer-fade"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-[750px] w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col relative"
          >
            <div className="p-4 px-6 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-800 m-0">
                {product.name} — Preview
              </h3>
              <button
                type="button"
                onClick={() => setActiveImageModal(null)}
                className="bg-slate-100 hover:bg-slate-200 border-none text-slate-500 cursor-pointer p-1.5 rounded-full flex items-center justify-center transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-8 bg-slate-50 flex items-center justify-center">
              <img src={activeImageModal} alt={product.name} className="max-w-full max-h-[65vh] object-contain rounded-lg" />
            </div>

            <div className="p-4 px-6 border-t border-slate-200 flex items-center justify-between">
              <div className="flex gap-2 overflow-x-auto">
                {imageList.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSelectedImage(idx);
                      setActiveImageModal(getImageUrl(img));
                    }}
                    className={`w-12 h-12 rounded-md overflow-hidden cursor-pointer p-0.5 bg-white shrink-0 ${activeImageModal === getImageUrl(img) ? 'border-2 border-primary' : 'border border-slate-300'
                      }`}
                  >
                    <img src={getImageUrl(img)} alt="" className="w-full h-full object-cover rounded" />
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setActiveImageModal(null)}
                className="bg-primary hover:bg-primary-hover text-white border-none py-2 px-5 rounded-md font-semibold cursor-pointer text-xs transition-colors"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Certificate Preview Lightbox Modal */}
      {activeCertModal && (
        <div
          onClick={() => setActiveCertModal(null)}
          className="fixed inset-0 bg-slate-900/75 backdrop-blur-sm z-[9999] flex items-center justify-center p-6 animate-drawer-fade"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-xl max-w-[650px] w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
          >
            <div className="p-4 px-5 border-b border-slate-200 flex items-center justify-between bg-rose-50">
              <div className="flex items-center gap-2">
                <Award size={20} className="text-primary" />
                <h3 className="text-base font-bold text-slate-800 m-0">
                  Authenticity Certificate Preview
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveCertModal(null)}
                className="bg-transparent border-none text-slate-500 cursor-pointer p-1 rounded-full flex items-center justify-center"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto text-center bg-slate-50 flex items-center justify-center">
              <img
                src={getImageUrl(activeCertModal)}
                alt="Authenticity Certificate Full Preview"
                className="max-w-full max-h-[65vh] object-contain rounded-lg shadow-md"
              />
            </div>

            <div className="py-3 px-5 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>Verified Certificate of Authenticity</span>
              <button
                type="button"
                onClick={() => setActiveCertModal(null)}
                className="bg-primary hover:bg-primary-hover text-white border-none py-1.5 px-4 rounded-md font-semibold cursor-pointer transition-colors"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Product Confirmation Alert Modal */}
      {showRemoveAlert && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xs flex items-center justify-center z-[99999] p-4 animate-drawer-fade">
          <div className="bg-white rounded-2xl py-9 px-8 w-full max-w-[420px] shadow-2xl text-center">
            <div className="w-17 h-17 rounded-full border-3 border-amber-400 flex items-center justify-center mx-auto mb-5 text-4xl font-medium text-amber-400 leading-none">
              !
            </div>

            <h3 className="text-2xl font-bold text-slate-700 m-0 mb-2.5">
              Alert
            </h3>

            <p className="text-sm text-slate-500 m-0 mb-7 leading-relaxed">
              Are You Sure You Want to Delete This Product?
            </p>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowRemoveAlert(false)}
                className="bg-white text-rose-600 border border-rose-600 hover:bg-rose-50 py-2.5 px-6 rounded-lg font-bold text-sm cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  removeFromCart(product._id || product.id, variantKey);
                  setShowRemoveAlert(false);
                }}
                className="bg-rose-600 hover:bg-rose-700 text-white border-none py-2.5 px-6 rounded-lg font-bold text-sm cursor-pointer shadow-md transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
