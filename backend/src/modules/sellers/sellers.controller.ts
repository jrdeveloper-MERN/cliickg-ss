import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { SellersService } from './sellers.service';
import { CreateSellerDto } from './dto/create-seller.dto';
import { UpdateSellerDto } from './dto/update-seller.dto';
import { RejectSellerDto } from './dto/reject-seller.dto';
import { UpdateSellerStatusDto } from './dto/update-seller-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Sellers')
@Controller('sellers')
export class SellersController {
  constructor(private readonly sellersService: SellersService) {}

  /**
   * PUBLIC ENDPOINT: Submit new Seller application
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit a new seller registration application (Public)' })
  async register(@Body() dto: CreateSellerDto) {
    return this.sellersService.register(dto);
  }

  /**
   * ADMIN ENDPOINT: Get paginated list of seller applications
   */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get paginated list of sellers with search & filters (Admin)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'sellerType', required: false, type: String })
  async getAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('sellerType') sellerType?: string,
  ) {
    return this.sellersService.getAll({ page, limit, search, status, sellerType });
  }

  /**
   * ADMIN ENDPOINT: Get seller application details by ID
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get seller application details by ID (Admin)' })
  @ApiParam({ name: 'id', type: String })
  async getById(@Param('id') id: string) {
    return this.sellersService.getById(id);
  }

  /**
   * ADMIN ENDPOINT: Approve seller application
   */
  @Patch(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Approve a seller application (Admin)' })
  @ApiParam({ name: 'id', type: String })
  async approve(@Param('id') id: string, @CurrentUser() user: any) {
    return this.sellersService.approve(id, user);
  }

  /**
   * ADMIN ENDPOINT: Reject seller application with reason
   */
  @Patch(':id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Reject a seller application with reason (Admin)' })
  @ApiParam({ name: 'id', type: String })
  async reject(
    @Param('id') id: string,
    @Body() dto: RejectSellerDto,
    @CurrentUser() user: any,
  ) {
    return this.sellersService.reject(id, dto, user);
  }

  /**
   * ADMIN ENDPOINT: Update seller status (PENDING, APPROVED, REJECTED, SUSPENDED)
   */
  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update seller application status (Admin)' })
  @ApiParam({ name: 'id', type: String })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateSellerStatusDto,
    @CurrentUser() user: any,
  ) {
    return this.sellersService.updateStatus(id, dto, user);
  }

  /**
   * ADMIN ENDPOINT: Update editable seller business details
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update seller business details (Admin)' })
  @ApiParam({ name: 'id', type: String })
  async update(@Param('id') id: string, @Body() dto: UpdateSellerDto) {
    return this.sellersService.update(id, dto);
  }
}
