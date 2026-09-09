import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateMainCategoryDto {
  @IsNotEmpty({ message: 'Main category name is required' })
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

export class UpdateMainCategoryDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsString()
  status?: string;
}
