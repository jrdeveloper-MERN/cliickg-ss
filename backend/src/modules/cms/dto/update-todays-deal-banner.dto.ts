import { IsString, IsOptional } from 'class-validator';

export class UpdateTodaysDealBannerDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  image?: string;

  @IsString()
  @IsOptional()
  link?: string;

  @IsString()
  @IsOptional()
  linkType?: string;

  @IsString()
  @IsOptional()
  linkId?: string;

  @IsString()
  @IsOptional()
  linkUrl?: string;

  @IsString()
  @IsOptional()
  status?: string;
}
