import { IsNotEmpty, IsOptional, IsString, IsArray, IsNumber } from 'class-validator';

export class ShippingItemDto {
  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsString()
  _id?: string;

  @IsOptional()
  @IsString()
  variantId?: string;

  @IsNotEmpty()
  @IsNumber()
  quantity: number;

  @IsOptional()
  @IsString()
  sku?: string;
}

export class CalculateShippingDto {
  @IsNotEmpty()
  address: {
    pincode: string;
    city?: string;
    state?: string;
    country?: string;
  };

  @IsOptional()
  @IsArray()
  items?: ShippingItemDto[];

  @IsOptional()
  @IsArray()
  cartItems?: ShippingItemDto[];

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  deliveryType?: string;

  @IsOptional()
  @IsString()
  packagingRuleId?: string;
}
