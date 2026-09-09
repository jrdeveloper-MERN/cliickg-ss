import { IsString, IsOptional } from 'class-validator';

export class DashboardQueryDto {
  @IsString()
  @IsOptional()
  format?: string;
}
