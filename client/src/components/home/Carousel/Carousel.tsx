'use client';

import React, { useState, useEffect, useRef } from 'react';

export interface CarouselProps {
  children: React.ReactNode;
  itemsPerView?: number;
  autoSwipe?: boolean;
  autoSwipeInterval?: number;
}

export const Carousel: React.FC<CarouselProps> = ({
  children,
  itemsPerView = 4,
  autoSwipe = true,
  autoSwipeInterval = 5000,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [effectiveItemsPerView, setEffectiveItemsPerView] = useState(itemsPerView);

  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const childrenArray = React.Children.toArray(children);
  const totalItems = childrenArray.length;

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (itemsPerView === 1) {
        setEffectiveItemsPerView(1);
      } else if (itemsPerView === 2) {
        setEffectiveItemsPerView(width < 640 ? 1 : 2);
      } else if (itemsPerView === 3) {
        setEffectiveItemsPerView(width < 640 ? 1 : width < 1024 ? 2 : 3);
      } else if (itemsPerView === 6) {
        setEffectiveItemsPerView(width < 480 ? 2 : width < 768 ? 3 : width < 1024 ? 4 : 6);
      } else if (itemsPerView === 5) {
        setEffectiveItemsPerView(width < 480 ? 2 : width < 768 ? 3 : width < 1024 ? 4 : 5);
      } else {
        // itemsPerView 4 (default product/category carousel)
        setEffectiveItemsPerView(width < 540 ? 2 : width < 1024 ? 3 : 4);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [itemsPerView]);

  const maxIndex = Math.max(0, totalItems - effectiveItemsPerView);

  useEffect(() => {
    if (currentIndex > maxIndex) {
      setCurrentIndex(maxIndex);
    }
  }, [maxIndex, currentIndex]);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev < maxIndex ? prev + 1 : 0));
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : maxIndex));
  };

  useEffect(() => {
    if (!autoSwipe || maxIndex <= 0 || isHovered) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev < maxIndex ? prev + 1 : 0));
    }, autoSwipeInterval);

    return () => clearInterval(timer);
  }, [autoSwipe, maxIndex, isHovered, autoSwipeInterval]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsHovered(true);
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    setIsHovered(false);
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50;

    if (distance > minSwipeDistance) {
      nextSlide();
    } else if (distance < -minSwipeDistance) {
      prevSlide();
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  const gapPx = 16;

  return (
    <div
      className="relative flex flex-col items-center w-full px-2"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="flex items-center w-full relative">
        {maxIndex > 0 && (
          <button
            type="button"
            onClick={prevSlide}
            aria-label="Previous item"
            className="absolute -left-1 sm:-left-3.5 top-1/2 -translate-y-1/2 shrink-0 bg-white/75 hover:bg-primary text-slate-700 hover:text-white border border-slate-200/80 hover:border-primary rounded-full w-8 h-8 sm:w-10 sm:h-10 aspect-square cursor-pointer flex items-center justify-center backdrop-blur-xs opacity-50 hover:opacity-100 transition-all duration-200 shadow-sm hover:shadow-md z-10"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        )}

        <div className="overflow-hidden flex-1 py-1 px-0.5">
          <div
            className="flex w-full transition-transform duration-400 ease-[cubic-bezier(0.25,1,0.5,1)]"
            style={{
              gap: `${gapPx}px`,
              transform: `translateX(calc(-${currentIndex} * (100% + ${gapPx}px) / ${effectiveItemsPerView}))`,
            }}
          >
            {childrenArray.map((child, idx) => (
              <div
                key={idx}
                className="min-w-0"
                style={{
                  flex: `0 0 calc((100% - ${(effectiveItemsPerView - 1) * gapPx}px) / ${effectiveItemsPerView})`,
                }}
              >
                {child}
              </div>
            ))}
          </div>
        </div>

        {maxIndex > 0 && (
          <button
            type="button"
            onClick={nextSlide}
            aria-label="Next item"
            className="absolute -right-1 sm:-right-3.5 top-1/2 -translate-y-1/2 shrink-0 bg-white/75 hover:bg-primary text-slate-700 hover:text-white border border-slate-200/80 hover:border-primary rounded-full w-8 h-8 sm:w-10 sm:h-10 aspect-square cursor-pointer flex items-center justify-center backdrop-blur-xs opacity-50 hover:opacity-100 transition-all duration-200 shadow-sm hover:shadow-md z-10"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        )}
      </div>

      {maxIndex > 0 && (
        <div className="flex items-center justify-center gap-1.5 mt-4">
          {Array.from({ length: maxIndex + 1 }).map((_, index) => {
            const isActive = index === currentIndex;
            return (
              <button
                key={index}
                type="button"
                className={`h-2 rounded-full cursor-pointer transition-all duration-300 border-none p-0 ${isActive ? 'w-6 bg-primary' : 'w-2 bg-slate-300'
                  }`}
                onClick={() => setCurrentIndex(index)}
                aria-label={`Go to slide ${index + 1}`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Carousel;
