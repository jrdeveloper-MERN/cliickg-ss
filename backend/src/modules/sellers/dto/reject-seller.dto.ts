import { IsString, IsNotEmpty, Length } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class RejectSellerDto {
  @ApiProperty({ description: 'Reason for rejecting seller application', example: 'Invalid PAN document details' })
  @IsString()
  @IsNotEmpty({ message: 'Rejection reason is required' })
  @Length(3, 500, { message: 'Rejection reason must be between 3 and 500 characters' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  rejectionReason: string;
}
