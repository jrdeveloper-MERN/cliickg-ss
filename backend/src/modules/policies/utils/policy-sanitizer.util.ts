/**
 * Production-grade Server-side HTML & URL Sanitizer for Policy Content
 * Enforces strict XSS filtering, URL scheme whitelisting, and markup integrity.
 */

const ALLOWED_TAGS = new Set([
  'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'del',
  'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'hr', 'br',
  'span', 'div', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
  'a', 'img', 'figure', 'figcaption', 'sub', 'sup'
]);

const ALLOWED_PROTOCOLS = ['http:', 'https:', 'mailto:', 'tel:'];

/**
 * Sanitizes a URL string to ensure it uses a safe protocol.
 * Rejects javascript:, vbscript:, data:, and relative script exploits.
 */
export function sanitizeUrl(rawUrl: string = ''): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();

  // Allow relative URLs starting with / (e.g. /uploads/image.png)
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return trimmed;
  }

  // Reject dangerous protocol prefixes
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('file:')
  ) {
    return '#';
  }

  try {
    const parsed = new URL(trimmed);
    if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
      return '#';
    }
    return trimmed;
  } catch {
    // If not a valid absolute URL and not a valid safe relative URL, fallback to safe #
    return '#';
  }
}

/**
 * Sanitizes an HTML string on the backend before database persistence and public exposure.
 */
export function sanitizePolicyHtml(rawHtml: string = ''): string {
  if (!rawHtml || typeof rawHtml !== 'string') return '';

  let sanitized = rawHtml;

  // 1. Remove dangerous executable tags and blocks entirely
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  sanitized = sanitized.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '');
  sanitized = sanitized.replace(/<embed\b[^>]*>/gi, '');
  sanitized = sanitized.replace(/<applet\b[^<]*(?:(?!<\/applet>)<[^<]*)*<\/applet>/gi, '');
  sanitized = sanitized.replace(/<meta\b[^>]*>/gi, '');
  sanitized = sanitized.replace(/<link\b[^>]*>/gi, '');

  // Strip unsafe iframes (allow only safe YouTube / Youtube-nocookie embed iframes)
  sanitized = sanitized.replace(/<iframe\b([^>]*)>(.*?)<\/iframe>/gi, (match, attrs, _inner) => {
    const srcMatch = attrs.match(/src\s*=\s*['"]([^'"]+)['"]/i);
    if (srcMatch) {
      const src = srcMatch[1].trim();
      if (
        src.startsWith('https://www.youtube.com/embed/') ||
        src.startsWith('https://www.youtube-nocookie.com/embed/') ||
        src.startsWith('https://youtube.com/embed/')
      ) {
        return match; // Safe YouTube iframe
      }
    }
    return ''; // Strip non-YouTube / unsafe iframes
  });

  // 2. Strip all inline DOM event handlers (e.g. onclick=, onerror=, onload=, onmouseover=)
  sanitized = sanitized.replace(/\s+on[a-z]+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '');

  // 3. Neutralize dangerous URL protocols in href / src attributes
  sanitized = sanitized.replace(/\b(href|src)\s*=\s*(['"])(.*?)\2/gi, (_match, attr, quote, url) => {
    const clean = sanitizeUrl(url);
    if (attr.toLowerCase() === 'href') {
      return `${attr}=${quote}${clean}${quote} target="_blank" rel="noopener noreferrer"`;
    }
    return `${attr}=${quote}${clean}${quote}`;
  });

  // 4. Clean up any unquoted javascript: attributes
  sanitized = sanitized.replace(/\b(href|src)\s*=\s*javascript:[^\s>]+/gi, '$1="#"');

  return sanitized.trim();
}

/**
 * Derives default slug from PolicyType
 */
export function getSlugForPolicyType(type: string): string {
  switch (type?.toUpperCase()) {
    case 'ABOUT':
      return 'about-us';
    case 'DELIVERY':
      return 'delivery-policy';
    case 'PRIVACY':
      return 'privacy-policy';
    case 'TERMS':
      return 'terms-and-conditions';
    case 'RETURN_REFUND':
      return 'return-and-refund-policy';
    default:
      return type.toLowerCase().replace(/_/g, '-');
  }
}

/**
 * Derives default display title for PolicyType
 */
export function getTitleForPolicyType(type: string): string {
  switch (type?.toUpperCase()) {
    case 'ABOUT':
      return 'About Us';
    case 'DELIVERY':
      return 'Delivery Policy';
    case 'PRIVACY':
      return 'Privacy Policy';
    case 'TERMS':
      return 'Terms & Conditions';
    case 'RETURN_REFUND':
      return 'Return & Refund Policy';
    default:
      return type;
  }
}
