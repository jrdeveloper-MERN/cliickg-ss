import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class ReturnOrderDto {
  @IsString()
  @IsNotEmpty({ message: 'Return reason is required' })
  reason: string;

  @IsString()
  @IsOptional()
  @MaxLength(500, { message: 'Comments cannot exceed 500 characters' })
  comments?: string;
}
