import { IsNotEmpty, IsArray, IsOptional, IsString } from 'class-validator';
import { OrderItemInputDto } from '../../orders/dto/create-order.dto';

export class ProcessCheckoutDto {
  @IsNotEmpty({ message: 'Cart items array is required' })
  @IsArray()
  items: OrderItemInputDto[];

  @IsNotEmpty({ message: 'Shipping address is required' })
  shippingAddress: {
    pincode: string;
    addressLine1?: string;
    city?: string;
    state?: string;
    country?: string;
  };

  @IsOptional()
  billingAddress?: any;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  deliveryType?: string;

  @IsOptional()
  @IsString()
  promoCode?: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
