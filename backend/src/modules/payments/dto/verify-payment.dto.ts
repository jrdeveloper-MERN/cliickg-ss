import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class VerifyPaymentDto {
  @IsNotEmpty({ message: 'Order ID is required' })
  @IsString()
  orderId: string;

  @IsOptional()
  @IsString()
  razorpay_order_id?: string;

  @IsOptional()
  @IsString()
  razorpay_payment_id?: string;

  @IsOptional()
  @IsString()
  razorpay_signature?: string;

  @IsOptional()
  @IsString()
  signature?: string;

  @IsOptional()
  @IsString()
  paymentSessionId?: string;

  @IsOptional()
  amount?: number;
}
