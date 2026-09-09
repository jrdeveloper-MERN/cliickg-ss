import { IsString, IsOptional } from 'class-validator';

export class UpdateCourierDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  code?: string;

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
