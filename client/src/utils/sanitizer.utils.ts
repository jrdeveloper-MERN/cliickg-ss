import DOMPurify from 'dompurify';
import { getImageUrl } from './image.utils';

export const sanitizeHtml = (htmlContent: string = ''): string => {
  if (typeof window === 'undefined') return htmlContent;
  if (!htmlContent || !htmlContent.trim()) return '';

  const clean = DOMPurify.sanitize(htmlContent, {
    ADD_TAGS: [
      'img',
      'iframe',
      'video',
      'source',
      'embed',
      'object',
      'picture',
      'track',
      'figure',
      'figcaption',
      'svg',
      'path',
    ],
    ADD_ATTR: [
      'target',
      'style',
      'class',
      'href',
      'src',
      'alt',
      'title',
      'width',
      'height',
      'controls',
      'autoplay',
      'loop',
      'muted',
      'poster',
      'preload',
      'allow',
      'allowfullscreen',
      'frameborder',
      'type',
      'loading',
    ],
  });

  // Transform relative media src paths (/uploads/... or uploads/...) to point to backend URL
  return clean.replace(/src=["'](\/uploads\/[^"']+|uploads\/[^"']+)["']/gi, (_match, p1) => {
    const absoluteUrl = getImageUrl(p1);
    return `src="${absoluteUrl}"`;
  });
};

export default sanitizeHtml;
