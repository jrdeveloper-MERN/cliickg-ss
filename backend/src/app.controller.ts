import { Controller, Get, Post, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync, promises as fsPromises } from 'fs';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from './database/prisma.service';
import { RedisService } from './redis/redis.service';

const MAX_POD_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

let fileTypeFromBufferFn: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ft = require('file-type');
  fileTypeFromBufferFn = ft.fileTypeFromBuffer;
} catch {
  // Fallback to strict magic-byte signature check
}

function detectImageMagicBytes(buffer: Buffer): { ext: string; mime: string } | null {
  if (!buffer || buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { ext: '.jpg', mime: 'image/jpeg' };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { ext: '.png', mime: 'image/png' };
  }

  // WebP: RIFF .... WEBP
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { ext: '.webp', mime: 'image/webp' };
  }

  return null;
}

async function validateImageBuffer(buffer: Buffer): Promise<{ ext: string; mime: string }> {
  if (!buffer || buffer.length === 0) {
    throw new BadRequestException('Empty file payload.');
  }

  const magic = detectImageMagicBytes(buffer);
  if (!magic) {
    throw new BadRequestException(
      'Invalid file content: signature does not match a valid image. Only genuine JPEG, PNG, and WebP images are allowed.',
    );
  }

  if (fileTypeFromBufferFn) {
    try {
      const detected = await fileTypeFromBufferFn(buffer);
      if (detected) {
        const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowedMimes.includes(detected.mime)) {
          throw new BadRequestException(
            `Unsupported file content detected (${detected.mime}). Only JPEG, PNG, and WebP images are allowed.`,
          );
        }
      }
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException('Unreadable or corrupt image file content.');
    }
  }

  return magic;
}

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
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: {
        fileSize: MAX_POD_FILE_SIZE,
      },
      fileFilter: (req: any, file: any, cb: any) => {
        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
        const ext = extname(file.originalname || '').toLowerCase();
        if (file.originalname && !allowedExtensions.includes(ext)) {
          return cb(
            new BadRequestException(
              `Unsupported file extension: ${ext || 'none'}. Only JPEG, PNG, and WebP images are allowed.`,
            ),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async uploadFile(@UploadedFile() file: any) {
    if (!file || !file.buffer) {
      throw new BadRequestException('No file uploaded or file payload is empty.');
    }

    if (file.size > MAX_POD_FILE_SIZE || file.buffer.length > MAX_POD_FILE_SIZE) {
      throw new BadRequestException('File size exceeds maximum allowed limit of 5MB.');
    }

    // Verify magic bytes & file signature
    const validMeta = await validateImageBuffer(file.buffer);

    const uploadDir = join(process.cwd(), 'uploads');
    if (!existsSync(uploadDir)) {
      mkdirSync(uploadDir, { recursive: true });
    }

    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const finalFilename = `${uniqueSuffix}${validMeta.ext}`;
    const targetPath = join(uploadDir, finalFilename);

    await fsPromises.writeFile(targetPath, file.buffer);

    const fileUrl = `/uploads/${finalFilename}`;
    return {
      success: true,
      url: fileUrl,
      imageUrl: fileUrl,
      filePath: fileUrl,
      filename: finalFilename,
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
