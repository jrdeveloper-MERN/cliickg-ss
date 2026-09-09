import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { PoliciesService } from './policies.service';
import { CreatePolicyDto } from './dto/create-policy.dto';
import { UpdatePolicyDto } from './dto/update-policy.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Policies')
@Controller()
export class PoliciesController {
  constructor(private readonly policiesService: PoliciesService) {}

  // ==================== PUBLIC ENDPOINTS ====================

  @Get('policies')
  @ApiOperation({ summary: 'Get list of all publicly published policies' })
  async getPublishedPolicies() {
    return this.policiesService.findAllPublished();
  }

  @Get('policies/:typeOrSlug')
  @ApiOperation({ summary: 'Get a single published policy by type or slug' })
  @ApiParam({ name: 'typeOrSlug', description: 'Policy type (e.g. DELIVERY) or slug (e.g. delivery-policy)' })
  async getPublishedPolicyBySlug(@Param('typeOrSlug') typeOrSlug: string) {
    return this.policiesService.findPublishedByTypeOrSlug(typeOrSlug);
  }

  // ==================== ADMIN ENDPOINTS ====================

  @Get('admin/policies')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Admin: Get all policies (published & drafts)' })
  async getAllPoliciesAdmin() {
    return this.policiesService.findAllAdmin();
  }

  @Get('admin/policies/:type')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Admin: Get policy by type for editing' })
  @ApiParam({ name: 'type', description: 'DELIVERY, PRIVACY, TERMS, or RETURN_REFUND' })
  async getPolicyAdminByType(@Param('type') type: string) {
    return this.policiesService.findByTypeAdmin(type);
  }

  @Put('admin/policies/:type')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin: Create or update policy by type (Upsert)' })
  @ApiParam({ name: 'type', description: 'DELIVERY, PRIVACY, TERMS, or RETURN_REFUND' })
  async upsertPolicyByType(
    @Param('type') type: string,
    @Body() dto: CreatePolicyDto,
  ) {
    return this.policiesService.upsertPolicy(type, dto);
  }

  @Post('admin/policies')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin: Create or update policy via POST' })
  async createPolicyAdmin(@Body() dto: CreatePolicyDto) {
    return this.policiesService.upsertPolicy(dto.type, dto);
  }

  @Patch('admin/policies/:type/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin: Toggle published/draft status of a policy' })
  @ApiParam({ name: 'type', description: 'DELIVERY, PRIVACY, TERMS, or RETURN_REFUND' })
  async togglePolicyStatus(@Param('type') type: string) {
    return this.policiesService.togglePublishStatus(type);
  }

  @Patch('admin/policies/:type')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin: Partially update policy' })
  async patchPolicyAdmin(
    @Param('type') type: string,
    @Body() dto: UpdatePolicyDto,
  ) {
    return this.policiesService.upsertPolicy(type, dto);
  }
}
