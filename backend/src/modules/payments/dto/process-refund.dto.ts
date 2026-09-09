import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsNumber, Min } from 'class-validator';

export class ProcessRefundDto {
  @ApiProperty({ description: 'Internal Order ID, Order No, or Database ID' })
  @IsNotEmpty()
  @IsString()
  orderId: string;

  @ApiProperty({ description: 'Optional refund amount (Defaults to full order total server-side)', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @ApiProperty({ description: 'Reason for refund', required: false })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiProperty({ description: 'Optional idempotency key for duplicate refund prevention', required: false })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @ApiProperty({ description: 'Optional explicit gateway payment ID (pay_xxxx) for orphan payment refunds', required: false })
  @IsOptional()
  @IsString()
  gatewayPaymentId?: string;
}

