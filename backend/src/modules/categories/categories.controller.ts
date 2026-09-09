import {
  Controller, Get, Post, Put, Patch, Delete, Param, Body, Query,
  UseInterceptors, UploadedFile, UseGuards, HttpCode, HttpStatus
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/create-category.dto';
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

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) { }

  @Get()
  @ApiOperation({ summary: 'Get all categories (optionally filter by main category ID)' })
  @ApiQuery({ name: 'mainCategoryId', required: false, type: String })
  async getAll(@Query('mainCategoryId') mainCategoryId?: string) {
    return this.categoriesService.getAllCategories(mainCategoryId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get category details by ID' })
  @ApiParam({ name: 'id', type: String })
  async getById(@Param('id') id: string) {
    return this.categoriesService.getCategoryById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(FileInterceptor('image', { storage: uploadStorage }))
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new category (Admin)' })
  async create(@UploadedFile() file: any, @Body() dto: CreateCategoryDto) {
    const imageUrl = file && file.filename ? `/uploads/${file.filename}` : undefined;
    return this.categoriesService.createCategory(dto, imageUrl);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(FileInterceptor('image', { storage: uploadStorage }))
  @ApiOperation({ summary: 'Update category by ID (Admin)' })
  @ApiParam({ name: 'id', type: String })
  async update(@Param('id') id: string, @UploadedFile() file: any, @Body() dto: UpdateCategoryDto) {
    const imageUrl = file && file.filename ? `/uploads/${file.filename}` : undefined;
    return this.categoriesService.updateCategory(id, dto, imageUrl);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Toggle category status (Admin)' })
  @ApiParam({ name: 'id', type: String })
  async toggleStatus(@Param('id') id: string) {
    return this.categoriesService.toggleCategoryStatus(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete category by ID (Admin)' })
  @ApiParam({ name: 'id', type: String })
  async delete(@Param('id') id: string, @CurrentUser() user?: any) {
    return this.categoriesService.deleteCategory(id, user?.id || user?.username);
  }
}
