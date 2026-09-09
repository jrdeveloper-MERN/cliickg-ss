import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  IsBoolean,
  Matches,
  Length,
  Equals,
  IsIn,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSellerDto {
  @ApiProperty({ description: 'Registered business name', example: 'ABC Enterprises' })
  @IsString()
  @IsNotEmpty({ message: 'Business name is required' })
  @Length(2, 100, { message: 'Business name must be between 2 and 100 characters' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  businessName: string;

  @ApiPropertyOptional({ description: 'Type of seller entity', example: 'Seller', default: 'Seller' })
  @IsOptional()
  @IsString()
  @IsIn(['Seller'], { message: 'Invalid seller type. Only Seller is allowed.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  sellerType?: string;

  @ApiPropertyOptional({ description: '15-character GSTIN (Optional)', example: '33AAAAA0000A1Z5' })
  @IsOptional()
  @IsString()
  @Matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, {
    message: 'Invalid GSTIN format. Example: 33AAAAA0000A1Z5',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  gstNumber?: string;

  @ApiProperty({ description: '10-character PAN number', example: 'ABCDE1234F' })
  @IsString()
  @IsNotEmpty({ message: 'PAN number is required' })
  @Matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, {
    message: 'Invalid PAN format. Example: ABCDE1234F',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  panNumber: string;

  @ApiProperty({ description: 'Contact person full name', example: 'John Doe' })
  @IsString()
  @IsNotEmpty({ message: 'Contact person is required' })
  @Length(2, 100, { message: 'Contact person name must be between 2 and 100 characters' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  contactPerson: string;

  @ApiProperty({ description: 'Business email address', example: 'john@example.com' })
  @IsEmail({}, { message: 'A valid email address is required' })
  @IsNotEmpty({ message: 'Email address is required' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  email: string;

  @ApiProperty({ description: '10-digit Indian mobile number', example: '9876543210' })
  @IsString()
  @IsNotEmpty({ message: 'Mobile number is required' })
  @Matches(/^[6-9]\d{9}$/, {
    message: 'Invalid mobile number format. Must be a 10-digit Indian mobile number',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().replace(/\D/g, '') : value))
  mobileNumber: string;

  @ApiProperty({ description: 'Business address / location', example: '123 Industrial Area, Chennai' })
  @IsString()
  @IsNotEmpty({ message: 'Business location is required' })
  @Length(3, 250, { message: 'Business location must be between 3 and 250 characters' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  businessLocation: string;

  @ApiProperty({ description: '6-digit Indian pincode', example: '600001' })
  @IsString()
  @IsNotEmpty({ message: 'Pincode is required' })
  @Matches(/^[1-9][0-9]{5}$/, {
    message: 'Invalid pincode format. Must be a valid 6-digit Indian pincode',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  pincode: string;

  @ApiProperty({ description: 'Primary product category', example: 'Construction Materials' })
  @IsString()
  @IsNotEmpty({ message: 'Product category is required' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  productCategory: string;

  @ApiProperty({ description: 'Consent agreement acceptance', example: true })
  @IsBoolean({ message: 'Agreement acceptance must be a boolean' })
  @Equals(true, { message: 'You must agree to the Terms & Conditions to register' })
  agreementAccepted: boolean;
}
