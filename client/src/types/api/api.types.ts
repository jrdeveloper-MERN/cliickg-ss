export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  total?: number;
  page?: number;
  limit?: number;
}

export interface ApiError {
  success: false;
  message: string;
  statusCode?: number;
  errors?: Record<string, string[] | string>;
}
