/**
 * Reusable Validation Utilities & Image Specifications for Admin Panel
 */

export const IMAGE_SPECS = {
  BANNER: {
    label: 'Banner Image',
    width: 2400,
    height: 800,
    maxSizeKB: 500,
    allowedTypes: ['image/png', 'image/jpeg', 'image/jpg'],
    allowedExtensions: ['png', 'jpg', 'jpeg']
  },
  CERTIFICATE: {
    label: 'Certificate Image',
    width: 500,
    height: 500,
    maxSizeKB: 500,
    allowedTypes: ['image/png', 'image/jpeg', 'image/jpg'],
    allowedExtensions: ['png', 'jpg', 'jpeg']
  },
  PRODUCT_MAIN: {
    label: 'Product Main Image',
    width: 440,
    height: 440,
    maxSizeKB: 500,
    allowedTypes: ['image/png', 'image/jpeg', 'image/jpg'],
    allowedExtensions: ['png', 'jpg', 'jpeg']
  },
  PRODUCT_HOVER: {
    label: 'Product Hover Image',
    width: 440,
    height: 440,
    maxSizeKB: 500,
    allowedTypes: ['image/png', 'image/jpeg', 'image/jpg'],
    allowedExtensions: ['png', 'jpg', 'jpeg']
  },
  VARIANT_GALLERY: {
    label: 'Variant Gallery Image',
    width: 440,
    height: 440,
    maxSizeKB: 500,
    allowedTypes: ['image/png', 'image/jpeg', 'image/jpg'],
    allowedExtensions: ['png', 'jpg', 'jpeg']
  }
};

/**
 * Validates an image File object.
 * Image dimension, size, and format validation checks have been removed,
 * while keeping UI messages/spec descriptions in place.
 * @param {File} file 
 * @param {Object} spec 
 * @returns {Promise<{isValid: boolean, error: string|null}>}
 */
export const validateImageFile = (file, spec = IMAGE_SPECS.BANNER) => {
  return new Promise((resolve) => {
    if (!file) {
      resolve({ isValid: false, error: 'No file selected.' });
      return;
    }

    // Image dimension, size, and file type validation disabled per requirements.
    resolve({ isValid: true, error: null });
  });
};

/**
 * Trims whitespace from string values
 */
export const trimString = (val) => {
  if (typeof val === 'string') return val.trim();
  if (val === null || val === undefined) return '';
  return String(val);
};

/**
 * Validates required text field
 */
export const validateRequired = (val, fieldLabel = 'This field') => {
  const trimmed = trimString(val);
  if (!trimmed) {
    return `${fieldLabel} is required.`;
  }
  return null;
};

/**
 * Validates dropdown selection
 */
export const validateDropdown = (val, fieldLabel = 'Selection') => {
  const trimmed = trimString(val);
  if (!trimmed || trimmed === '') {
    return `Please select a valid ${fieldLabel}.`;
  }
  return null;
};

/**
 * Validates numeric fields
 */
export const validateNumber = (val, options = {}) => {
  const {
    fieldLabel = 'Number',
    min = 0,
    max = undefined,
    allowZero = true,
    required = true
  } = options;

  const trimmed = trimString(val);

  if (!trimmed) {
    if (required) return `${fieldLabel} is required.`;
    return null;
  }

  const num = Number(trimmed);

  if (isNaN(num)) {
    return `${fieldLabel} must be a valid number.`;
  }

  if (!allowZero && num === 0) {
    return `${fieldLabel} must be greater than 0.`;
  }

  if (min !== undefined && num < min) {
    return `${fieldLabel} cannot be less than ${min}.`;
  }

  if (max !== undefined && num > max) {
    return `${fieldLabel} cannot exceed ${max}.`;
  }

  return null;
};
