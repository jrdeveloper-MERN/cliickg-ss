'use client';

import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../../services/api-client';
import ErrorState from '../ui/ErrorState/ErrorState';
import { parseAppError, isNetworkOrServerDown, AppError } from '../../utils/error-handler.utils';

export interface ServerHealthGuardProps {
  children: React.ReactNode;
}

export const ServerHealthGuard: React.FC<ServerHealthGuardProps> = ({ children }) => {
  const [isBackendDown, setIsBackendDown] = useState(false);
  const [serverError, setServerError] = useState<AppError | null>(null);

  // Manual Health Check triggered ONLY when user explicitly clicks [Try Again]
  const retryConnection = useCallback(async () => {
    try {
      await apiClient.get('/promotions/active', { timeout: 5000 });
      setIsBackendDown(false);
      setServerError(null);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('backend:up'));
      }
      return true;
    } catch (err: any) {
      if (isNetworkOrServerDown(err)) {
        const appErr = parseAppError(err);
        setIsBackendDown(true);
        setServerError(appErr);
        return false;
      }
      // Non-network error implies backend server IS running
      setIsBackendDown(false);
      setServerError(null);
      return true;
    }
  }, []);

  // Listen to global API network error events emitted by apiClient interceptor
  useEffect(() => {
    const handleServerDown = (event: Event) => {
      const customEvt = event as CustomEvent<AppError>;
      setIsBackendDown(true);
      if (customEvt.detail) {
        setServerError(customEvt.detail);
      } else {
        setServerError(
          parseAppError({
            code: 'ERR_NETWORK',
            message: "We're having trouble connecting to our servers. Please try again in a moment.",
          })
        );
      }
    };

    const handleServerUp = () => {
      setIsBackendDown(false);
      setServerError(null);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('backend:down', handleServerDown);
      window.addEventListener('backend:up', handleServerUp);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('backend:down', handleServerDown);
        window.removeEventListener('backend:up', handleServerUp);
      }
    };
  }, []);

  if (isBackendDown) {
    return (
      <div className="min-h-[60vh] w-full flex items-center justify-center py-8 px-4">
        <ErrorState
          error={serverError}
          onRetry={retryConnection}
          showHomeButton
        />
      </div>
    );
  }

  return <>{children}</>;
};

export default ServerHealthGuard;
