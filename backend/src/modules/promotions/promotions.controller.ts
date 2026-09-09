import {
  Controller, Get, Post, Put, Patch, Delete, Param, Body, Query, UseGuards, HttpCode, HttpStatus
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PromotionsService } from './promotions.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { PromotionQueryDto } from './dto/promotion-query.dto';
import { ValidatePromotionDto } from './dto/validate-promotion.dto';
import { GetAvailablePromotionsDto } from './dto/get-available-promotions.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Promotions & Coupons')
@Controller(['promotions', 'promos'])
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  async getAll(@Query() query: PromotionQueryDto) {
    return this.promotionsService.getAll(query);
  }

  @Get('active')
  @UseGuards(OptionalJwtAuthGuard)
  async getActivePromos(@CurrentUser() user?: any) {
    return this.promotionsService.getActivePromos(user);
  }

  @Post('available')
  @UseGuards(OptionalJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getAvailablePromos(@Body() dto: GetAvailablePromotionsDto, @CurrentUser() user?: any) {
    return this.promotionsService.getAvailablePromos(dto, user);
  }

  @Get('analytics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  async getAnalytics() {
    return this.promotionsService.getAnalytics();
  }

  @Get('customer-search')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  async searchCustomers(@Query('query') query: string) {
    return this.promotionsService.searchCustomers(query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  async getById(@Param('id') id: string) {
    return this.promotionsService.getById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreatePromotionDto) {
    return this.promotionsService.create(dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  async update(@Param('id') id: string, @Body() dto: UpdatePromotionDto) {
    return this.promotionsService.update(id, dto);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  async toggleStatus(@Param('id') id: string) {
    return this.promotionsService.toggleStatus(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  async delete(@Param('id') id: string, @CurrentUser() user?: any) {
    return this.promotionsService.delete(id, user?.id || user?.username);
  }

  @Post('validate')
  @UseGuards(OptionalJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async validatePromoCode(@Body() dto: ValidatePromotionDto, @CurrentUser() user?: any) {
    return this.promotionsService.validatePromoCode(dto, user?.id);
  }
}


