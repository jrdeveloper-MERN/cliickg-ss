'use client';

import React, { useEffect } from 'react';
import ErrorState from '../components/ui/ErrorState/ErrorState';
import { parseAppError } from '../utils/error-handler.utils';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global Root Layout Error Boundary caught exception:', error);
  }, [error]);

  const appErr = parseAppError(error);

  return (
    <html lang="en">
      <body className="m-0 font-sans bg-slate-50">
        <div className="py-16 px-4">
          <ErrorState error={appErr} onRetry={reset} fullPage />
        </div>
      </body>
    </html>
  );
}
