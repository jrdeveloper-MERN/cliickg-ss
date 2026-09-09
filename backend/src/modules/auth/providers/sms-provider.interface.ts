export interface SmsDispatchOptions {
  fullPhoneNumber: string;
  otp: string;
}

export interface SmsDispatchResult {
  success: boolean;
  provider: string;
  message: string;
}

export interface SmsProvider {
  sendOtp(options: SmsDispatchOptions): Promise<SmsDispatchResult>;
}
