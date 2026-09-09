import { Logger } from '@nestjs/common';

export function validateProductionEnvironment(): void {
  const nodeEnv = (process.env.NODE_ENV || 'development').toLowerCase().trim();

  // Perform strict checks only when running in production
  if (nodeEnv !== 'production') {
    return;
  }

  const logger = new Logger('ProductionEnvValidation');
  const errors: string[] = [];

  // 1. Mandatory Environment Variables
  const requiredVars = [
    'PORT',
    'DATABASE_URL',
    'JWT_SECRET',
    'ALLOWED_ORIGINS',
    'REDIS_HOST',
    'REDIS_PORT',
    'SMS_GATEWAY_MODE',
    'SMS_GATEWAY_PROVIDER',
    'DEV_FAKE_OTP_ENABLED',
    'SMARTPING_API_URL',
    'SMARTPING_USERNAME',
    'SMARTPING_PASSWORD',
    'SMARTPING_SENDER_ID',
    'SMARTPING_DLT_ID',
    'RAZORPAY_KEY_ID',
    'RAZORPAY_KEY_SECRET',
    'RAZORPAY_WEBHOOK_SECRET',
  ];

  for (const v of requiredVars) {
    if (!process.env[v] || String(process.env[v]).trim() === '') {
      errors.push(`Missing required production environment variable '${v}'.`);
    }
  }

  // 2. Strict Production Guard Conditions
  if (process.env.DEV_FAKE_OTP_ENABLED === 'true') {
    errors.push('DEV_FAKE_OTP_ENABLED must be set to false in production environment.');
  }

  if ((process.env.SMS_GATEWAY_MODE || '').toUpperCase().trim() !== 'PRODUCTION') {
    errors.push('SMS_GATEWAY_MODE must be set to PRODUCTION in production environment.');
  }

  if ((process.env.SMS_GATEWAY_PROVIDER || '').toLowerCase().trim() !== 'smartping') {
    errors.push('SMS_GATEWAY_PROVIDER must be set to smartping in production environment.');
  }

  const allowedOrigins = process.env.ALLOWED_ORIGINS || '';
  if (allowedOrigins.includes('*')) {
    errors.push("ALLOWED_ORIGINS must not contain wildcard '*' in production environment when credentials are enabled.");
  }

  if (errors.length > 0) {
    logger.error('================================================================================');
    logger.error('FATAL: Production Environment Configuration Validation Failed!');
    for (const err of errors) {
      logger.error(` - ${err}`);
    }
    logger.error('================================================================================');
    throw new Error(`Production environment configuration error: ${errors.join(' | ')}`);
  }

  logger.log('Production environment configuration validated successfully.');
}
