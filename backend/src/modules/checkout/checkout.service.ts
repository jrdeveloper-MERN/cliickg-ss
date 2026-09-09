import { Injectable, BadRequestException } from '@nestjs/common';
import { OrdersService } from '../orders/orders.service';
import { PaymentsService } from '../payments/payments.service';
import { ProcessCheckoutDto } from './dto/checkout.dto';

@Injectable()
export class CheckoutService {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly paymentsService: PaymentsService,
  ) {}

  async processCheckout(dto: ProcessCheckoutDto, userId?: string) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException({ message: 'Cart items array cannot be empty for checkout.' });
    }

    if (!dto.shippingAddress || !dto.shippingAddress.pincode) {
      throw new BadRequestException({
        message: 'Valid shipping address with postal pincode is required for checkout.',
        errors: ['MISSING_SHIPPING_CONFIGURATION'],
      });
    }

    // 1. Create Order with Zero-Trust PostgreSQL price recalculation & historical snapshot
    const order = await this.ordersService.create(
      {
        items: dto.items,
        shippingAddress: dto.shippingAddress,
        billingAddress: dto.billingAddress || dto.shippingAddress,
        paymentMethod: dto.paymentMethod || 'COD',
        deliveryType: dto.deliveryType || 'Standard',
        promoCode: dto.promoCode,
        idempotencyKey: dto.idempotencyKey,
      },
      userId,
    );

    // 2. If online payment method selected, initiate payment session automatically
    let paymentSession = null;
    if (dto.paymentMethod && dto.paymentMethod !== 'COD') {
      paymentSession = await this.paymentsService.createPaymentOrder({
        orderId: order.orderId,
        customerName: order.customerName,
        customerEmail: order.email,
        customerPhone: order.mobile,
        requestedGateway: dto.paymentMethod,
      });
    }

    return {
      success: true,
      message: 'Checkout processed successfully.',
      order,
      paymentSession,
    };
  }
}
