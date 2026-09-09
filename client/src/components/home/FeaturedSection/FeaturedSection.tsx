'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import cmsService from '../../../services/cms.service';
import getImageUrl from '../../../utils/image.utils';
import Carousel from '../Carousel/Carousel';
import { FeaturedSection as FeaturedSectionType } from '../../../types/cms/cms.types';
import { ProductCardSkeleton } from '../../ui/Skeleton/Skeleton';

export const FeaturedSection: React.FC = () => {
  const [sections, setSections] = useState<FeaturedSectionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSections();
  }, []);

  const fetchSections = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await cmsService.getFeaturedSections();
      setSections(data || []);
    } catch (err) {
      console.error('Error fetching featured sections:', err);
      setError('Failed to load featured sections.');
    } finally {
      setLoading(false);
    }
  };

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

  if (loading) {
    return (
      <div className="w-full py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((n) => (
            <ProductCardSkeleton key={n} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-12 text-rose-500">
        <p>{error}</p>
        <button
          onClick={fetchSections}
          className="px-4 py-2 bg-primary hover:bg-primary-hover text-white border-none rounded cursor-pointer transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (sections.length === 0) return null;

  return (
    <div className="w-full">
      {sections.map((section: any, sIdx) => {
        const gridClasses = getGridClasses(section.gridType);
        const isCarousel = section.carouselType === 'carousel_type';
        const items = section.items || section.banners || [];
        const isBanner =
          section.gridType === 'Grid 1 (Banner)' ||
          section.gridType === 'Grid1' ||
          section.gridType === 'Grid 2 (Mini Banner)' ||
          section.gridType === 'Grid2';

        return (
          <section key={section.id || section._id || sIdx} className="my-12">
            <div className="relative flex flex-col md:flex-row items-center justify-center text-center mb-8 px-4 w-full">
              <div className="text-center">
                <h3 className="font-serif text-3xl sm:text-4xl font-light tracking-wide text-slate-900 m-0 text-center">
                  {section.title}
                </h3>
                {section.shortDescription && (
                  <p className="text-sm text-slate-500 mt-1 mb-0 text-center">{section.shortDescription}</p>
                )}
                <div className="w-10 h-0.5 bg-primary mx-auto mt-2.5 rounded-full" />
              </div>

              {items.length >= 4 && (
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

            {isCarousel ? (
              <Carousel itemsPerView={getItemsPerView(section.gridType)} autoSwipe={true} autoSwipeInterval={3000}>
                {items.map((item: any, idx: number) => (
                  <Link
                    key={idx}
                    href={item.linkUrl || '/shop'}
                    className={`w-full flex flex-col no-underline transition-all duration-300 ${
                      isBanner
                        ? 'border-none shadow-none bg-slate-900 rounded-2xl overflow-hidden'
                        : 'bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-[0_4px_14px_rgba(0,0,0,0.03)] hover:-translate-y-1.5 hover:border-primary hover:shadow-[0_12px_28px_rgba(2,60,35,0.12)]'
                    }`}
                  >
                    <div
                      className={`w-full overflow-hidden flex items-center justify-center ${
                        isBanner
                          ? 'aspect-[16/9] sm:aspect-[21/9] lg:aspect-[24/8] bg-slate-900'
                          : 'aspect-square bg-[#faf9f8]'
                      }`}
                    >
                      <img
                        src={getImageUrl(item.image)}
                        alt={item.title || 'Featured item'}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = '/uploads/fallbackimg.png';
                        }}
                        className="w-full h-full object-cover object-center transition-transform duration-500 hover:scale-105"
                      />
                    </div>
                    {!isBanner && (
                      <div className="border-t border-slate-100 py-3 px-2 bg-white text-center flex items-center justify-center min-h-[44px]">
                        <span className="text-xs sm:text-sm font-bold text-slate-800 tracking-wide line-clamp-1">{item.title}</span>
                      </div>
                    )}
                  </Link>
                ))}
              </Carousel>
            ) : (
              <div className={gridClasses}>
                {items.map((item: any, idx: number) => (
                  <div key={idx} className="w-full flex">
                    <Link
                      href={item.linkUrl || '/shop'}
                      className={`w-full flex flex-col no-underline transition-all duration-300 ${
                        isBanner
                          ? 'border-none shadow-none bg-slate-900 rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1'
                          : 'bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-[0_4px_14px_rgba(0,0,0,0.03)] hover:-translate-y-1.5 hover:border-primary hover:shadow-[0_12px_28px_rgba(2,60,35,0.12)] h-full'
                      }`}
                    >
                      <div
                        className={`w-full overflow-hidden flex items-center justify-center ${
                          isBanner
                            ? section.gridType === 'Grid 2 (Mini Banner)' || section.gridType === 'Grid2'
                              ? 'aspect-[16/9] sm:aspect-[16/8] lg:aspect-[16/7] bg-slate-900'
                              : 'aspect-[16/9] sm:aspect-[21/9] lg:aspect-[24/8] bg-slate-900'
                            : section.gridType === 'Grid 3' || section.gridType === 'Grid3'
                            ? 'aspect-[4/3] sm:aspect-square md:aspect-[4/3] bg-[#faf9f8]'
                            : 'aspect-square bg-[#faf9f8]'
                        }`}
                      >
                        <img
                          src={getImageUrl(item.image)}
                          alt={item.title || 'Featured item'}
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = '/uploads/fallbackimg.png';
                          }}
                          className="w-full h-full object-cover object-center transition-transform duration-500 hover:scale-105"
                        />
                      </div>
                      {!isBanner && (
                        <div className="border-t border-slate-100 py-3 px-2 bg-white text-center flex items-center justify-center min-h-[44px]">
                          <span className="text-xs sm:text-sm font-bold text-slate-800 tracking-wide line-clamp-1">{item.title}</span>
                        </div>
                      )}
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
};

export default FeaturedSection;
