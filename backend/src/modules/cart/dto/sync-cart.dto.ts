import { IsArray, IsOptional, IsString, IsInt, Min, Max } from 'class-validator';

export class SyncCartItemDto {
  @IsOptional()
  @IsString()
  _id?: string;

  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsString()
  variantId?: string;

  @IsOptional()
  @IsString()
  variantKey?: string;

  @IsOptional()
  @IsString()
  purity?: string;

  @IsOptional()
  variant?: any;

  @IsOptional()
  @IsInt({ message: 'Quantity must be an integer' })
  @Min(1, { message: 'Quantity must be at least 1' })
  @Max(9999, { message: 'Quantity cannot exceed 9999' })
  quantity?: number;

  @IsOptional()
  @IsString()
  selectedSize?: string;
}

export class SyncCartDto {
  @IsOptional()
  @IsArray()
  items?: SyncCartItemDto[];
}
