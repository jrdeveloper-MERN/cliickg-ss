import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreatePaymentOrderDto {
  @IsNotEmpty({ message: 'Order ID is required' })
  @IsString()
  orderId: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  customerEmail?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsString()
  requestedGateway?: string;
}
