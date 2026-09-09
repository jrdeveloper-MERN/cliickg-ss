import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateAttributeMappingDto {
  @IsOptional()
  @IsString()
  mainCategoryId?: string;

  @IsNotEmpty({ message: 'Category ID is required' })
  @IsString()
  categoryId: string;

  @IsOptional()
  @IsString()
  subCategoryId?: string;

  @IsOptional()
  @IsString()
  attributeId?: string;

  @IsOptional()
  values?: any;
}
