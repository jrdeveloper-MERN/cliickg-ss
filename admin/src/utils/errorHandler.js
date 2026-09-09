/**
 * Centralized Admin Error Classification & Sanitization System
 * Mirrors client status code handling architecture for admin portal.
 */

const TECHNICAL_PATTERNS = [
  /ERR_CONNECTION_REFUSED/i,
  /AxiosError/i,
  /ECONNREFUSED/i,
  /ECONNABORTED/i,
  /ERR_NETWORK/i,
  /Prisma/i,
  /PostgreSQL/i,
  /localhost/i,
  /5001/i,
  /3000/i,
  /3001/i,
  /Network Error/i,
  /at Object\./i,
  /stack trace/i,
  /eval at/i,
  /TypeError/i,
  /ReferenceError/i,
  /SQL/i,
  /mongodb/i,
  /UnhandledPromiseRejection/i,
];

export function isTechnicalMessage(msg) {
  if (!msg || typeof msg !== 'string') return true;
  return TECHNICAL_PATTERNS.some((pattern) => pattern.test(msg));
}

export function sanitizeUserMessage(msg, fallbackMessage) {
  if (typeof msg === 'string' && msg.trim().length > 0 && !isTechnicalMessage(msg)) {
    return msg.trim();
  }
  if (Array.isArray(msg) && msg.length > 0) {
    const firstStr = msg.find((m) => typeof m === 'string' && !isTechnicalMessage(m));
    if (firstStr) return firstStr;
  }
  return fallbackMessage;
}

/**
 * Parses any raw error or Axios error into normalized AppError shape
 */
