import { IsEnum, IsNotEmpty, IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PolicyType } from '@prisma/client';

export class CreatePolicyDto {
  @ApiProperty({
    enum: PolicyType,
    description: 'Unique policy type (DELIVERY, PRIVACY, TERMS, RETURN_REFUND)',
    example: 'DELIVERY',
  })
  @IsEnum(PolicyType, {
    message: 'type must be one of: DELIVERY, PRIVACY, TERMS, RETURN_REFUND',
  })
  @IsNotEmpty()
  type: PolicyType;

  @ApiProperty({
    description: 'Human readable display title for the policy',
    example: 'Delivery Policy',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({
    description: 'URL-friendly unique slug',
    example: 'delivery-policy',
  })
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiProperty({
    description: 'Authoritative Tiptap JSON document structure (Source of Truth)',
    example: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Policy details here.' }] }] },
  })
  @IsNotEmpty()
  contentJson: any;

  @ApiPropertyOptional({
    description: 'Sanitized derived HTML representation',
    example: '<p>Policy details here.</p>',
  })
  @IsString()
  @IsOptional()
  contentHtml?: string;

  @ApiPropertyOptional({
    description: 'Publication visibility flag',
    default: true,
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;
}
