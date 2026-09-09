'use client';

import React, { useEffect } from 'react';
import ErrorState from '../components/ui/ErrorState/ErrorState';
import { parseAppError } from '../utils/error-handler.utils';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App Route Error Boundary caught exception:', error);
  }, [error]);

  const appErr = parseAppError(error);

  return (
    <div className="py-8 px-4">
      <ErrorState error={appErr} onRetry={reset} fullPage />
    </div>
  );
}
