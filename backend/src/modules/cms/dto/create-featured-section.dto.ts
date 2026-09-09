import { IsString, IsNotEmpty, IsNumber, IsArray, IsOptional } from 'class-validator';

export class CreateFeaturedSectionDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsString()
  @IsOptional()
  selectType?: string;

  @IsArray()
  @IsOptional()
  productIds?: string[];

  @IsOptional()
  position?: number;

  @IsOptional()
  priority?: number;

  @IsString()
  @IsOptional()
  status?: string;

  @IsOptional()
  shortDescription?: string;

  @IsOptional()
  seoKeywordDescription?: string;

  @IsOptional()
  gridType?: string;

  @IsOptional()
  carouselType?: string;

  @IsOptional()
  mediaType?: string;

  @IsOptional()
  productStyle?: string;

  @IsOptional()
  items?: any;
}
