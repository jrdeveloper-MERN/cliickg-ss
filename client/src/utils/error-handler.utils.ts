import { AxiosError } from 'axios';

export type ApiErrorType =
  | 'NETWORK'
  | 'SERVER_UNAVAILABLE'
  | 'TIMEOUT'
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'VALIDATION_ERROR'
  | 'PAYMENT_ERROR'
  | 'SERVER_ERROR'
  | 'UNKNOWN';

// Backward compatibility alias
export type ErrorType = ApiErrorType;

export interface AppError {
  type: ApiErrorType;
  status?: number;
  code?: string;
  title: string;
  message: string;
  userMessage: string;
  retryable: boolean;
  rawError?: any;
}

/**
 * Technical terms and patterns that MUST NEVER reach customer UI
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

/**
 * Checks if a string contains internal technical information
 */
export function isTechnicalMessage(msg?: string): boolean {
  if (!msg || typeof msg !== 'string') return true;
  return TECHNICAL_PATTERNS.some((pattern) => pattern.test(msg));
}

/**
 * Sanitizes backend/system messages to ensure no internal technical data leaks to users
 */
export function sanitizeUserMessage(msg: any, fallbackMessage: string): string {
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
 * Centralized Client-Side Error Classification System
 * Predictably normalizes network, timeout, HTTP, validation, and payment errors into a safe AppError shape.
 */
export function parseAppError(error: any): AppError {
  // Return immediately if already a normalized AppError
  if (
    error &&
    typeof error === 'object' &&
    error.type &&
    error.userMessage &&
    typeof error.retryable === 'boolean'
  ) {
    return error as AppError;
  }

  const isAxios = error?.isAxiosError || error instanceof AxiosError;
  const status = error?.response?.status || error?.status;
  const code = error?.code || error?.response?.data?.reasonCode || error?.response?.data?.code;
  const rawMsg = error?.response?.data?.message || error?.message;

  // Check if error is payment-related
  const isPaymentContext =
    code?.toLowerCase()?.includes('payment') ||
    (typeof rawMsg === 'string' && rawMsg.toLowerCase().includes('payment')) ||
    error?.config?.url?.includes('/payments');

  if (isPaymentContext && status && status >= 400 && status < 500) {
    const safeMsg = sanitizeUserMessage(
      rawMsg,
      'We could not process your payment. Please try again or use a different payment method.'
    );
    return {
      type: 'PAYMENT_ERROR',
      status,
      code: code || 'PAYMENT_FAILED',
      title: 'Payment Unsuccessful',
      message: safeMsg,
      userMessage: safeMsg,
      retryable: true,
      rawError: error,
    };
  }

  // 1. Backend Unreachable / Network / Connection Refused / Timeout
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
      title: 'Service Temporarily Unavailable',
      message: "We're having trouble connecting to our servers. Please try again in a moment.",
      userMessage: "We're having trouble connecting to our servers. Please try again in a moment.",
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
          'The request could not be processed. Please check your information and try again.'
        );
        return {
          type: 'BAD_REQUEST',
          status: 400,
          code: code || 'BAD_REQUEST',
          title: 'Invalid Request',
          message: safeMsg,
          userMessage: safeMsg,
          retryable: false,
          rawError: error,
        };
      }

      case 401: {
        return {
          type: 'UNAUTHORIZED',
          status: 401,
          code: code || 'UNAUTHORIZED',
          title: 'Session Expired',
          message: 'Your session has expired. Please sign in again.',
          userMessage: 'Your session has expired. Please sign in again.',
          retryable: false,
          rawError: error,
        };
      }

      case 403: {
        return {
          type: 'FORBIDDEN',
          status: 403,
          code: code || 'FORBIDDEN',
          title: 'Access Denied',
          message: "You don't have permission to access this page or perform this action.",
          userMessage: "You don't have permission to access this page or perform this action.",
          retryable: false,
          rawError: error,
        };
      }

      case 404: {
        const safeMsg = sanitizeUserMessage(rawMsg, 'The requested product or page could not be found.');
        return {
          type: 'NOT_FOUND',
          status: 404,
          code: code || 'NOT_FOUND',
          title: 'Resource Not Found',
          message: safeMsg,
          userMessage: safeMsg,
          retryable: false,
          rawError: error,
        };
      }

      case 408: {
        return {
          type: 'TIMEOUT',
          status: 408,
          code: code || 'REQUEST_TIMEOUT',
          title: 'Request Timeout',
          message: 'The request is taking longer than expected. Please try again.',
          userMessage: 'The request is taking longer than expected. Please try again.',
          retryable: true,
          rawError: error,
        };
      }

      case 409: {
        const safeMsg = sanitizeUserMessage(
          rawMsg,
          'This item was updated or is no longer available. Please refresh and try again.'
        );
        return {
          type: 'CONFLICT',
          status: 409,
          code: code || 'CONFLICT',
          title: 'Data Conflict',
          message: safeMsg,
          userMessage: safeMsg,
          retryable: true,
          rawError: error,
        };
      }

      case 422: {
        const safeMsg = sanitizeUserMessage(rawMsg, 'Please verify the information provided and try again.');
        return {
          type: 'VALIDATION_ERROR',
          status: 422,
          code: code || 'VALIDATION_ERROR',
          title: 'Validation Error',
          message: safeMsg,
          userMessage: safeMsg,
          retryable: false,
          rawError: error,
        };
      }

      case 429: {
        return {
          type: 'TIMEOUT',
          status: 429,
          code: code || 'TOO_MANY_REQUESTS',
          title: 'Too Many Requests',
          message: 'Too many requests were sent. Please wait a moment and try again.',
          userMessage: 'Too many requests were sent. Please wait a moment and try again.',
          retryable: true,
          rawError: error,
        };
      }

      case 500: {
        return {
          type: 'SERVER_ERROR',
          status: 500,
          code: code || 'INTERNAL_SERVER_ERROR',
          title: 'Something Went Wrong',
          message: 'Something went wrong on our side. Please try again in a moment.',
          userMessage: 'Something went wrong on our side. Please try again in a moment.',
          retryable: true,
          rawError: error,
        };
      }

      case 504: {
        return {
          type: 'TIMEOUT',
          status: 504,
          code: code || 'GATEWAY_TIMEOUT',
          title: 'Server Response Timeout',
          message: 'The server took too long to respond. Please try again.',
          userMessage: 'The server took too long to respond. Please try again.',
          retryable: true,
          rawError: error,
        };
      }

      default: {
        const safeMsg = sanitizeUserMessage(rawMsg, "We couldn't complete your request. Please try again.");
        return {
          type: status >= 500 ? 'SERVER_ERROR' : 'UNKNOWN',
          status,
          code: code || 'HTTP_ERROR',
          title: 'Something Went Wrong',
          message: safeMsg,
          userMessage: safeMsg,
          retryable: status >= 500,
          rawError: error,
        };
      }
    }
  }

  // 3. Fallback / Unknown Error
  const safeFallback = sanitizeUserMessage(rawMsg, "We couldn't complete your request. Please try again in a moment.");
  return {
    type: 'UNKNOWN',
    title: 'Something Went Wrong',
    message: safeFallback,
    userMessage: safeFallback,
    retryable: true,
    rawError: error,
  };
}

/**
 * Checks if the given error indicates that the backend is OFF or network is unavailable
 */
export function isNetworkOrServerDown(err: any): boolean {
  const parsed = parseAppError(err);
  return (
    parsed.type === 'NETWORK' ||
    parsed.type === 'SERVER_UNAVAILABLE' ||
    parsed.code === 'SERVICE_UNAVAILABLE' ||
    (parsed.status !== undefined && parsed.status >= 502)
  );
}

/**
 * Returns a clean, sanitized user-friendly message for any error object
 */
export function getErrorMessage(err: any): string {
  const parsed = parseAppError(err);
  return parsed.userMessage;
}

