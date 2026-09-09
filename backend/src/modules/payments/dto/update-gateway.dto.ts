import { IsBoolean, IsOptional, IsString, IsObject } from 'class-validator';

export class UpdateGatewayDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsString()
  mode?: string;

  @IsOptional()
  @IsObject()
  credentials?: Record<string, any>;
}
