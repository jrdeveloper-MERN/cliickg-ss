import {
  Controller, Get, Post, Put, Patch, Delete, Param, Body, Query, UseGuards, HttpCode, HttpStatus, ForbiddenException
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Customers')
@ApiBearerAuth('JWT-auth')
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current customer profile details' })
  async getMe(@CurrentUser() user: any) {
    return this.customersService.getMeCustomer(user.id);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @ApiOperation({ summary: 'Get paginated list of customers (Admin)' })
  async getAll(
    @Query('status') status?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.customersService.getAll({ status, fromDate, toDate, search, page, limit });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @ApiOperation({ summary: 'Get customer by ID (Admin)' })
  @ApiParam({ name: 'id', type: String })
  async getById(@Param('id') id: string) {
    return this.customersService.getById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new customer record (Admin)' })
  async create(@Body() dto: CreateCustomerDto) {
    return this.customersService.create(dto);
  }

  @Put('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update current customer profile details' })
  async updateMe(@CurrentUser() user: any, @Body() dto: UpdateCustomerDto) {
    const customer = await this.customersService.getMeCustomer(user.id);
    return this.customersService.update(customer.id, dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update customer profile by ID (Customer self-service or Admin)' })
  @ApiParam({ name: 'id', type: String })
  async update(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    if (id === 'me') {
      const customer = await this.customersService.getMeCustomer(user.id);
      return this.customersService.update(customer.id, dto);
    }
    const customer = await this.customersService.getById(id);
    const isOwner = (customer.userId && customer.userId === user.id) || customer.id === user.id || (customer.mobileNumber && user.mobileNumber && customer.mobileNumber === user.mobileNumber);
    const isAdmin = user.role === 'admin' || user.role === 'super admin';

    if (!isAdmin && !isOwner) {
      throw new ForbiddenException({ message: 'Unauthorized profile update request' });
    }
    return this.customersService.update(customer.id, dto, isAdmin);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @ApiOperation({ summary: 'Toggle customer account status (Admin)' })
  @ApiParam({ name: 'id', type: String })
  async toggleStatus(@Param('id') id: string) {
    return this.customersService.toggleStatus(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @ApiOperation({ summary: 'Delete customer record (Admin)' })
  @ApiParam({ name: 'id', type: String })
  async delete(@Param('id') id: string, @Query('hard') hard?: string) {
    const isHard = String(hard).toLowerCase() === 'true';
    return this.customersService.delete(id, isHard);
  }
}
