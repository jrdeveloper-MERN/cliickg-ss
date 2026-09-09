'use client';

import React from 'react';
import { WifiOff } from 'lucide-react';
import useNetworkStatus from '../../../hooks/useNetworkStatus';

export const OfflineBanner: React.FC = () => {
  const { isOffline } = useNetworkStatus();

  if (!isOffline) return null;

  return (
    <div
      className="bg-rose-900 text-rose-50 py-2.5 px-4 text-center text-sm font-semibold flex items-center justify-center gap-2 sticky top-0 z-[99999] shadow-md"
      role="alert"
      aria-live="assertive"
    >
      <WifiOff size={16} />
      <span>You're offline. Check your internet connection and try again.</span>
    </div>
  );
};

export default OfflineBanner;
