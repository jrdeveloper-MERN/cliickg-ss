'use client';

import React from 'react';

export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '20px',
  borderRadius = '8px',
  className = '',
  style = {},
}) => {
  return (
    <div
      className={`bg-slate-200 animate-pulse ${className}`}
      aria-hidden="true"
      style={{
        width,
        height,
        borderRadius,
        ...style,
      }}
    />
  );
};

export const SkeletonText: React.FC<{ lines?: number; height?: string | number; gap?: string | number }> = ({
  lines = 3,
  height = '14px',
  gap = '8px',
}) => {
  return (
    <div className="flex flex-col w-full" style={{ gap }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={height}
          width={i === lines - 1 && lines > 1 ? '70%' : '100%'}
          borderRadius="4px"
        />
      ))}
    </div>
  );
};

export const SkeletonCircle: React.FC<{ size?: string | number }> = ({ size = '48px' }) => {
  return <Skeleton width={size} height={size} borderRadius="50%" />;
};

export const SkeletonRect: React.FC<{ width?: string | number; height?: string | number; borderRadius?: string | number }> = ({
  width = '100%',
  height = '180px',
  borderRadius = '12px',
}) => {
  return <Skeleton width={width} height={height} borderRadius={borderRadius} />;
};

export const ProductCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-3.5 shadow-sm">
      <SkeletonRect height="210px" borderRadius="8px" />
      <Skeleton width="40%" height="12px" borderRadius="4px" />
      <Skeleton width="85%" height="16px" borderRadius="4px" />
      <div className="flex justify-between items-center mt-1">
        <Skeleton width="45%" height="20px" borderRadius="4px" />
        <Skeleton width="30%" height="28px" borderRadius="6px" />
      </div>
    </div>
  );
};

export const ProductDetailSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 my-8">
      <div>
        <SkeletonRect height="400px" borderRadius="12px" />
        <div className="flex gap-3 mt-4">
          <Skeleton width="72px" height="72px" borderRadius="8px" />
          <Skeleton width="72px" height="72px" borderRadius="8px" />
          <Skeleton width="72px" height="72px" borderRadius="8px" />
        </div>
      </div>

      <div className="flex flex-col gap-5">
        <Skeleton width="75%" height="32px" borderRadius="6px" />
        <Skeleton width="40%" height="28px" borderRadius="6px" />
        <SkeletonText lines={4} />
        <div className="flex gap-2.5 mt-4">
          <Skeleton width="80px" height="36px" borderRadius="20px" />
          <Skeleton width="80px" height="36px" borderRadius="20px" />
          <Skeleton width="80px" height="36px" borderRadius="20px" />
        </div>
        <Skeleton height="48px" borderRadius="8px" className="mt-4" />
      </div>
    </div>
  );
};

export const OrderSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col gap-5">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col gap-4"
        >
          <div className="flex justify-between items-center">
            <Skeleton width="180px" height="18px" borderRadius="4px" />
            <Skeleton width="90px" height="24px" borderRadius="12px" />
          </div>
          <div className="flex gap-4 items-center">
            <Skeleton width="60px" height="60px" borderRadius="8px" />
            <div className="flex-1 flex flex-col gap-1.5">
              <Skeleton width="60%" height="16px" borderRadius="4px" />
              <Skeleton width="30%" height="14px" borderRadius="4px" />
            </div>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-slate-100">
            <Skeleton width="120px" height="20px" borderRadius="4px" />
            <Skeleton width="100px" height="32px" borderRadius="6px" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const OrderDetailSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col gap-7 py-8">
      <Skeleton height="56px" borderRadius="10px" />
      <SkeletonRect height="220px" borderRadius="12px" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <SkeletonRect height="180px" borderRadius="12px" />
        <SkeletonRect height="180px" borderRadius="12px" />
      </div>
    </div>
  );
};

export const CartSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-10 my-8">
      <div className="flex flex-col gap-5">
        {[1, 2].map((i) => (
          <div key={i} className="flex gap-4 p-5 bg-white rounded-xl border border-slate-200">
            <Skeleton width="80px" height="80px" borderRadius="8px" />
            <div className="flex-1 flex flex-col gap-2">
              <Skeleton width="70%" height="18px" borderRadius="4px" />
              <Skeleton width="40%" height="14px" borderRadius="4px" />
              <Skeleton width="30%" height="20px" borderRadius="4px" className="mt-auto" />
            </div>
          </div>
        ))}
      </div>
      <SkeletonRect height="320px" borderRadius="16px" />
    </div>
  );
};

export const CheckoutSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-10 my-8">
      <div className="flex flex-col gap-6">
        <SkeletonRect height="260px" borderRadius="14px" />
        <SkeletonRect height="180px" borderRadius="14px" />
      </div>
      <SkeletonRect height="360px" borderRadius="16px" />
    </div>
  );
};

export const HeroSkeleton: React.FC = () => {
  return <Skeleton width="100%" height="420px" borderRadius="0px" className="mb-8" />;
};

export const FaqSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col gap-4 my-8">
      {[1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} height="54px" borderRadius="8px" />
      ))}
    </div>
  );
};

export default Skeleton;
