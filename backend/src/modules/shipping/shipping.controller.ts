import {
  Controller, Get, Post, Put, Patch, Delete, Param, Body, UseGuards, HttpCode, HttpStatus, UseInterceptors, UploadedFile
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { ApiTags } from '@nestjs/swagger';
import { ShippingService } from './shipping.service';
import { CalculateShippingDto } from './dto/calculate-shipping.dto';
import { CreateDeliveryZoneDto } from './dto/create-delivery-zone.dto';
import { UpdateDeliveryZoneDto } from './dto/update-delivery-zone.dto';
import { CreatePackagingDto } from './dto/create-packaging.dto';
import { UpdatePackagingDto } from './dto/update-packaging.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

const uploadStorage = diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = join(process.cwd(), 'uploads');
    if (!existsSync(uploadPath)) {
      mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
  },
});

@ApiTags('Shipping')
@Controller('shipping')
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  @Get(['dashboard-stats', 'dashboard'])
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  async getDashboardStats() {
    return this.shippingService.getDashboardStats();
  }

  @Post('calculate')
  @HttpCode(HttpStatus.OK)
  async calculateShipping(@Body() dto: CalculateShippingDto) {
    return this.shippingService.calculateShipping(dto);
  }

  // Delivery Zones
  @Get('zones')
  async getDeliveryZones() {
    return this.shippingService.getDeliveryZones();
  }

  @Post('zones')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @HttpCode(HttpStatus.CREATED)
  async createDeliveryZone(@Body() dto: CreateDeliveryZoneDto) {
    return this.shippingService.createDeliveryZone(dto);
  }

  @Put('zones/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  async updateDeliveryZone(@Param('id') id: string, @Body() dto: UpdateDeliveryZoneDto) {
    return this.shippingService.updateDeliveryZone(id, dto);
  }

  @Patch(['zones/:id/status', 'zones/:id/toggle-status'])
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  async toggleDeliveryZoneStatus(@Param('id') id: string) {
    return this.shippingService.toggleDeliveryZoneStatus(id);
  }

  @Delete('zones/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  async deleteDeliveryZone(@Param('id') id: string, @CurrentUser() user?: any) {
    return this.shippingService.deleteDeliveryZone(id, user?.id || user?.username);
  }

  // Delivery Charges (FLAT, PER_KG, PER_ITEM)
  @Get(['charges', 'delivery-charges', 'rules'])
  async getDeliveryCharges() {
    return this.shippingService.getDeliveryCharges();
  }

  @Post(['charges', 'delivery-charges', 'rules'])
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @HttpCode(HttpStatus.CREATED)
  async createDeliveryCharge(@Body() dto: any) {
    return this.shippingService.createDeliveryCharge(dto);
  }

  @Put(['charges/:id', 'delivery-charges/:id', 'rules/:id'])
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  async updateDeliveryCharge(@Param('id') id: string, @Body() dto: any) {
    return this.shippingService.updateDeliveryCharge(id, dto);
  }

  @Delete(['charges/:id', 'delivery-charges/:id', 'rules/:id'])
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  async deleteDeliveryCharge(@Param('id') id: string, @CurrentUser() user?: any) {
    return this.shippingService.deleteDeliveryCharge(id, user?.id || user?.username);
  }

  // Couriers
  @Get(['couriers', 'couriers-admin'])
  async getCouriers() {
    return this.shippingService.getCouriers();
  }

  @Post(['couriers', 'couriers-admin'])
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @UseInterceptors(FileInterceptor('logo', { storage: uploadStorage }))
  @HttpCode(HttpStatus.CREATED)
  async createCourier(@UploadedFile() file: any, @Body() dto: any) {
    if (file) {
      dto.logo = `/uploads/${file.filename}`;
    }
    return this.shippingService.createCourier(dto);
  }

  @Put(['couriers/:id', 'couriers-admin/:id'])
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @UseInterceptors(FileInterceptor('logo', { storage: uploadStorage }))
  async updateCourier(@Param('id') id: string, @UploadedFile() file: any, @Body() dto: any) {
    if (file) {
      dto.logo = `/uploads/${file.filename}`;
    }
    return this.shippingService.updateCourier(id, dto);
  }

  @Delete(['couriers/:id', 'couriers-admin/:id'])
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  async deleteCourier(@Param('id') id: string, @CurrentUser() user?: any) {
    return this.shippingService.deleteCourier(id, user?.id || user?.username);
  }

  // Packaging Rules
  @Get('packaging')
  async getPackagingRules() {
    return this.shippingService.getPackagingRules();
  }

  @Post('packaging')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @HttpCode(HttpStatus.CREATED)
  async createPackagingRule(@Body() dto: CreatePackagingDto) {
    return this.shippingService.createPackagingRule(dto);
  }

  @Put('packaging/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  async updatePackagingRule(@Param('id') id: string, @Body() dto: UpdatePackagingDto) {
    return this.shippingService.updatePackagingRule(id, dto);
  }

  @Delete('packaging/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  async deletePackagingRule(@Param('id') id: string, @CurrentUser() user?: any) {
    return this.shippingService.deletePackagingRule(id, user?.id || user?.username);
  }
}

