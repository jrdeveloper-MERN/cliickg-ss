'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Tag } from 'lucide-react';
import cmsService from '../../services/cms.service';
import categoryService from '../../services/category.service';
import productService from '../../services/product.service';
import getImageUrl from '../../utils/image.utils';
import { computeCmsTargetUrl } from '../../utils/cms.utils';
import Carousel from '../../components/home/Carousel/Carousel';
import ProductGrid from '../../components/products/ProductGrid';
import ProductCard from '../../components/products/ProductCard';
import { TodayDeal, TodayDealBanner } from '../../types/cms/cms.types';
import { MainCategory, Category, SubCategory } from '../../types/categories/category.types';
import { Product } from '../../types/products/product.types';
import ErrorState from '../../components/ui/ErrorState/ErrorState';
import { parseAppError, isNetworkOrServerDown, AppError } from '../../utils/error-handler.utils';
import { ProductCardSkeleton, SkeletonRect } from '../../components/ui/Skeleton/Skeleton';

export default function TodayDealsPage() {
  const router = useRouter();
  const [deals, setDeals] = useState<TodayDeal[]>([]);
  const [banners, setBanners] = useState<TodayDealBanner[]>([]);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [mainCategories, setMainCategories] = useState<MainCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<AppError | null>(null);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setPageError(null);
      const [dealsData, bannersData, mainCats, cats, subCats, prodsRes] = await Promise.all([
        cmsService.getTodayDeals().catch((e) => {
          if (isNetworkOrServerDown(e)) throw e;
          return [];
        }),
        cmsService.getTodayDealsBanners().catch((e) => {
          if (isNetworkOrServerDown(e)) throw e;
          return [];
        }),
        categoryService.getMainCategories().catch((e) => {
          if (isNetworkOrServerDown(e)) throw e;
          return [];
        }),
        categoryService.getCategories().catch((e) => {
          if (isNetworkOrServerDown(e)) throw e;
          return [];
        }),
        categoryService.getSubCategories().catch((e) => {
          if (isNetworkOrServerDown(e)) throw e;
          return [];
        }),
        productService.getProducts({ limit: 100 }).catch((e) => {
          if (isNetworkOrServerDown(e)) throw e;
          return { data: [], total: 0 };
        }),
      ]);

      const activeBanners = (bannersData || []).filter(
        (b: any) => b.status === 'Active' || (b.status !== 'Inactive' && b.status !== 'Disabled' && b.status !== 'Deactive')
      );
      const activeDeals = (dealsData || []).filter(
        (d: any) => d.status === 'Active' || (d.status !== 'Inactive' && d.status !== 'Disabled' && d.status !== 'Deactive')
      );

      setBanners(activeBanners);
      setDeals(activeDeals);
      setMainCategories((mainCats || []).filter((c: any) => c.status !== 'Inactive'));
      setCategories((cats || []).filter((c: any) => c.status !== 'Inactive'));
      setSubCategories((subCats || []).filter((c: any) => c.status !== 'Inactive'));
      setProducts(prodsRes.data || []);
    } catch (err: any) {
      console.error('Error loading Today Deals CMS data:', err);
      if (isNetworkOrServerDown(err)) {
        setPageError(parseAppError(err));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const getItemsPerView = (gridType?: string) => {
    const mapping: Record<string, number> = {
      'Grid 1 (Banner)': 1,
      'Grid 2 (Mini Banner)': 2,
      'Grid 3': 3,
      'Grid 4': 4,
      'Grid 6': 6,
      'Filtered Grid': 5,
      'Filtered': 5,
      'Grid1': 1,
      'Grid2': 2,
      'Grid3': 3,
      'Grid4': 4,
      'Grid6': 6,
    };
    return gridType ? mapping[gridType] || 4 : 4;
  };

  const getGridClasses = (gridType?: string) => {
    switch (gridType) {
      case 'Grid 1 (Banner)':
      case 'Grid1':
        return 'grid grid-cols-1 w-full max-w-[1360px] gap-6 mx-auto px-3 sm:px-6';
      case 'Grid 2 (Mini Banner)':
      case 'Grid2':
        return 'grid grid-cols-1 sm:grid-cols-2 w-full max-w-[1360px] gap-4 sm:gap-6 mx-auto px-3 sm:px-6';
      case 'Grid 3':
      case 'Grid3':
        return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 w-full max-w-[1360px] gap-4 sm:gap-6 mx-auto px-3 sm:px-6';
      case 'Grid 6':
      case 'Grid6':
        return 'grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 w-full max-w-[1360px] gap-3 sm:gap-4 mx-auto px-3 sm:px-6';
      case 'Filtered Grid':
      case 'Filtered':
        return 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 w-full max-w-[1360px] gap-3.5 sm:gap-5 mx-auto px-3 sm:px-6';
      case 'Grid 4':
      case 'Grid4':
      default:
        return 'grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 w-full max-w-[1360px] gap-3.5 sm:gap-5 lg:gap-6 mx-auto px-3 sm:px-6';
    }
  };

  const renderSectionContent = (section: any) => {
    const type = section.type || section.selectType || 'main_category';
    const gridClasses = getGridClasses(section.gridType);
    const itemsPerView = getItemsPerView(section.gridType);
    const isCarousel = section.carouselType === 'carousel_type';
    const sectionMediaType = section.mediaType || 'image';

    const isBanner =
      section.gridType === 'Grid 1 (Banner)' ||
      section.gridType === 'Grid1';

    const isMiniBanner =
      section.gridType === 'Grid 2 (Mini Banner)' ||
      section.gridType === 'Grid2';

    const isBannerSection = isBanner || isMiniBanner;

    const getAspectClass = () => {
      if (sectionMediaType === 'video') {
        if (isBanner) return 'aspect-[16/9] sm:aspect-[21/9] lg:aspect-[24/8] max-h-[500px]';
        if (isMiniBanner) return 'aspect-[16/9] sm:aspect-[16/8] max-h-[420px]';
        return 'aspect-[9/16] max-h-[480px] sm:max-h-[540px]';
      }
      if (isBanner) {
        return 'aspect-[16/9] sm:aspect-[21/9] lg:aspect-[24/8]';
      }
      if (isMiniBanner) {
        return 'aspect-[16/9] sm:aspect-[16/8] lg:aspect-[16/7]';
      }
      if (section.gridType === 'Grid 3' || section.gridType === 'Grid3') {
        return 'aspect-[4/3] sm:aspect-square md:aspect-[4/3]';
      }
      return 'aspect-square';
    };

    const renderMedia = (src: string, alt: string) => {
      if (sectionMediaType === 'video') {
        return (
          <video
            src={getImageUrl(src)}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
          />
        );
      }
      return (
        <img
          src={getImageUrl(src)}
          alt={alt}
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = '/uploads/fallbackimg.png';
          }}
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
        />
      );
    };

    const buildCard = (imageSrc: string, title: string, link: string, key: any) => {
      if (isBannerSection) {
        return (
          <Link
            key={key}
            href={link}
            className="w-full flex flex-col no-underline rounded-2xl overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.04)] hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group bg-slate-900"
          >
            <div className={`w-full ${getAspectClass()} overflow-hidden flex items-center justify-center`}>
              {renderMedia(imageSrc, title)}
            </div>
          </Link>
        );
      }

      return (
        <Link
          key={key}
          href={link}
          className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden no-underline shadow-[0_4px_14px_rgba(0,0,0,0.03)] hover:-translate-y-1.5 hover:shadow-[0_12px_28px_rgba(2,60,35,0.12)] hover:border-primary transition-all duration-300 flex flex-col group w-full h-full"
        >
          <div className={`w-full ${getAspectClass()} overflow-hidden bg-[#faf9f8] flex items-center justify-center`}>
            {renderMedia(imageSrc, title)}
          </div>
          {sectionMediaType !== 'video' && (
            <div className="border-t border-slate-100 py-3 px-2 bg-white text-center flex items-center justify-center min-h-[44px]">
              <span className="text-xs sm:text-sm font-bold text-slate-800 tracking-wide group-hover:text-primary transition-colors line-clamp-1">
                {title}
              </span>
            </div>
          )}
        </Link>
      );
    };

    let items: any[] = [];
    let renderCard: any = null;

    if (type === 'main_category') {
      if (section.items && section.items.length > 0) {
        items = section.items;
        renderCard = (item: any, idx: number) => {
          const mainCatObj = mainCategories.find((c) => String(c.id || c._id) === String(item.name));
          const imageSrc = item.image || (mainCatObj ? mainCatObj.image : '');
          const title = item.title || (mainCatObj ? mainCatObj.name : '');
          const targetUrl = computeCmsTargetUrl({ type: 'MainCategory', id: item.name || (mainCatObj ? (mainCatObj.id || mainCatObj._id) : '') });
          return buildCard(imageSrc, title, targetUrl, idx);
        };
      } else {
        items = mainCategories;
        renderCard = (item: any, idx: number) => {
          const targetUrl = computeCmsTargetUrl({ type: 'MainCategory', id: item.id || item._id });
          return buildCard(item.image, item.name, targetUrl, item.id || item._id || idx);
        };
      }
    } else if (type === 'category') {
      if (section.items && section.items.length > 0) {
        items = section.items;
        renderCard = (item: any, idx: number) => {
          const catObj = categories.find((c) => String(c.id || c._id) === String(item.name));
          const imageSrc = item.image || (catObj ? catObj.image : '');
          const title = item.title || (catObj ? catObj.name : '');
          const targetUrl = computeCmsTargetUrl({ type: 'Category', id: item.name || (catObj ? (catObj.id || catObj._id) : '') });
          return buildCard(imageSrc, title, targetUrl, idx);
        };
      } else {
        items = categories;
        renderCard = (item: any, idx: number) => {
          const targetUrl = computeCmsTargetUrl({ type: 'Category', id: item.id || item._id });
          return buildCard(item.image, item.name, targetUrl, item.id || item._id || idx);
        };
      }
    } else if (type === 'sub_category') {
      if (section.items && section.items.length > 0) {
        items = section.items;
        renderCard = (item: any, idx: number) => {
          const subObj = subCategories.find((c) => String(c.id || c._id) === String(item.name));
          const imageSrc = item.image || (subObj ? subObj.image : '');
          const title = item.title || (subObj ? subObj.name : '');
          const targetUrl = computeCmsTargetUrl({ type: 'SubCategory', id: item.name || (subObj ? (subObj.id || subObj._id) : '') });
          return buildCard(imageSrc, title, targetUrl, idx);
        };
      } else {
        items = subCategories;
        renderCard = (item: any, idx: number) => {
          const targetUrl = computeCmsTargetUrl({ type: 'SubCategory', id: item.id || item._id });
          return buildCard(item.image, item.name, targetUrl, item.id || item._id || idx);
        };
      }
    } else if (type === 'product_price' || type === 'products_grid') {
      if (type === 'products_grid' && section.items && section.items.length > 0) {
        items = section.items
          .map((it: any) => {
            const prod = products.find((p) => String(p.id || p._id) === String(it.name));
            if (!prod) return null;
            return {
              ...prod,
              name: it.title || prod.name,
              image: it.image || prod.image || (prod as any).productImage,
            };
          })
          .filter(Boolean);
      } else if (section.productIds && section.productIds.length > 0) {
        items = products.filter((p) => section.productIds.some((id: string) => String(id) === String(p.id || p._id)));
      } else {
        items = products.filter((p) => p.isTodayDeal || p.discountPercentage);
      }
      if (isCarousel) {
        return (
          <Carousel itemsPerView={itemsPerView} autoSwipe={true} autoSwipeInterval={3000}>
            {items.map((prod: Product, idx: number) => (
              <ProductCard key={prod.id || prod._id || idx} product={prod} />
            ))}
          </Carousel>
        );
      }
      return <ProductGrid products={items} gridClass={gridClasses} columns={itemsPerView} />;
    }

    if (items.length === 0) return null;

    if (isCarousel) {
      return (
        <Carousel itemsPerView={itemsPerView} autoSwipe={true} autoSwipeInterval={3000}>
          {items.map((item, idx) => renderCard(item, idx))}
        </Carousel>
      );
    }

    return (
      <div className={gridClasses}>
        {items.map((item, idx) => (
          <div key={idx} className="w-full flex">
            {renderCard(item, idx)}
          </div>
        ))}
      </div>
    );
  };

  const renderBanner = () => {
    if (banners.length === 0) return null;
    const banner = banners[currentBannerIndex];
    const bannerImgSrc = getImageUrl(banner.image);
    const targetLink = banner.linkUrl || (
      banner.linkType === 'MainCategory' && banner.linkId ? `/shop?mainCategory=${encodeURIComponent(banner.linkId)}` :
      banner.linkType === 'Category' && banner.linkId ? `/category/${banner.linkId}` :
      banner.linkType === 'SubCategory' && banner.linkId ? `/shop?subCategory=${encodeURIComponent(banner.linkId)}` :
      banner.linkType === 'Product' && banner.linkId ? `/product/${banner.linkId}` : ''
    );

    return (
      <div
        onClick={() => targetLink && router.push(targetLink)}
        className={`relative w-full mb-8 overflow-hidden bg-slate-900 ${targetLink ? 'cursor-pointer' : ''}`}
      >
        <img
          src={bannerImgSrc}
          alt={banner.title || "Today's Deals Banner"}
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = '/uploads/fallbackimg.png';
          }}
          className="w-full h-auto min-h-[120px] xs:min-h-[160px] sm:min-h-[280px] max-h-[240px] xs:max-h-[320px] sm:max-h-[560px] object-cover object-center block"
        />
        {banners.length > 1 && (
          <>
            <button
              aria-label="Previous slide"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setCurrentBannerIndex((prev) => (prev === 0 ? banners.length - 1 : prev - 1));
              }}
              className="absolute left-6 top-1/2 -translate-y-1/2 z-20 bg-white/75 hover:bg-white border-none rounded-full w-11 h-11 flex items-center justify-center text-slate-800 cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.2)] transition-colors"
            >
              <ChevronLeft size={26} />
            </button>
            <button
              aria-label="Next slide"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
              }}
              className="absolute right-6 top-1/2 -translate-y-1/2 z-20 bg-white/75 hover:bg-white border-none rounded-full w-11 h-11 flex items-center justify-center text-slate-800 cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.2)] transition-colors"
            >
              <ChevronRight size={26} />
            </button>
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2 z-20">
              {banners.map((_, idx) => (
                <div
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentBannerIndex(idx);
                  }}
                  className={`h-2 rounded-full cursor-pointer transition-all duration-300 ${
                    idx === currentBannerIndex ? 'w-7 bg-primary' : 'w-2 bg-white/80'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  if (pageError) {
    return (
      <div className="w-full min-h-[75vh] flex items-center justify-center">
        <ErrorState error={pageError} onRetry={fetchAllData} fullPage />
      </div>
    );
  }

  return (
    <div className="w-full min-h-[80vh] overflow-x-hidden">
      {loading ? (
        <div className="w-[min(100%-2rem,1360px)] md:w-[min(100%-3rem,1360px)] mx-auto py-8 pb-16">
          <SkeletonRect height="280px" borderRadius="16px" />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-12">
            {[1, 2, 3, 4].map((n) => (
              <ProductCardSkeleton key={n} />
            ))}
          </div>
        </div>
      ) : banners.length === 0 && deals.length === 0 ? (
        <div className="w-[min(100%-2rem,1360px)] md:w-[min(100%-3rem,1360px)] mx-auto py-16 pb-24 text-center">
          <div className="w-20 h-20 rounded-full bg-rose-50 flex items-center justify-center mx-auto mb-6">
            <Tag size={36} className="text-primary" />
          </div>
          <h1 className="font-serif text-3xl md:text-4xl font-normal text-indigo-950 mb-3">
            No Active Today's Deals
          </h1>
          <p className="text-slate-500 text-sm max-w-[500px] mx-auto mb-8 leading-relaxed">
            There are currently no active Today's Deals banners or special promotional offers available. Please check back soon for new exclusive discounts!
          </p>
          <Link
            href="/shop"
            className="inline-block py-3.5 px-8 bg-primary hover:bg-primary-hover text-white rounded-full font-bold text-sm no-underline shadow-md transition-colors"
          >
            Explore All Products
          </Link>
        </div>
      ) : (
        <>
          {renderBanner()}
          <div className={`w-[min(100%-2rem,1360px)] md:w-[min(100%-3rem,1360px)] mx-auto pb-16 ${banners.length > 0 ? 'pt-8' : 'pt-12'}`}>
            {deals.length > 0 ? (
              deals.map((section: any, sIdx) => {
                const getSectionItemsCount = (sec: any) => {
                  if (sec.items && sec.items.length > 0) return sec.items.length;
                  if (sec.productIds && sec.productIds.length > 0) return sec.productIds.length;
                  if (sec.type === 'main_category') return mainCategories.length;
                  if (sec.type === 'category') return categories.length;
                  if (sec.type === 'sub_category') return subCategories.length;
                  if (sec.type === 'product_price' || sec.type === 'products_grid') return products.length;
                  return 0;
                };

                const hasFourOrMore = getSectionItemsCount(section) >= 4;

                const subtitleText =
                  section.shortDescription ||
                  section.subtitle ||
                  (section.type
                    ? section.type.replace('_', ' ').toUpperCase()
                    : '');

                return (
                  <section key={section.id || section._id || sIdx} className="my-14">
                    <div className="relative flex flex-col md:flex-row items-center justify-center text-center mb-8 px-4 w-full">
                      <div className="text-center">
                        <h3 className="font-serif text-3xl sm:text-4xl font-light tracking-wide text-slate-900 m-0 text-center">
                          {section.title}
                        </h3>
                        {subtitleText && (
                          <p className="uppercase tracking-widest text-xs font-semibold text-slate-500 mt-1 mb-0 text-center">
                            {subtitleText}
                          </p>
                        )}
                        <div className="w-10 h-0.5 bg-primary mx-auto mt-2.5 rounded-full" />
                      </div>

                      {hasFourOrMore && (
                        <Link
                          href="/shop"
                          className="mt-4 md:mt-0 md:absolute md:right-6 lg:right-24 top-1/2 md:-translate-y-1/2 inline-flex items-center justify-center gap-3 py-3 px-9 border border-primary bg-primary hover:bg-primary-hover text-white text-xs font-semibold tracking-widest uppercase no-underline transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg group"
                        >
                          <span>VIEW COLLECTION</span>
                          <span className="text-base font-normal leading-none group-hover:translate-x-1.5 transition-transform duration-300">
                            &rarr;
                          </span>
                        </Link>
                      )}
                    </div>

                    {renderSectionContent(section)}
                  </section>
                );
              })
            ) : (
              <ProductGrid products={products.filter((p) => p.isTodayDeal || p.discountPercentage)} />
            )}
          </div>
        </>
      )}
    </div>
  );
}
