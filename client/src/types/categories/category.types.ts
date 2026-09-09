export interface MainCategory {
  id: string;
  _id?: string;
  name: string;
  slug?: string;
  description?: string;
  image?: string;
  isActive?: boolean;
}

export interface Category {
  id: string;
  _id?: string;
  mainCategoryId?: string;
  name: string;
  slug?: string;
  description?: string;
  image?: string;
  isActive?: boolean;
}

export interface SubCategory {
  id: string;
  _id?: string;
  mainCategoryId?: string;
  categoryId?: string;
  name: string;
  slug?: string;
  description?: string;
  image?: string;
  isActive?: boolean;
}

export interface AttributeValue {
  id: string;
  _id?: string;
  value: string;
  image?: string;
  isActive?: boolean;
}

export interface AttributeCaption {
  id: string;
  _id?: string;
  name: string;
  caption: string;
  image?: string;
  values?: AttributeValue[];
  isActive?: boolean;
}
