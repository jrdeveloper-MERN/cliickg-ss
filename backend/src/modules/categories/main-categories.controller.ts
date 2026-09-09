import {
  Controller, Get, Post, Put, Patch, Delete, Param, Body, Query,
  UseInterceptors, UploadedFile, UseGuards, HttpCode, HttpStatus
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { CategoriesService } from './categories.service';
import { CreateMainCategoryDto, UpdateMainCategoryDto } from './dto/create-main-category.dto';
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

@ApiTags('Main Categories')
@Controller('main-categories')
export class MainCategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all main top-level categories' })
  async getAll() {
    return this.categoriesService.getAllMainCategories();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get main category by ID' })
  @ApiParam({ name: 'id', type: String })
  async getById(@Param('id') id: string) {
    return this.categoriesService.getMainCategoryById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(FileInterceptor('image', { storage: uploadStorage }))
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new main category (Admin)' })
  async create(@UploadedFile() file: any, @Body() dto: CreateMainCategoryDto) {
    const imageUrl = file && file.filename ? `/uploads/${file.filename}` : undefined;
    return this.categoriesService.createMainCategory(dto, imageUrl);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(FileInterceptor('image', { storage: uploadStorage }))
  @ApiOperation({ summary: 'Update main category by ID (Admin)' })
  @ApiParam({ name: 'id', type: String })
  async update(@Param('id') id: string, @UploadedFile() file: any, @Body() dto: UpdateMainCategoryDto) {
    const imageUrl = file && file.filename ? `/uploads/${file.filename}` : undefined;
    return this.categoriesService.updateMainCategory(id, dto, imageUrl);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Toggle main category status (Admin)' })
  @ApiParam({ name: 'id', type: String })
  async toggleStatus(@Param('id') id: string) {
    return this.categoriesService.toggleMainCategoryStatus(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete main category by ID (Admin)' })
  @ApiParam({ name: 'id', type: String })
  async delete(@Param('id') id: string, @CurrentUser() user?: any) {
    return this.categoriesService.deleteMainCategory(id, user?.id || user?.username);
  }
}
