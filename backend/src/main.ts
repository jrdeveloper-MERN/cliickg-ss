import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as express from 'express';
import { join } from 'path';
import { existsSync } from 'fs';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ValidationPipe } from './common/pipes/validation.pipe';
import { validateProductionEnvironment } from './config/production-env.validation';

async function bootstrap() {
  validateProductionEnvironment();
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, { rawBody: true });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port', 5001);

  // Serve uploaded images statically
  const localUploads = join(process.cwd(), 'uploads');
  const rootUploads = join(process.cwd(), '../uploads');
  const legacyUploads = join(process.cwd(), '../backend/uploads');

  app.use('/uploads', express.static(localUploads));
  if (existsSync(rootUploads)) {
    app.use('/uploads', express.static(rootUploads));
  }
  if (existsSync(legacyUploads)) {
    app.use('/uploads', express.static(legacyUploads));
  }

  // Global Prefix for API compatibility (/api/health, /api/auth, etc.)
  app.setGlobalPrefix('api', { exclude: ['uploads/(.*)'] });

  // Global Exception Filter for legacy API response formatting { success, message, errors }
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global Validation Pipe with transformation and whitelisting
  app.useGlobalPipes(new ValidationPipe());

  // Configure CORS with ALLOWED_ORIGINS whitelist
  const allowedOriginsEnv = configService.get<string>('ALLOWED_ORIGINS') || process.env.ALLOWED_ORIGINS || '';
  const defaultDevOrigins = ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5001'];
  const allowedOrigins = allowedOriginsEnv
    ? allowedOriginsEnv.split(',').map((o) => o.trim()).filter(Boolean)
    : defaultDevOrigins;

  app.enableCors({
    origin: (requestOrigin, callback) => {
      if (!requestOrigin || allowedOrigins.includes(requestOrigin) || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        callback(new Error(`CORS origin '${requestOrigin}' not allowed by policy.`));
      }
    },
    credentials: true,
  });

  // Setup Swagger API Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('CLIICKG API')
    .setDescription('REST API Documentation for E-Commerce Backend Service')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT Token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  // Enable Graceful Shutdown Hooks
  app.enableShutdownHooks();

  await app.listen(port);
  logger.log(`NestJS Foundation Backend is running on: http://localhost:${port}/api`);
  logger.log(`Swagger API Documentation available at: http://localhost:${port}/api/docs`);
  logger.log(`Health check endpoint available at: http://localhost:${port}/api/health`);
}

bootstrap();
