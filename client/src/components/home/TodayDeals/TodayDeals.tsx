'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import cmsService from '../../../services/cms.service';
import getImageUrl from '../../../utils/image.utils';
import { computeCmsTargetUrl } from '../../../utils/cms.utils';
import { ChevronLeft, ChevronRight, AlertTriangle, RefreshCw } from 'lucide-react';
import { TodayDeal, TodayDealBanner } from '../../../types/cms/cms.types';
import { ProductCardSkeleton, SkeletonRect } from '../../ui/Skeleton/Skeleton';

export const TodayDeals: React.FC = () => {
  const router = useRouter();
  const [deals, setDeals] = useState<TodayDeal[]>([]);
  const [banners, setBanners] = useState<TodayDealBanner[]>([]);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDealsData();
  }, []);

  const fetchDealsData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [dealsData, bannersData] = await Promise.all([
        cmsService.getTodayDeals(),
        cmsService.getTodayDealsBanners(),
      ]);
      setDeals(dealsData || []);
      setBanners(bannersData || []);
    } catch (err) {
      console.error('Error fetching today deals component data:', err);
      setError("Failed to load Today's Deals. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full py-8">
        <SkeletonRect height="280px" borderRadius="12px" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {[1, 2, 3].map((n) => (
            <ProductCardSkeleton key={n} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-12 text-rose-500">
        <AlertTriangle size={48} className="text-rose-500 mb-4 mx-auto" />
        <p>{error}</p>
        <button
          onClick={fetchDealsData}
          className="px-4 py-2 bg-primary hover:bg-primary-hover text-white border-none rounded cursor-pointer inline-flex items-center gap-1.5 mt-4 transition-colors"
        >
          <RefreshCw size={16} />
          Retry
        </button>
      </div>
    );
  }

  if (deals.length === 0 && banners.length === 0) {
    return (
      <div className="text-center p-12 text-slate-500">
        <p>No special deals available right now. Check back soon!</p>
      </div>
    );
  }

  return (
    <div className="w-full py-8">
      {banners.length > 0 && (() => {
        const currentBanner = banners[currentBannerIndex];
        const bannerTargetUrl = computeCmsTargetUrl(currentBanner);
        return (
          <div
            onClick={() => bannerTargetUrl && router.push(bannerTargetUrl)}
            className={`relative w-full rounded-xl overflow-hidden mb-12 bg-slate-900 ${bannerTargetUrl ? 'cursor-pointer' : ''}`}
          >
            <img
              src={getImageUrl(currentBanner?.image)}
              alt="Today's Deal Banner"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = '/uploads/fallbackimg.png';
              }}
              className="w-full h-auto min-h-[120px] xs:min-h-[160px] sm:min-h-[280px] max-h-[240px] xs:max-h-[320px] sm:max-h-[560px] object-cover object-center block"
            />
            {banners.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); setCurrentBannerIndex((prev) => (prev === 0 ? banners.length - 1 : prev - 1)); }}
                  className="absolute top-1/2 left-5 -translate-y-1/2 bg-white/80 hover:bg-white border-none rounded-full w-10 h-10 flex items-center justify-center cursor-pointer shadow-md z-10 text-slate-800 transition-colors"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setCurrentBannerIndex((prev) => (prev + 1) % banners.length); }}
                  className="absolute top-1/2 right-5 -translate-y-1/2 bg-white/80 hover:bg-white border-none rounded-full w-10 h-10 flex items-center justify-center cursor-pointer shadow-md z-10 text-slate-800 transition-colors"
                >
                  <ChevronRight size={20} />
                </button>
              </>
            )}
          </div>
        );
      })()}

      {deals.length > 0 && (
        <div className="mt-12">
          <div className="relative flex flex-col md:flex-row items-center justify-center text-center mb-8 px-4 w-full">
            <div className="text-center">
              <h2 className="font-serif text-3xl sm:text-4xl font-light tracking-wide text-slate-900 m-0 text-center">
                Today's Deals
              </h2>
              <p className="uppercase tracking-widest text-xs font-semibold text-slate-500 mt-1 mb-0 text-center">
                SPECIAL OFFERS
              </p>
              <div className="w-10 h-0.5 bg-primary mx-auto mt-2.5 rounded-full" />
            </div>

            <Link
              href="/today-deals"
              className="mt-4 md:mt-0 md:absolute md:right-6 lg:right-12 top-1/2 md:-translate-y-1/2 inline-flex items-center justify-center gap-3 py-3 px-9 border border-primary bg-primary hover:bg-primary-hover text-white text-xs font-semibold tracking-widest uppercase no-underline transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg group"
            >
              <span>VIEW ALL DEALS</span>
              <span className="text-base font-normal leading-none group-hover:translate-x-1.5 transition-transform duration-300">
                &rarr;
              </span>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {deals.map((deal: any) => {
              const linkUrl = computeCmsTargetUrl({
                linkUrl: deal.linkUrl,
                linkType: deal.linkType || deal.type || deal.selectType,
                linkId: deal.linkId || deal.name || (deal.productIds && deal.productIds[0]),
                id: deal.linkId || deal.name || (deal.productIds && deal.productIds[0]),
              });
              return (
                <Link
                  key={deal.id || deal._id}
                  href={linkUrl}
                  className="bg-white border border-slate-200/80 rounded-2xl p-6 no-underline shadow-[0_4px_14px_rgba(0,0,0,0.03)] hover:-translate-y-1.5 hover:border-primary hover:shadow-[0_12px_28px_rgba(2,60,35,0.12)] transition-all duration-300 flex flex-col group"
                >
                  <div>
                    <span className="bg-emerald-50 text-primary py-1 px-2.5 rounded-full text-xs font-bold uppercase tracking-wider">
                      {deal.type || 'Special Deal'}
                    </span>
                    <h3 className="text-lg font-bold text-slate-800 mt-3 mb-2 group-hover:text-primary transition-colors">{deal.title}</h3>
                    {deal.subtitle && <p className="text-sm text-slate-500 m-0">{deal.subtitle}</p>}
                  </div>
                  <div className="mt-auto pt-4 flex items-center justify-between border-t border-slate-100">
                    <span className="text-xs text-primary font-bold group-hover:translate-x-1 transition-transform">View Deal &rarr;</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default TodayDeals;
