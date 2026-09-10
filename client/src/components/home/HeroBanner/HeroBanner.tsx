'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import cmsService from '../../../services/cms.service';
import getImageUrl from '../../../utils/image.utils';
import { computeCmsTargetUrl } from '../../../utils/cms.utils';
import { HeroBanner as HeroBannerType } from '../../../types/cms/cms.types';
import { HeroSkeleton } from '../../ui/Skeleton/Skeleton';

export const HeroBanner: React.FC = () => {
  const [banners, setBanners] = useState<HeroBannerType[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      const data = await cmsService.getBanners();
      const activeHeroBanners = (data || []).filter(
        (b: any) => b.status !== 'Inactive' && (!b.section || b.section === 'Hero Banner')
      );

      if (activeHeroBanners.length > 0) {
        setBanners(activeHeroBanners);
      } else {
        setBanners([]);
      }
    } catch (err) {
      console.error('Error in fetchBanners:', err);
      setBanners([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <HeroSkeleton />;
  }

  if (banners.length === 0) return null;

  const currentBanner = banners[currentIndex];
  const targetLink = computeCmsTargetUrl(currentBanner);
  const bannerImgSrc = getImageUrl(currentBanner.image);

  return (
    <div
      onClick={() => router.push(targetLink)}
      className="relative w-full mb-8 bg-slate-900 overflow-hidden cursor-pointer"
    >
      <img
        src={bannerImgSrc}
        alt={currentBanner.title || 'Banner'}
        // @ts-ignore
        fetchPriority="high"
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
            onClick={(e) => {
              e.stopPropagation();
              setCurrentIndex((prev) => (prev === 0 ? banners.length - 1 : prev - 1));
            }}
            className="absolute left-6 top-1/2 -translate-y-1/2 z-20 bg-white/75 hover:bg-white border-none rounded-full w-11 h-11 flex items-center justify-center text-slate-800 cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.2)] transition-colors"
          >
            <ChevronLeft size={26} />
          </button>

          <button
            aria-label="Next slide"
            onClick={(e) => {
              e.stopPropagation();
              setCurrentIndex((prev) => (prev + 1) % banners.length);
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
                  setCurrentIndex(idx);
                }}
                className={`h-2 rounded-full cursor-pointer transition-all duration-300 ${
                  idx === currentIndex ? 'w-7 bg-primary' : 'w-2 bg-white/80'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default HeroBanner;
