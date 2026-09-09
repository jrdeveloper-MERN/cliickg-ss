import { Controller, Get, Post, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from './database/prisma.service';
import { RedisService } from './redis/redis.service';

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

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  @Get(['', 'health'])
  @ApiOperation({ summary: 'Check API and service health status' })
  async getHealth() {
    const redisConnected = this.redisService.getIsConnected();

    return {
      status: 'OK',
      message: 'NestJS Backend Foundation Service is active',
      timestamp: new Date().toISOString(),
      services: {
        database: 'PostgreSQL Architecture Ready (Source of Truth)',
        redis: redisConnected ? 'Connected' : 'Offline / Fallback Mode Active',
      },
    };
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('image', { storage: uploadStorage }))
  async uploadFile(@UploadedFile() file: any) {
    if (!file) throw new BadRequestException('No file uploaded');
    const fileUrl = `/uploads/${file.filename}`;
    return {
      success: true,
      url: fileUrl,
      imageUrl: fileUrl,
      filePath: fileUrl,
      filename: file.filename,
    };
  }

  @Get(['order-flow', 'orders/order-flow'])
  getOrderFlow() {
    return {
      success: true,
      steps: [
        { key: 'Received', label: 'Received' },
        { key: 'Processing', label: 'Processing' },
        { key: 'Shipped', label: 'Shipped' },
        { key: 'Delivered', label: 'Delivered' },
        { key: 'Cancelled', label: 'Cancelled' },
        { key: 'Return Requested', label: 'Return Requested' },
        { key: 'Returned', label: 'Returned' },
        { key: 'Refund Initiated', label: 'Refund Initiated' },
        { key: 'Refunded', label: 'Refunded' },
      ],
    };
  }


}
