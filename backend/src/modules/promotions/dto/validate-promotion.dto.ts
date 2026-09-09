import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class ValidatePromotionDto {
  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  promoCode?: string;

  @IsNumber()
  @IsOptional()
  subtotal?: number;

  @IsString()
  @IsOptional()
  userId?: string;

  @IsOptional()
  cartItems?: any;

  @IsOptional()
  customerInfo?: any;

  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @IsString()
  @IsOptional()
  pincode?: string;
}

