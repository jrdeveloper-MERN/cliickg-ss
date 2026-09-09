import { IsString, IsOptional, IsEmail, Matches, Length } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSellerDto {
  @ApiPropertyOptional({ description: 'Business name' })
  @IsOptional()
  @IsString()
  @Length(2, 100)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  businessName?: string;

  @ApiPropertyOptional({ description: 'Seller type' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  sellerType?: string;

  @ApiPropertyOptional({ description: 'GST Number' })
  @IsOptional()
  @IsString()
  @Matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  gstNumber?: string;

  @ApiPropertyOptional({ description: 'PAN Number' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  panNumber?: string;

  @ApiPropertyOptional({ description: 'Contact person' })
  @IsOptional()
  @IsString()
  @Length(2, 100)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  contactPerson?: string;

  @ApiPropertyOptional({ description: 'Email address' })
  @IsOptional()
  @IsEmail()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  email?: string;

  @ApiPropertyOptional({ description: 'Mobile number' })
  @IsOptional()
  @IsString()
  @Matches(/^[6-9]\d{9}$/)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().replace(/\D/g, '') : value))
  mobileNumber?: string;

  @ApiPropertyOptional({ description: 'Business location' })
  @IsOptional()
  @IsString()
  @Length(3, 250)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  businessLocation?: string;

  @ApiPropertyOptional({ description: 'Pincode' })
  @IsOptional()
  @IsString()
  @Matches(/^[1-9][0-9]{5}$/)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  pincode?: string;

  @ApiPropertyOptional({ description: 'Product Category' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  productCategory?: string;
}
