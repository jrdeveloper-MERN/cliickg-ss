import { IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateSellerStatusDto {
  @ApiProperty({ description: 'New seller account status', enum: ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'] })
  @IsString()
  @IsIn(['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'], {
    message: 'Status must be one of: PENDING, APPROVED, REJECTED, SUSPENDED',
  })
  status: string;
}