export function parseAppError(error) {
  if (
    error &&
    typeof error === 'object' &&
    error.type &&
    error.userMessage &&
    typeof error.retryable === 'boolean'
  ) {
    return error;
  }

  const status = error?.response?.status || error?.status || (typeof error === 'number' ? error : undefined);
  const code = error?.code || error?.response?.data?.reasonCode || error?.response?.data?.code;
  const rawMsg = error?.response?.data?.message || error?.message;

  // 1. Network / Server Down / Connection Refused / Timeout
  const isNetworkFailure =
    !error?.response &&
    (code === 'ERR_NETWORK' ||
      code === 'ECONNREFUSED' ||
      code === 'ECONNABORTED' ||
      code === 'ETIMEDOUT' ||
      rawMsg === 'Network Error' ||
      (typeof rawMsg === 'string' && rawMsg.includes('Network Error')) ||
      (typeof rawMsg === 'string' && rawMsg.includes('timeout')) ||
      error?.message?.includes('fetch failed'));

  if (isNetworkFailure || status === 502 || status === 503) {
    return {
      type: 'SERVER_UNAVAILABLE',
      status: status || 503,
      code: 'SERVICE_UNAVAILABLE',
      title: '503 - Service Unavailable',
      message: 'Backend server is currently offline or unreachable (port 5001). Please check that the backend service is active.',
      userMessage: 'Backend server is currently offline or unreachable (port 5001). Please check that the backend service is active.',
      image: '/assets/images/error-500.svg',
      retryable: true,
      rawError: error,
    };
  }

  // 2. HTTP Status Code Classification
  if (status) {
    switch (status) {
      case 400: {
        const safeMsg = sanitizeUserMessage(
          rawMsg,
          'The request could not be processed. Please check the entered information and try again.'
        );
        return {
          type: 'BAD_REQUEST',
          status: 400,
          code: code || 'BAD_REQUEST',
          title: '400 - Bad Request',
          message: safeMsg,
          userMessage: safeMsg,
          image: '/assets/images/error-400.svg',
          retryable: false,
          rawError: error,
        };
      }

      case 401: {
        return {
          type: 'UNAUTHORIZED',
          status: 401,
          code: code || 'UNAUTHORIZED',
          title: '401 - Session Expired',
          message: 'Your administrator session has expired or is invalid. Please sign in again.',
          userMessage: 'Your administrator session has expired or is invalid. Please sign in again.',
          image: '/assets/images/error-403.svg',
          retryable: false,
          rawError: error,
        };
      }

      case 403: {
        return {
          type: 'FORBIDDEN',
          status: 403,
          code: code || 'FORBIDDEN',
          title: '403 - Access Forbidden',
          message: 'You do not have administrative privileges to perform this action or view this resource.',
          userMessage: 'You do not have administrative privileges to perform this action or view this resource.',
          image: '/assets/images/error-403.svg',
          retryable: false,
          rawError: error,
        };
      }

      case 404: {
        const safeMsg = sanitizeUserMessage(rawMsg, 'The requested administrative resource, order, or page was not found.');
        return {
          type: 'NOT_FOUND',
          status: 404,
          code: code || 'NOT_FOUND',
          title: '404 - Page Not Found',
          message: safeMsg,
          userMessage: safeMsg,
          image: '/assets/images/error-404.svg',
          retryable: false,
          rawError: error,
        };
      }

      case 408:
      case 429:
      case 504: {
        return {
          type: 'TIMEOUT',
          status,
          code: code || 'TIMEOUT',
          title: `${status} - Request Timeout`,
          message: 'The request took too long or rate limit was exceeded. Please try again.',
          userMessage: 'The request took too long or rate limit was exceeded. Please try again.',
          image: '/assets/images/error-500.svg',
          retryable: true,
          rawError: error,
        };
      }

      case 409:
      case 422: {
        const safeMsg = sanitizeUserMessage(rawMsg, 'Validation failed or data conflict detected. Please review input fields.');
        return {
          type: 'VALIDATION_ERROR',
          status,
          code: code || 'VALIDATION_ERROR',
          title: `${status} - Validation Error`,
          message: safeMsg,
          userMessage: safeMsg,
          image: '/assets/images/error-400.svg',
          retryable: false,
          rawError: error,
        };
      }

      case 500: {
        return {
          type: 'SERVER_ERROR',
          status: 500,
          code: code || 'INTERNAL_SERVER_ERROR',
          title: '500 - Internal Server Error',
          message: 'The server encountered an internal error. Please try again or verify backend logs.',
          userMessage: 'The server encountered an internal error. Please try again or verify backend logs.',
          image: '/assets/images/error-500.svg',
          retryable: true,
          rawError: error,
        };
      }

      default: {
        const isServer = status >= 500;
        const safeMsg = sanitizeUserMessage(rawMsg, isServer ? 'Server error occurred.' : 'Request could not be completed.');
        return {
          type: isServer ? 'SERVER_ERROR' : 'UNKNOWN',
          status,
          code: code || 'HTTP_ERROR',
          title: `${status} - ${isServer ? 'Server Error' : 'Request Error'}`,
          message: safeMsg,
          userMessage: safeMsg,
          image: isServer ? '/assets/images/error-500.svg' : '/assets/images/error-400.svg',
          retryable: isServer,
          rawError: error,
        };
      }
    }
  }

  // 3. Fallback / Unknown
  const safeFallback = sanitizeUserMessage(rawMsg, 'An unexpected error occurred. Please try again.');
  return {
    type: 'UNKNOWN',
    status: 500,
    title: '500 - Unexpected Error',
    message: safeFallback,
    userMessage: safeFallback,
    image: '/assets/images/error-500.svg',
    retryable: true,
    rawError: error,
  };
}

export function getErrorImage(statusOrType) {
  if (statusOrType === 400 || statusOrType === 'BAD_REQUEST' || statusOrType === 'VALIDATION_ERROR') {
    return '/assets/images/error-400.svg';
  }
  if (statusOrType === 403 || statusOrType === 'FORBIDDEN' || statusOrType === 'UNAUTHORIZED' || statusOrType === 401) {
    return '/assets/images/error-403.svg';
  }
  if (statusOrType === 404 || statusOrType === 'NOT_FOUND') {
    return '/assets/images/error-404.svg';
  }
  return '/assets/images/error-500.svg';
}
