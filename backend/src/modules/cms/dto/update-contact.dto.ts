import { IsString, IsOptional } from 'class-validator';

export class UpdateContactDto {
  @IsOptional()
  pageTitle?: string;

  @IsOptional()
  heading?: string;

  @IsOptional()
  description?: string;

  @IsOptional()
  storeName?: string;

  @IsOptional()
  phone?: string;

  @IsOptional()
  secondaryPhone?: string;

  @IsOptional()
  email?: string;

  @IsOptional()
  secondaryEmail?: string;

  @IsOptional()
  address?: string;

  @IsOptional()
  mapUrl?: string;

  @IsOptional()
  googleMapEmbed?: string;

  @IsOptional()
  workingHours?: string;

  @IsOptional()
  businessHours?: string;

  @IsOptional()
  facebook?: string;

  @IsOptional()
  instagram?: string;

  @IsOptional()
  whatsapp?: string;

  @IsOptional()
  youtube?: string;

  @IsOptional()
  twitter?: string;

  @IsOptional()
  linkedin?: string;

  @IsOptional()
  pinterest?: string;

  @IsOptional()
  seoTitle?: string;

  @IsOptional()
  seoDescription?: string;

  @IsOptional()
  seoKeywords?: string;

  @IsOptional()
  branches?: any;
}
