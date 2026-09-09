import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateAttributeCaptionDto {
  @IsNotEmpty({ message: 'Caption name is required' })
  @IsString()
  caption: string;

  @IsOptional()
  @IsString()
  inputType?: string;

  @IsOptional()
  iconShow?: boolean | string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  image?: string;
}

export class AddCaptionValueDto {
  @IsNotEmpty({ message: 'Value string is required' })
  @IsString()
  value: string;

  @IsOptional()
  iconShow?: boolean | string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  image?: string;
}
