import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class RecordPaymentFailureDto {
  @IsNotEmpty({ message: 'Order ID is required' })
  @IsString()
  orderId: string;

  @IsOptional()
  @IsString()
  gateway?: string;

  @IsNotEmpty({ message: 'Reason is required' })
  @IsString()
  reason: string; // e.g. USER_CANCELLED, INSUFFICIENT_FUNDS, INVALID_OTP, BANK_DECLINED, TIMEOUT, UNKNOWN

  @IsOptional()
  @IsString()
  errorCode?: string;

  @IsOptional()
  @IsString()
  errorMessage?: string;

  @IsOptional()
  @IsString()
  gatewayOrderId?: string;

  @IsOptional()
  @IsString()
  gatewayPaymentId?: string;

  @IsOptional()
  rawError?: any;
}
