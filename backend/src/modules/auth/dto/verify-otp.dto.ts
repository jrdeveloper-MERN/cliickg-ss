import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VerifyOtpDto {
  @ApiPropertyOptional({ example: '+91', description: 'Country Calling Code' })
  @IsOptional()
  @IsString()
  countryCode?: string;

  @ApiProperty({ example: '9876543210', description: '10-digit mobile number' })
  @IsNotEmpty({ message: 'Mobile number is required' })
  @IsString()
  mobileNumber: string;

  @ApiProperty({ example: '12345', description: '5-digit OTP code' })
  @IsNotEmpty({ message: 'OTP code is required' })
  @IsString()
  otp: string;

  @ApiPropertyOptional({ example: false, description: 'Set true if verifying registration OTP' })
  @IsOptional()
  @IsBoolean()
  isRegistration?: boolean;

  @ApiPropertyOptional({ example: 'Manikumar J', description: 'Full name required for completing registration' })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({ example: 'manikumarj@example.com', description: 'Optional email address' })
  @IsOptional()
  @IsString()
  email?: string;
}

