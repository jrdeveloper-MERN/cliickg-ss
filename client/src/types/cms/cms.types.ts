export interface HeroBanner {
  id: string;
  _id?: string;
  title?: string;
  subtitle?: string;
  image: string;
  linkUrl?: string;
  buttonText?: string;
  isActive?: boolean;
}

export interface TodayDeal {
  id: string;
  _id?: string;
  title: string;
  subtitle?: string;
  discountPercentage?: number;
  discountBadge?: string;
  bannerImage?: string;
  expiryTime?: string;
  products?: any[];
  isActive?: boolean;
}

export interface TodayDealBanner {
  id: string;
  _id?: string;
  title?: string;
  image: string;
  linkUrl?: string;
  linkType?: string;
  linkId?: string;
  isActive?: boolean;
}

export interface FeaturedSection {
  id: string;
  _id?: string;
  title: string;
  subtitle?: string;
  viewAllLink?: string;
  sectionType?: 'banner' | 'cards' | 'grid' | 'carousel' | string;
  banners?: any[];
  products?: any[];
  items?: any[];
  isActive?: boolean;
}

export interface Certificate {
  id: string;
  _id?: string;
  title: string;
  description?: string;
  image: string;
  isActive?: boolean;
}

export interface StorePromise {
  id: string;
  _id?: string;
  title: string;
  description?: string;
  icon?: string;
  isActive?: boolean;
}

export interface FAQ {
  id: string;
  _id?: string;
  category?: string;
  question: string;
  answer: string;
}

export interface ScrollHeading {
  id?: string;
  _id?: string;
  text?: string;
  title?: string;
  link?: string;
  linkUrl?: string;
  status?: string;
  isActive?: boolean;
  position?: number;
  backgroundColor?: string;
  color?: string;
  fontFamily?: string;
  fontSize?: string;
  fontStyle?: string;
  fontWeight?: string;
  letterSpacing?: string;
  speed?: number | string;
}

export interface StoreBranch {
  id?: string;
  _id?: string;
  name: string;
  storeName?: string;
  phone?: string;
  secondaryPhone?: string;
  email?: string;
  secondaryEmail?: string;
  address?: string;
  businessHours?: string;
  googleMapEmbed?: string;
  locationCardTitle?: string;
  phoneCardTitle?: string;
  emailCardTitle?: string;
  status?: string;
}

export interface ContactCMS {
  name?: string;
  storeName?: string;
  pageTitle?: string;
  heading?: string;
  description?: string;
  phone?: string;
  secondaryPhone?: string;
  email?: string;
  secondaryEmail?: string;
  address?: string;
  businessHours?: string;
  storeHours?: string;
  googleMapEmbed?: string;
  googleMapUrl?: string;
  locationCardTitle?: string;
  phoneCardTitle?: string;
  emailCardTitle?: string;
  branches?: StoreBranch[];
  socialLinks?: Record<string, string>;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
}
