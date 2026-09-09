import {
  Controller, Get, Post, Put, Patch, Delete, Param, Body, UseGuards, HttpCode, HttpStatus
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AddressesService } from './addresses.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Addresses')
@ApiBearerAuth('JWT-auth')
@Controller('addresses')
@UseGuards(JwtAuthGuard)
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Get()
  async getAddresses(@CurrentUser() user: any) {
    return this.addressesService.getAddresses(user.id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createAddress(@CurrentUser() user: any, @Body() dto: CreateAddressDto) {
    return this.addressesService.createAddress(user.id, dto);
  }

  @Put(':id')
  async updateAddress(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateAddressDto) {
    return this.addressesService.updateAddress(user.id, id, dto);
  }

  @Delete(':id')
  async deleteAddress(@CurrentUser() user: any, @Param('id') id: string) {
    return this.addressesService.deleteAddress(user.id, id);
  }

  @Patch(':id/default')
  async setDefaultAddress(@CurrentUser() user: any, @Param('id') id: string) {
    return this.addressesService.setDefaultAddress(user.id, id);
  }
}
