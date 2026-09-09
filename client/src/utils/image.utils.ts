export const getImageUrl = (path?: any): string => {
  if (!path) return '/assets/images/fallback-product.png';

  let strPath = '';
  if (typeof path === 'string') {
    strPath = path;
  } else if (typeof path === 'object' && path !== null) {
    strPath = path.url || path.path || path.src || path.secure_url || '';
  }

  if (!strPath || !strPath.trim()) {
    return '/assets/images/fallback-product.png';
  }

  strPath = strPath.trim();

  // Route logo references directly to public /logo.png static asset
  if (
    strPath === '/logo.png' ||
    strPath === 'logo.png' ||
    strPath === '/logo.jpg' ||
    strPath === 'logo.jpg' ||
    strPath.includes('main_logo') ||
    strPath.startsWith('/logo') ||
    strPath.startsWith('logo.')
  ) {
    return '/logo.png';
  }

  if (strPath.startsWith('http://') || strPath.startsWith('https://') || strPath.startsWith('data:')) {
    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && strPath.startsWith('http://')) {
      return strPath.replace(/^http:\/\//i, 'https://');
    }
    return strPath;
  }

  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';
  const backendOrigin = apiBase.replace(/\/api\/?$/, '');

  if (strPath.startsWith('/uploads')) {
    return `${backendOrigin}${strPath}`;
  }
  if (strPath.startsWith('uploads/')) {
    return `${backendOrigin}/${strPath}`;
  }

  return `${backendOrigin}/uploads/${strPath.replace(/^\//, '')}`;
};

export default getImageUrl;

