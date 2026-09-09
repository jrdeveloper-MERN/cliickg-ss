import { ValidationPipe as NestValidationPipe, ValidationPipeOptions } from '@nestjs/common';

export class ValidationPipe extends NestValidationPipe {
  constructor(options?: ValidationPipeOptions) {
    super({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: false,
      ...options,
    });
  }
}
