import apiClient from './api-client';

export interface CreateSellerPayload {
  businessName: string;
  sellerType: string;
  gstNumber?: string;
  panNumber: string;
  contactPerson: string;
  email: string;
  mobileNumber: string;
  businessLocation: string;
  pincode: string;
  productCategory: string;
  agreementAccepted: boolean;
}

export interface SellerRegistrationResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    sellerId: string;
    businessName: string;
    status: string;
    createdAt: string;
  };
}

export const sellerService = {
  async registerSeller(payload: CreateSellerPayload): Promise<SellerRegistrationResponse> {
    const res = await apiClient.post('/sellers/register', payload);
    return res.data;
  },
};

export default sellerService;
