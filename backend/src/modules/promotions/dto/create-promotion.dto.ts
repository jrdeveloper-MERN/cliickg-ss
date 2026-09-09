import { IsString, IsNotEmpty, IsOptional, IsNumber, IsArray, IsBoolean } from 'class-validator';

export class CreatePromotionDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  discountType?: 'Percentage' | 'Flat' | string;

  @IsNumber()
  @IsOptional()
  discountValue?: number;

  @IsNumber()
  @IsOptional()
  discount?: number;

  @IsNumber()
  @IsOptional()
  maxDiscountAmount?: number;

  @IsNumber()
  @IsOptional()
  minOrderAmount?: number;

  @IsNumber()
  @IsOptional()
  maxOrderAmount?: number;

  @IsOptional()
  startDate?: string;

  @IsOptional()
  endDate?: string;

  @IsNumber()
  @IsOptional()
  usageLimit?: number;

  @IsNumber()
  @IsOptional()
  noOfUsers?: number;

  @IsNumber()
  @IsOptional()
  perUserLimit?: number;

  @IsNumber()
  @IsOptional()
  repeatUsage?: number;

  @IsString()
  @IsOptional()
  targetComponent?: string;

  @IsOptional()
  applyDiscountOn?: string | string[];

  @IsString()
  @IsOptional()
  customerEligibility?: string;

  @IsString()
  @IsOptional()
  userType?: string;

  @IsArray()
  @IsOptional()
  specificCustomerIds?: string[];

  @IsString()
  @IsOptional()
  specificCustomerEmail?: string;

  @IsArray()
  @IsOptional()
  allowedPaymentMethods?: string[];

  @IsNumber()
  @IsOptional()
  productLimit?: number;

  @IsArray()
  @IsOptional()
  allowedPincodes?: string[];

  @IsArray()
  @IsOptional()
  productIds?: string[];

  @IsArray()
  @IsOptional()
  categoryIds?: string[];

  @IsArray()
  @IsOptional()
  mainCategoryIds?: string[];

  @IsArray()
  @IsOptional()
  subCategoryIds?: string[];

  @IsBoolean()
  @IsOptional()
  isExclusive?: boolean;

  @IsBoolean()
  @IsOptional()
  isStackable?: boolean;

  @IsString()
  @IsOptional()
  badgeColor?: string;

  @IsString()
  @IsOptional()
  backgroundColor?: string;

  @IsString()
  @IsOptional()
  status?: 'Active' | 'Inactive' | string;
}

