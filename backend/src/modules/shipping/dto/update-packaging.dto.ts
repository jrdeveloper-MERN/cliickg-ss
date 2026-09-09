import { IsString, IsNumber, IsOptional } from 'class-validator';

export class UpdatePackagingDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  boxSize?: string;

  @IsNumber()
  @IsOptional()
  charge?: number;

  @IsString()
  @IsOptional()
  status?: string;
}
