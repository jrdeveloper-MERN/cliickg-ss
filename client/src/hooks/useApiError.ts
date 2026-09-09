'use client';

import { useState, useCallback } from 'react';
import { AppError, parseAppError } from '../utils/error-handler.utils';

export function useApiError(initialError: AppError | null = null) {
  const [error, setError] = useState<AppError | null>(initialError);

  const handleError = useCallback((err: any) => {
    const parsed = parseAppError(err);
    setError(parsed);
    return parsed;
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    error,
    setError: handleError,
    clearError,
    hasError: error !== null,
    isNetworkError: error?.type === 'NETWORK' || error?.type === 'SERVER_UNAVAILABLE',
  };
}

export default useApiError;
