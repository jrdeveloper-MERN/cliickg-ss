export interface User {
  id: string;
  _id?: string;
  fullName?: string;
  name?: string;
  email?: string;
  mobileNumber?: string;
  phone?: string;
  role: 'customer' | 'admin' | 'super admin';
  isActive?: boolean;
  createdAt?: string;
}

export interface Customer {
  id: string;
  _id?: string;
  userId?: string;
  fullName?: string;
  name?: string;
  email?: string;
  mobileNumber?: string;
  phone?: string;
  gender?: 'Male' | 'Female' | string;
  dob?: string;
  address?: string;
  address1?: string;
  address2?: string;
  area?: string;
  landmark?: string;
  city?: string;
  state?: string;
  pincode?: string;
  addresses?: Address[];
  status?: string;
  createdAt?: string;
}

export interface Address {
  id?: string;
  _id?: string;
  name?: string;
  fullName?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  addressLine1?: string;
  addressLine2?: string;
  area?: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  country?: string;
  addressType?: 'Home' | 'Work' | 'Other' | string;
  isDefault?: boolean;
}

export interface AuthMeta {
  cartSummary?: any;
  wishlistCount: number;
  addressCount: number;
  recentOrdersCount: number;
}

export interface SendOtpPayload {
  countryCode: string;
  mobileNumber: string;
  isRegistration?: boolean;
  email?: string;
}

export interface VerifyOtpPayload {
  countryCode: string;
  mobileNumber: string;
  otp: string;
  isRegistration?: boolean;
  fullName?: string;
  email?: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  token?: string;
  user?: User;
  customer?: Customer;
  data?: {
    token?: string;
    user?: User;
    customer?: Customer;
    verified?: boolean;
    needName?: boolean;
    needRegistration?: boolean;
    otp?: string;
  };
}
