import {
  Controller, Get, Post, Put, Param, Body, Query, Headers, Req, UseGuards, HttpCode, HttpStatus
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentOrderDto } from './dto/create-payment-order.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { UpdateGatewayDto } from './dto/update-gateway.dto';
import { ProcessRefundDto } from './dto/process-refund.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('active-gateways')
  @ApiOperation({ summary: 'Get active payment gateways for checkout' })
  async getActiveGateways() {
    return this.paymentsService.getActiveGateways();
  }

  @Get('gateways')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all payment gateways configuration (Admin)' })
  async getAllGateways() {
    const data = await this.paymentsService.getAllGateways();
    return { success: true, data };
  }

  @Post('gateways/set-default/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set default payment gateway (Admin)' })
  async setDefaultGateway(@Param('id') id: string) {
    const updated = await this.paymentsService.setDefaultGateway(id);
    return { success: true, message: 'Default gateway updated', data: updated };
  }

  @Put('gateways/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update payment gateway credentials/settings (Admin)' })
  async updateGateway(@Param('id') id: string, @Body() payload: UpdateGatewayDto) {
    const updated = await this.paymentsService.updateGateway(id, payload);
    return { success: true, message: 'Gateway settings updated', data: updated };
  }

  @Post('create-order')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create Razorpay order for checkout or payment retry' })
  async createPaymentOrder(@Body() dto: CreatePaymentOrderDto, @CurrentUser() user?: any) {
    return this.paymentsService.createPaymentOrder(dto, user?.id, user?.role);
  }

  @Get('order/:orderId/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get payment and order status with retry metadata' })
  async getPaymentStatus(@Param('orderId') orderId: string, @CurrentUser() user?: any) {
    return this.paymentsService.getOrderPaymentStatus(orderId, user?.id, user?.role);
  }

  @Post('record-failure')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Record payment cancellation or failure attempt' })
  async recordPaymentFailure(@Body() dto: any, @CurrentUser() user?: any) {
    return this.paymentsService.recordPaymentFailure(dto, user?.id, user?.role);
  }

  @Post('verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify Razorpay payment signature' })
  async verifyPayment(@Body() dto: VerifyPaymentDto) {
    return this.paymentsService.verifyPayment(dto);
  }

  @Post('refund')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Initiate automated Razorpay refund for an order (Admin)' })
  async processRefund(@Body() dto: ProcessRefundDto, @CurrentUser() user?: any) {
    return this.paymentsService.processOrderRefund(dto, user?.id, user?.role);
  }

  @Post('webhook/:gateway')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Process payment gateway webhook events' })
  @ApiHeader({ name: 'x-razorpay-signature', required: false, description: 'Razorpay HMAC Webhook Signature' })
  async handleWebhook(
    @Param('gateway') gateway: string,
    @Body() payload: any,
    @Headers('x-razorpay-signature') signature?: string,
    @Req() req?: any,
  ) {
    return this.paymentsService.handleWebhook(gateway, payload, signature, req?.rawBody);
  }

  @Get('transactions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get payment transactions list (Admin)' })
  async getTransactions(
    @Query('orderId') orderId?: string,
    @Query('gateway') gateway?: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.paymentsService.getTransactions({ orderId, gateway, status, page, limit });
  }
}

