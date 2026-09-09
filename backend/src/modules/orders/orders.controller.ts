import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, HttpCode, HttpStatus, Res
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Orders')
@ApiBearerAuth('JWT-auth')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @ApiOperation({ summary: 'Get all orders across store (Admin)' })
  async getAll(@Query() query: OrderQueryDto) {
    return this.ordersService.getAll(query);
  }

  @Get('my-orders')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Get current authenticated customer's order history" })
  async getMyOrders(@CurrentUser() user: any, @Query() query: OrderQueryDto) {
    return this.ordersService.getMyOrders(user.id, query);
  }

  @Get('payment-errors')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @ApiOperation({ summary: 'Get payment errors log (Admin)' })
  async getPaymentErrors() {
    return this.ordersService.getPaymentErrors();
  }

  @Get('audit-logs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @ApiOperation({ summary: 'Get order audit logs (Admin)' })
  async getAuditLogs() {
    return this.ordersService.getAuditLogs();
  }

  @Get('order-flow')
  @ApiOperation({ summary: 'Get order status flow steps list' })
  getOrderFlow() {
    return {
      success: true,
      steps: [
        { key: 'Received', label: 'Received' },
        { key: 'Processing', label: 'Processing' },
        { key: 'Shipped', label: 'Shipped' },
        { key: 'Delivered', label: 'Delivered' },
        { key: 'Cancelled', label: 'Cancelled' },
        { key: 'Return Requested', label: 'Return Requested' },
        { key: 'Returned', label: 'Returned' },
        { key: 'Refund Initiated', label: 'Refund Initiated' },
        { key: 'Refunded', label: 'Refunded' },
      ],
    };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get order details by ID (Customer ownership enforced)' })
  @ApiParam({ name: 'id', type: String })
  async getById(@Param('id') id: string, @CurrentUser() user: any) {
    return this.ordersService.getById(id, user?.id, user?.role);
  }

  @Get(':id/invoice')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Download order PDF invoice' })
  @ApiParam({ name: 'id', type: String })
  async downloadInvoice(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Res() res: any,
  ) {
    return this.ordersService.generateInvoicePdf(id, user?.id, user?.role, res);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new order' })
  async create(@CurrentUser() user: any, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(dto, user.id);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @ApiOperation({ summary: 'Update order status (Admin)' })
  @ApiParam({ name: 'id', type: String })
  async updateStatus(
    @Param('id') id: string,
    @Body('orderStatus') orderStatus: string,
    @Body('notes') notes?: string,
    @Body('reason') reason?: string,
    @CurrentUser() user?: any,
  ) {
    return this.ordersService.updateStatus(id, orderStatus, notes, user?.name, reason);
  }

  @Patch(':id/payment-status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @ApiOperation({ summary: 'Update order payment status (Admin)' })
  @ApiParam({ name: 'id', type: String })
  async updatePaymentStatus(
    @Param('id') id: string,
    @Body('paymentStatus') paymentStatus: string,
    @CurrentUser() user?: any,
  ) {
    return this.ordersService.updatePaymentStatus(id, paymentStatus, user?.name);
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Cancel order (Customer self-service)' })
  @ApiParam({ name: 'id', type: String })
  async cancelMyOrder(
    @Param('id') id: string,
    @Body('reason') reason?: string,
    @CurrentUser() user?: any,
  ) {
    return this.ordersService.cancelOrder(id, reason, user?.id);
  }

  @Post(':id/return')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Request return for order (Customer self-service)' })
  @ApiParam({ name: 'id', type: String })
  async requestReturn(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Body('comments') comments?: string,
    @CurrentUser() user?: any,
  ) {
    return this.ordersService.requestReturn(id, reason, comments, user?.id);
  }

  @Get(':id/return')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get return request status for order' })
  @ApiParam({ name: 'id', type: String })
  async getReturnStatus(
    @Param('id') id: string,
    @CurrentUser() user?: any,
  ) {
    return this.ordersService.getReturnStatus(id, user?.id);
  }

  @Patch(':id/courier')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @ApiOperation({ summary: 'Update courier tracking info (Admin)' })
  @ApiParam({ name: 'id', type: String })
  async updateCourier(
    @Param('id') id: string,
    @Body() dto: any,
    @CurrentUser() user?: any,
  ) {
    return this.ordersService.updateCourier(id, dto, user?.name);
  }

  @Delete(':id/courier')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @ApiOperation({ summary: 'Delete courier info (Admin)' })
  @ApiParam({ name: 'id', type: String })
  async deleteCourier(@Param('id') id: string) {
    return this.ordersService.deleteCourier(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @ApiOperation({ summary: 'Soft delete order (Admin)' })
  @ApiParam({ name: 'id', type: String })
  async delete(@Param('id') id: string, @CurrentUser() user?: any) {
    return this.ordersService.delete(id, user?.id || user?.username);
  }
}
