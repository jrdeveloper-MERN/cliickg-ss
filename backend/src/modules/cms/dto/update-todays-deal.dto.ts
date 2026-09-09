import { IsString, IsArray, IsOptional } from 'class-validator';

export class UpdateTodaysDealDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  discountText?: string;

  @IsArray()
  @IsOptional()
  productIds?: string[];

  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsOptional()
  shortDescription?: string;

  @IsOptional()
  seoKeywordDescription?: string;

  @IsOptional()
  type?: string;

  @IsOptional()
  selectType?: string;

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

  @IsOptional()
  position?: number;

  @IsOptional()
  priority?: number;
}
