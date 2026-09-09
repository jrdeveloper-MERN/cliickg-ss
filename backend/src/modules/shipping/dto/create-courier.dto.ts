import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateCourierDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsOptional()
  apiType?: string;

  @IsString()
  @IsOptional()
  trackingUrlTemplate?: string;

  @IsString()
  @IsOptional()
  status?: string;
}
