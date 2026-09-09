import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class CreatePackagingDto {
  @IsString()
  @IsNotEmpty()
  name: string;

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
