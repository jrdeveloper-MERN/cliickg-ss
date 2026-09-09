import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RotateCcw, Home, AlertCircle } from 'lucide-react';
import { parseAppError, getErrorImage } from '../../utils/errorHandler';

export const ErrorState = ({
  error,
  statusCode,
  title,
  message,
  onRetry,
  retryText = 'Reload Page',
  showDashboardButton = true,
  compact = false,
  fullScreen = true,
  image,
}) => {
  const navigate = useNavigate();
  const [isRetrying, setIsRetrying] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  // Normalize error dynamically
  const parsed = parseAppError(error || statusCode || { message });

  const finalTitle = title || parsed.title;
  const finalMessage = message || parsed.userMessage;
  const imgPath = image || parsed.image || getErrorImage(parsed.status || statusCode || parsed.type);
  const isRetryable = parsed.retryable !== false;

  const handleRetry = async () => {
    if (isRetrying) return;
    setIsRetrying(true);
    try {
      if (onRetry) {
        await onRetry();
      } else {
        window.location.reload();
      }
    } catch (err) {
      console.error('Retry failed:', err);
    } finally {
      setIsRetrying(false);
    }
  };

  if (compact) {
    return (
      <div
        role="alert"
        className="bg-admin-card border border-admin-border rounded-admin-sm p-6 text-center my-4 flex flex-col items-center justify-center gap-3 shadow-admin-sm w-full"
      >
        {!imgFailed ? (
          <img
            src={imgPath}
            alt={finalTitle}
            className="w-48 max-w-full h-auto object-contain"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-500 border border-rose-200 dark:border-rose-900 flex items-center justify-center">
            <AlertCircle size={24} />
          </div>
        )}

        <div>
          <h4 className="text-sm font-semibold text-admin-text-primary mb-1">{finalTitle}</h4>
          <p className="text-xs text-admin-text-secondary max-w-md mx-auto">{finalMessage}</p>
        </div>

        <div className="flex items-center gap-2 mt-1">
          {isRetryable && (
            <button
              type="button"
              onClick={handleRetry}
              disabled={isRetrying}
              className="btn-primary flex items-center gap-1.5 text-xs py-1.5 px-3 cursor-pointer"
            >
              <RotateCcw size={13} className={isRetrying ? 'animate-spin' : ''} />
              {isRetrying ? 'Retrying...' : retryText}
            </button>
          )}

          {showDashboardButton && (
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3 cursor-pointer"
            >
              <Home size={13} /> Dashboard
            </button>
          )}
        </div>
      </div>
    );
  }

  // Full-window viewport layout (occupies 100vh)
  return (
    <div
      role="alert"
      className="min-h-screen h-screen w-full flex flex-col items-center justify-center text-center px-6 py-8 bg-admin-bg select-none overflow-y-auto"
    >
      <div className="max-w-xl w-full mx-auto flex flex-col items-center justify-center">
        {!imgFailed ? (
          <img
            src={imgPath}
            alt={finalTitle}
            className="w-96 max-w-[90vw] max-h-[52vh] h-auto object-contain mb-6 drop-shadow-md"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-500 border border-rose-200 dark:border-rose-900 flex items-center justify-center mb-6 shadow-sm">
            <AlertCircle size={44} />
          </div>
        )}

        <h1 className="text-2xl sm:text-3xl font-bold text-admin-text-primary mb-2 tracking-tight">
          {finalTitle}
        </h1>

        <p className="text-xs sm:text-sm text-admin-text-secondary max-w-md mb-8 leading-relaxed">
          {finalMessage}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          {isRetryable && (
            <button
              type="button"
              onClick={handleRetry}
              disabled={isRetrying}
              className="btn-primary flex items-center gap-2 text-xs sm:text-sm py-2.5 px-5 cursor-pointer shadow-sm"
            >
              <RotateCcw size={15} className={isRetrying ? 'animate-spin' : ''} />
              {isRetrying ? 'Retrying...' : retryText}
            </button>
          )}

          {showDashboardButton && (
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="btn-secondary flex items-center gap-2 text-xs sm:text-sm py-2.5 px-5 cursor-pointer"
            >
              <Home size={15} /> Back to Dashboard
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorState;
