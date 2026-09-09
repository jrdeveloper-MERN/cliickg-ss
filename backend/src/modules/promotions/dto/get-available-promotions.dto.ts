import { IsNumber, IsOptional, IsString, IsArray } from 'class-validator';

export class GetAvailablePromotionsDto {
  @IsNumber()
  @IsOptional()
  subtotal?: number;

  @IsArray()
  @IsOptional()
  cartItems?: any[];

  @IsString()
  @IsOptional()
  pincode?: string;

  @IsString()
  @IsOptional()
  paymentMethod?: string;
}
