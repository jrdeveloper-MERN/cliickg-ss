import {
  Controller, Get, Post, Put, Patch, Delete, Param, Body, Query,
  UseInterceptors, UploadedFiles, UseGuards, HttpCode, HttpStatus, BadRequestException
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto } from './dto/create-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
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

const uploadOptions = {
  storage: uploadStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB Max File Size per file
  },
  fileFilter: (req: any, file: any, cb: any) => {
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/avif',
      'image/svg+xml',
      'video/mp4',
    ];
    if (file && file.mimetype && allowedMimeTypes.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(
        new BadRequestException({
          success: false,
          message: `Unsupported file upload MIME type '${file?.mimetype}'. Only images (JPEG, PNG, WebP, AVIF, SVG) and MP4 videos are allowed.`,
          errors: ['UNSUPPORTED_FILE_TYPE'],
        }),
        false,
      );
    }
  },
};

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  async getAll(@Query() query: ProductQueryDto) {
    return this.productsService.getAll(query);
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.productsService.getById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @UseInterceptors(AnyFilesInterceptor(uploadOptions))
  @HttpCode(HttpStatus.CREATED)
  async create(@UploadedFiles() files: any[], @Body() dto: CreateProductDto) {
    const filesMap: Record<string, string> = {};
    const extraImages: string[] = [];

    if (Array.isArray(files)) {
      files.forEach((file) => {
        if (file && file.filename) {
          const fileUrl = `/uploads/${file.filename}`;
          filesMap[file.fieldname] = fileUrl;
          if (file.fieldname === 'images') {
            extraImages.push(fileUrl);
          }
        }
      });
    }

    return this.productsService.create(dto, filesMap, extraImages);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @UseInterceptors(AnyFilesInterceptor({ storage: uploadStorage }))
  async update(@Param('id') id: string, @UploadedFiles() files: any[], @Body() dto: UpdateProductDto) {
    const filesMap: Record<string, string> = {};

    if (Array.isArray(files)) {
      files.forEach((file) => {
        if (file && file.filename) {
          const fileUrl = `/uploads/${file.filename}`;
          filesMap[file.fieldname] = fileUrl;
        }
      });
    }

    return this.productsService.update(id, dto, filesMap);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  async toggleStatus(@Param('id') id: string) {
    return this.productsService.toggleStatus(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  async delete(@Param('id') id: string, @CurrentUser() user?: any) {
    return this.productsService.delete(id, user?.id || user?.username);
  }
}

