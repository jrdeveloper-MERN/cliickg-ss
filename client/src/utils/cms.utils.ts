export type CmsTargetType = 'MainCategory' | 'Category' | 'SubCategory' | 'Product' | string;

export interface CmsTargetInput {
  linkType?: string;
  linkId?: string;
  linkUrl?: string;
  type?: string;
  selectType?: string;
  id?: string;
  _id?: string;
  name?: string;
}

/**
 * Dynamically builds internal storefront URL from CMS target metadata.
 * Authoritative source: linkType + linkId.
 * linkUrl is only used as a last-resort fallback when linkType/linkId are empty.
 * NO HARDCODED ENTITY IDs OR FIXED CATEGORY ROUTES.
 */
export function computeCmsTargetUrl(target?: CmsTargetInput | null): string {
  if (!target) return '/shop';

  const rawType = target.linkType || target.type || target.selectType || '';
  const rawId = target.linkId || target.id || target._id || (rawType ? target.name : '') || '';

  // If we have a type+id, compute the canonical route (authoritative)
  if (rawType && rawId) {
    const normalizedType = rawType.toLowerCase();

    if (normalizedType.includes('maincategory') || normalizedType.includes('main_category')) {
      return `/shop?mainCategory=${encodeURIComponent(rawId)}`;
    }
    if (normalizedType.includes('subcategory') || normalizedType.includes('sub_category')) {
      return `/shop?subCategory=${encodeURIComponent(rawId)}`;
    }
    if (normalizedType.includes('category')) {
      return `/shop?category=${encodeURIComponent(rawId)}`;
    }
    if (normalizedType.includes('product')) {
      return `/product/${encodeURIComponent(rawId)}`;
    }
  }

  // Fallback: use linkUrl only when linkType+linkId are unavailable
  if (target.linkUrl && target.linkUrl.length > 0 && target.linkUrl !== '/shop') {
    return target.linkUrl;
  }

  return '/shop';
}
