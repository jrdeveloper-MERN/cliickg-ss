'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  WifiOff,
  AlertTriangle,
  RefreshCw,
  Home,
  ShieldAlert,
  Clock,
  Lock,
  CreditCard,
  FileQuestion,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { parseAppError, AppError } from '../../../utils/error-handler.utils';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  error?: AppError | any;
  onRetry?: () => void | Promise<any>;
  retryable?: boolean;
  showHomeButton?: boolean;
  compact?: boolean;
  fullPage?: boolean;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title,
  message,
  error,
  onRetry,
  retryable,
  showHomeButton = true,
  compact = false,
  fullPage = false,
}) => {
  const [isRetrying, setIsRetrying] = useState(false);
  const parsed: AppError = error ? parseAppError(error) : parseAppError({ message });

  const finalTitle = title || parsed.title || 'Service Temporarily Unavailable';
  const finalMessage =
    message ||
    parsed.userMessage ||
    "We're having trouble connecting to our servers. Please check your internet connection or try again in a moment.";
  const isRetryable = retryable !== undefined ? retryable : parsed.retryable !== false;

  const handleRetry = async () => {
    if (isRetrying) return;
    setIsRetrying(true);
    try {
      if (onRetry) {
        await onRetry();
      } else if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } catch (err) {
      console.error('Retry attempt failed:', err);
    } finally {
      setIsRetrying(false);
    }
  };

  const renderIcon = () => {
    const iconSize = compact ? 28 : 36;
    switch (parsed.type) {
      case 'NETWORK':
      case 'SERVER_UNAVAILABLE':
        return <WifiOff size={iconSize} className="text-emerald-600" />;
      case 'TIMEOUT':
        return <Clock size={iconSize} className="text-amber-600" />;
      case 'UNAUTHORIZED':
      case 'FORBIDDEN':
        return <Lock size={iconSize} className="text-indigo-600" />;
      case 'NOT_FOUND':
        return <FileQuestion size={iconSize} className="text-slate-600" />;
      case 'PAYMENT_ERROR':
        return <CreditCard size={iconSize} className="text-rose-600" />;
      case 'CONFLICT':
      case 'VALIDATION_ERROR':
        return <AlertCircle size={iconSize} className="text-amber-600" />;
      case 'SERVER_ERROR':
        return <ShieldAlert size={iconSize} className="text-rose-600" />;
      default:
        return <AlertTriangle size={iconSize} className="text-amber-600" />;
    }
  };

  const getErrorImage = (): string | null => {
    if (parsed.status === 400 || parsed.type === 'VALIDATION_ERROR' || parsed.type === 'CONFLICT') {
      return '/assets/images/error-400.svg';
    }
    if (parsed.status === 403 || parsed.type === 'FORBIDDEN' || parsed.type === 'UNAUTHORIZED') {
      return '/assets/images/error-403.svg';
    }
    if (parsed.status === 404 || parsed.type === 'NOT_FOUND') {
      return '/assets/images/error-404.svg';
    }
    if (parsed.status === 500 || parsed.type === 'SERVER_ERROR' || parsed.type === 'SERVER_UNAVAILABLE') {
      return '/assets/images/error-500.svg';
    }
    return null;
  };
  const errorImg = getErrorImage();

  if (compact) {
    return (
      <div
        role="alert"
        aria-live="polite"
        className="flex flex-col items-center justify-center text-center p-6 bg-white rounded-2xl border border-slate-200/80 my-4 w-full shadow-xs"
      >
        <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-3">
          {renderIcon()}
        </div>

        <h3 className="text-base font-bold text-slate-900 m-0 mb-1 tracking-tight">{finalTitle}</h3>
        <p className="text-xs text-slate-500 m-0 mb-4 max-w-[360px] leading-relaxed">{finalMessage}</p>

        <div className="flex gap-2.5 flex-wrap justify-center items-center">
          {isRetryable && (
            <button
              type="button"
              onClick={handleRetry}
              disabled={isRetrying}
              className="inline-flex items-center gap-2 bg-slate-900 hover:bg-black text-white border-none py-2 px-4 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed shadow-xs transition-colors duration-200"
            >
              <RefreshCw size={13} className={isRetrying ? 'animate-spin' : ''} />
              {isRetrying ? 'Retrying...' : 'Try Again'}
            </button>
          )}
          {showHomeButton && (
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 py-2 px-4 rounded-lg text-xs font-semibold no-underline transition-colors duration-200"
            >
              <Home size={13} />
              Go to Homepage
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`w-full flex flex-col items-center justify-center text-center px-4 py-16 sm:py-24 bg-white ${
        fullPage ? 'min-h-[85vh]' : 'min-h-[400px]'
      }`}
    >
      <div className="max-w-md w-full mx-auto flex flex-col items-center">
        {errorImg ? (
          <img
            src={errorImg}
            alt={finalTitle}
            className="w-[300px] h-[300px] max-w-full object-contain mb-6"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-emerald-50 border border-emerald-100/80 flex items-center justify-center mb-6 shadow-2xs">
            {renderIcon()}
          </div>
        )}

        {/* Crisp Dark Title */}
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 m-0 mb-3 tracking-tight">
          {finalTitle}
        </h1>

        {/* Readable Subtitle */}
        <p className="text-sm sm:text-base text-slate-600 m-0 mb-8 leading-relaxed max-w-md">
          {finalMessage}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-3.5 w-full sm:w-auto justify-center items-stretch sm:items-center">
          {isRetryable && (
            <button
              type="button"
              onClick={handleRetry}
              disabled={isRetrying}
              className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-black text-white border-none py-3 px-6 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed shadow-sm transition-colors duration-200"
            >
              <RefreshCw size={16} className={isRetrying ? 'animate-spin' : ''} />
              <span>{isRetrying ? 'Retrying...' : 'Try Again'}</span>
            </button>
          )}

          {showHomeButton && (
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 py-3 px-6 rounded-xl text-sm font-semibold no-underline shadow-2xs transition-colors duration-200"
            >
              <Home size={16} className="text-slate-500" />
              <span>Go to Homepage</span>
            </Link>
          )}
        </div>

        {/* Support Footer */}
        <div className="mt-12 pt-6 border-t border-slate-100 flex items-center justify-center gap-1.5 text-xs text-slate-400">
          <HelpCircle size={14} />
          <span>Need help? Contact customer support for assistance.</span>
        </div>
      </div>
    </div>
  );
};

export default ErrorState;
