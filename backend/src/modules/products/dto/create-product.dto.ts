import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateProductDto {
  @IsNotEmpty({ message: 'Product name is required' })
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  offerText?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsNotEmpty({ message: 'Main Category ID is required' })
  @IsString()
  mainCategoryId: string;

  @IsNotEmpty({ message: 'Category ID is required' })
  @IsString()
  categoryId: string;

  @IsNotEmpty({ message: 'SubCategory ID is required' })
  @IsString()
  subCategoryId: string;

  @IsOptional()
  @IsString()
  hsnCode?: string;

  @IsOptional()
  @IsString()
  productImage?: string;

  @IsOptional()
  @IsString()
  secondaryImage?: string;

  @IsOptional()
  @IsString()
  shortDescription?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  price?: number | string;

  @IsOptional()
  stock?: number | string;

  @IsOptional()
  attributes?: any;

  @IsOptional()
  productDetails?: any;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  certificates?: any;

  @IsOptional()
  selectedCertificates?: any;
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  offerText?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  mainCategoryId?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  subCategoryId?: string;

  @IsOptional()
  @IsString()
  hsnCode?: string;

  @IsOptional()
  @IsString()
  productImage?: string;

  @IsOptional()
  @IsString()
  secondaryImage?: string;

  @IsOptional()
  @IsString()
  shortDescription?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  price?: number | string;

  @IsOptional()
  stock?: number | string;

  @IsOptional()
  attributes?: any;

  @IsOptional()
  productDetails?: any;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  certificates?: any;

  @IsOptional()
  selectedCertificates?: any;
}
