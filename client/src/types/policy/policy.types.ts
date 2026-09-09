export type PolicyType = 'ABOUT' | 'DELIVERY' | 'PRIVACY' | 'TERMS' | 'RETURN_REFUND';

export interface Policy {
  type: PolicyType;
  title: string;
  slug: string;
  contentJson?: any;
  contentHtml: string;
  isPublished: boolean;
  updatedAt: string;
}
