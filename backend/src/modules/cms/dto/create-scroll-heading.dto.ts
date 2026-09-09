import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class CreateScrollHeadingDto {
  @IsString()
  @IsNotEmpty()
  text: string;

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
