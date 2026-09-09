import { IsString, IsOptional, IsArray, IsNumber, IsBoolean } from 'class-validator';

export class UpdateDeliveryZoneDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  zoneName?: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  zoneType?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsArray()
  @IsOptional()
  states?: string[];

  @IsString()
  @IsOptional()
  district?: string;

  @IsArray()
  @IsOptional()
  pincodes?: string[];

  @IsArray()
  @IsOptional()
  exclusivePincodes?: string[];

  @IsString()
  @IsOptional()
  status?: string;

  @IsNumber()
  @IsOptional()
  priority?: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  serviceable?: boolean;

  @IsNumber()
  @IsOptional()
  estimatedDeliveryDays?: number;
}
