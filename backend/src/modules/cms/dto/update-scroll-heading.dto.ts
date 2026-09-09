import { IsString, IsNumber, IsOptional } from 'class-validator';

export class UpdateScrollHeadingDto {
  @IsString()
  @IsOptional()
  text?: string;

  @IsString()
  @IsOptional()
  link?: string;

  @IsNumber()
  @IsOptional()
  position?: number;

  @IsString()
  @IsOptional()
  status?: string;
}
