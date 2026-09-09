import { IsNotEmpty, IsOptional, IsString, IsArray, IsNumber, Min } from 'class-validator';

export class OrderItemInputDto {
  @IsNotEmpty({ message: 'Product ID is required' })
  @IsString()
  productId?: string;

  @IsOptional()
  @IsString()
  _id?: string;

  @IsOptional()
  @IsString()
  variantId?: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  skuCode?: string;

  @IsOptional()
  @IsString()
  selectedSize?: string;

  @IsOptional()
  @IsString()
  purity?: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  @IsNotEmpty({ message: 'Order items array is required' })
  @IsArray()
  items: OrderItemInputDto[];

  @IsOptional()
  shippingAddress?: any;

  @IsOptional()
  billingAddress?: any;

  @IsOptional()
  customerInfo?: any;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  mobile?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  address?: string;

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
  orderId?: string;

  @IsOptional()
  @IsString()
  orderNo?: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
