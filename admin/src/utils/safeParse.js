/**
 * Reusable safeParse helper to prevent Uncaught SyntaxError crashes from invalid JSON/localStorage strings.
 * Handles null, undefined, "undefined", "null", empty strings, whitespace, and malformed JSON.
 * Automatically cleans up invalid/corrupt storage values from localStorage.
 *
 * @param {string|any} value - The JSON string or value to parse.
 * @param {any} [fallback=null] - Default fallback value if parsing fails.
 * @param {string} [storageKey=null] - Optional localStorage key to clean up if value is corrupted.
 * @returns {any} The parsed JavaScript object/array or fallback value.
 */
export const safeParse = (value, fallback = null, storageKey = null) => {
  if (value === null || value === undefined) {
    if (storageKey) {
      try {
        localStorage.removeItem(storageKey);
        sessionStorage.removeItem(storageKey);
      } catch (e) {}
    }
    return fallback;
  }

  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null' || trimmed === 'NaN' || trimmed === '[object Object]') {
    if (storageKey) {
      try {
        localStorage.removeItem(storageKey);
        sessionStorage.removeItem(storageKey);
      } catch (e) {}
    }
    return fallback;
  }

  try {
    return JSON.parse(trimmed);
  } catch (error) {
    console.warn(`[safeParse] Invalid JSON value encountered for key "${storageKey || 'unknown'}":`, trimmed);
    if (storageKey) {
      try {
        localStorage.removeItem(storageKey);
        sessionStorage.removeItem(storageKey);
      } catch (e) {}
    }
    return fallback;
  }
};

export default safeParse;
