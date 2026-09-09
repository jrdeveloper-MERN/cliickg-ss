import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateSubCategoryDto {
  @IsNotEmpty({ message: 'Subcategory name is required' })
  @IsString()
  name: string;

  @IsNotEmpty({ message: 'Main category ID is required' })
  @IsString()
  mainCategoryId: string;

  @IsNotEmpty({ message: 'Category ID is required' })
  @IsString()
  categoryId: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

export class UpdateSubCategoryDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  mainCategoryId?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsString()
  status?: string;
}
