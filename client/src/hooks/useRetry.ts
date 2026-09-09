'use client';

import { useState, useCallback, useRef } from 'react';

export interface UseRetryOptions {
  maxRetries?: number;
  retryDelayMs?: number;
}

export function useRetry(fn: () => Promise<any>, options: UseRetryOptions = {}) {
  const [retrying, setRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const isExecutingRef = useRef(false);

  const executeRetry = useCallback(async () => {
    if (isExecutingRef.current) return;
    isExecutingRef.current = true;
    setRetrying(true);

    try {
      await fn();
      setRetryCount(0);
    } catch (err) {
      setRetryCount((prev) => prev + 1);
      throw err;
    } finally {
      setRetrying(false);
      isExecutingRef.current = false;
    }
  }, [fn]);

  return {
    retry: executeRetry,
    retrying,
    retryCount,
  };
}

export default useRetry;
