import {
  Controller, Get, Post, Put, Patch, Delete, Param, Body, Query,
  UseInterceptors, UploadedFile, UseGuards, HttpCode, HttpStatus
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { AttributesService } from './attributes.service';
import { CreateAttributeCaptionDto, AddCaptionValueDto } from './dto/create-attribute-caption.dto';
import { CreateAttributeMappingDto } from './dto/create-attribute-mapping.dto';
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

@ApiTags('Attributes')
@Controller('attribute')
export class AttributesController {
  constructor(private readonly attributesService: AttributesService) {}

  // ================= CAPTIONS =================
  @Get('captions')
  async getCaptions() {
    return this.attributesService.getCaptions();
  }

  @Post('captions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @UseInterceptors(FileInterceptor('image', { storage: uploadStorage }))
  @HttpCode(HttpStatus.CREATED)
  async createCaption(@UploadedFile() file: any, @Body() dto: CreateAttributeCaptionDto) {
    const imageUrl = file && file.filename ? `/uploads/${file.filename}` : undefined;
    return this.attributesService.createCaption(dto, imageUrl);
  }

  @Put('captions/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @UseInterceptors(FileInterceptor('image', { storage: uploadStorage }))
  async updateCaption(@Param('id') id: string, @UploadedFile() file: any, @Body() dto: CreateAttributeCaptionDto) {
    const imageUrl = file && file.filename ? `/uploads/${file.filename}` : undefined;
    return this.attributesService.updateCaption(id, dto, imageUrl);
  }

  @Patch('captions/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  async toggleCaptionStatus(@Param('id') id: string) {
    return this.attributesService.toggleCaptionStatus(id);
  }

  @Delete('captions/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  async deleteCaption(@Param('id') id: string, @CurrentUser() user?: any) {
    return this.attributesService.deleteCaption(id, user?.id || user?.username);
  }

  @Post('captions/:id/values')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @UseInterceptors(FileInterceptor('image', { storage: uploadStorage }))
  @HttpCode(HttpStatus.CREATED)
  async addCaptionValue(@Param('id') id: string, @UploadedFile() file: any, @Body() dto: AddCaptionValueDto) {
    const imageUrl = file && file.filename ? `/uploads/${file.filename}` : undefined;
    return this.attributesService.addCaptionValue(id, dto, imageUrl);
  }

  @Put('captions/:id/values/:valueId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @UseInterceptors(FileInterceptor('image', { storage: uploadStorage }))
  async updateCaptionValue(
    @Param('id') id: string,
    @Param('valueId') valueId: string,
    @UploadedFile() file: any,
    @Body() dto: AddCaptionValueDto,
  ) {
    const imageUrl = file && file.filename ? `/uploads/${file.filename}` : undefined;
    return this.attributesService.updateCaptionValue(id, valueId, dto, imageUrl);
  }

  @Patch('captions/:id/values/:valueId/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  async toggleCaptionValueStatus(@Param('id') id: string, @Param('valueId') valueId: string) {
    return this.attributesService.toggleCaptionValueStatus(id, valueId);
  }

  @Delete('captions/:id/values/:valueId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  async deleteCaptionValue(@Param('id') id: string, @Param('valueId') valueId: string) {
    return this.attributesService.deleteCaptionValue(id, valueId);
  }

  // ================= MAPPINGS =================
  @Get('mappings')
  async getMappings(
    @Query('mainCategoryId') mainCategoryId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('subCategoryId') subCategoryId?: string,
  ) {
    return this.attributesService.getMappings(mainCategoryId, categoryId, subCategoryId);
  }

  @Post('mappings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @HttpCode(HttpStatus.CREATED)
  async createMapping(@Body() dto: CreateAttributeMappingDto) {
    return this.attributesService.createMapping(dto);
  }

  @Put('mappings/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  async updateMapping(@Param('id') id: string, @Body() dto: CreateAttributeMappingDto) {
    return this.attributesService.updateMapping(id, dto);
  }

  @Delete('mappings/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  async deleteMapping(@Param('id') id: string, @CurrentUser() user?: any) {
    return this.attributesService.deleteMapping(id, user?.id || user?.username);
  }
}
