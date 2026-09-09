import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendOtpDto {
  @ApiPropertyOptional({ example: '+91', description: 'Country Calling Code' })
  @IsOptional()
  @IsString()
  countryCode?: string;

  @ApiProperty({ example: '9876543210', description: '10-digit mobile number' })
  @IsNotEmpty({ message: 'Mobile number is required' })
  @IsString()
  mobileNumber: string;

  @ApiPropertyOptional({ example: false, description: 'Set true if requesting registration OTP' })
  @IsOptional()
  @IsBoolean()
  isRegistration?: boolean;

  @ApiPropertyOptional({ example: 'user@example.com', description: 'Optional email address' })
  @IsOptional()
  @IsString()
  email?: string;
}

