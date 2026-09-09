import { Injectable, Logger, OnModuleInit, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SmsProvider, SmsDispatchOptions, SmsDispatchResult } from './sms-provider.interface';

@Injectable()
export class SmartPingSmsProvider implements SmsProvider, OnModuleInit {
  private readonly logger = new Logger(SmartPingSmsProvider.name);

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const mode = (
      process.env.SMS_GATEWAY_MODE ||
      process.env.SMARTPING_MODE ||
      this.configService.get<string>('sms.gatewayMode') ||
      this.configService.get<string>('SMARTPING_MODE') ||
      'MOCK'
    ).toUpperCase().trim();

    if (mode === 'PRODUCTION') {
      const apiUrl = this.configService.get<string>('sms.smartping.apiUrl') || this.configService.get<string>('SMARTPING_API_URL') || process.env.SMARTPING_API_URL;
      const username = this.configService.get<string>('sms.smartping.username') || this.configService.get<string>('SMARTPING_USERNAME') || process.env.SMARTPING_USERNAME;
      const password = this.configService.get<string>('sms.smartping.password') || this.configService.get<string>('SMARTPING_PASSWORD') || process.env.SMARTPING_PASSWORD;
      const senderId = this.configService.get<string>('sms.smartping.senderId') || this.configService.get<string>('SMARTPING_SENDER_ID') || process.env.SMARTPING_SENDER_ID;
      const dltId = this.configService.get<string>('sms.smartping.dltId') || this.configService.get<string>('SMARTPING_DLT_ID') || process.env.SMARTPING_DLT_ID;

      const missing: string[] = [];
      if (!apiUrl) missing.push('SMARTPING_API_URL');
      if (!username) missing.push('SMARTPING_USERNAME');
      if (!password) missing.push('SMARTPING_PASSWORD');
      if (!senderId) missing.push('SMARTPING_SENDER_ID');
      if (!dltId) missing.push('SMARTPING_DLT_ID');

      if (missing.length > 0) {
        this.logger.error(
          `[SmartPing Provider] STARTUP CONFIGURATION FAILURE: Production SMS mode active but required variables missing: ${missing.join(', ')}`,
        );
      } else {
        this.logger.log(`[SmartPing Provider] Production SMS Gateway configuration validated successfully.`);
      }
    } else {
      this.logger.log(`[SmartPing Provider] Operating in non-production gateway mode: ${mode}`);
    }
  }

  async sendOtp(options: SmsDispatchOptions): Promise<SmsDispatchResult> {
    const { fullPhoneNumber, otp } = options;

    const mode = (
      process.env.SMS_GATEWAY_MODE ||
      process.env.SMARTPING_MODE ||
      this.configService.get<string>('sms.gatewayMode') ||
      this.configService.get<string>('SMARTPING_MODE') ||
      'MOCK'
    ).toUpperCase().trim();

    // FAIL CLOSED: If mode is not explicitly MOCK, TEST, or PRODUCTION, abort immediately.
    if (!['MOCK', 'TEST', 'PRODUCTION'].includes(mode)) {
      this.logger.error(`[SmartPing Provider] FAIL CLOSED: Invalid or unconfigured SMS_GATEWAY_MODE '${mode}'. Must be MOCK, TEST, or PRODUCTION.`);
      throw new InternalServerErrorException({
        success: false,
        message: 'SMS Gateway mode configuration error. Contact administrator.',
        errors: ['SMARTPING_MODE_INVALID'],
      });
    }

    // 1. MOCK / TEST MODE
    if (mode === 'MOCK' || mode === 'TEST') {
      this.logger.log(`[SmartPing Provider] Operating in ${mode} mode. External SMS dispatch bypassed.`);
      return {
        success: true,
        provider: `smartping-${mode.toLowerCase()}`,
        message: `Mock OTP processed successfully in ${mode} mode.`,
      };
    }

    // 2. PRODUCTION MODE
    const apiUrl = this.configService.get<string>('sms.smartping.apiUrl') || this.configService.get<string>('SMARTPING_API_URL') || process.env.SMARTPING_API_URL;
    const username = this.configService.get<string>('sms.smartping.username') || this.configService.get<string>('SMARTPING_USERNAME') || process.env.SMARTPING_USERNAME;
    const password = this.configService.get<string>('sms.smartping.password') || this.configService.get<string>('SMARTPING_PASSWORD') || process.env.SMARTPING_PASSWORD;
    const senderId = this.configService.get<string>('sms.smartping.senderId') || this.configService.get<string>('SMARTPING_SENDER_ID') || process.env.SMARTPING_SENDER_ID;
    const dltId = this.configService.get<string>('sms.smartping.dltId') || this.configService.get<string>('SMARTPING_DLT_ID') || process.env.SMARTPING_DLT_ID;
    const template = this.configService.get<string>('sms.smartping.message') || this.configService.get<string>('SMARTPING_OTP_MESSAGE') || process.env.SMARTPING_OTP_MESSAGE;

    if (!username || !password || !senderId || !dltId) {
      this.logger.error(`[SmartPing Provider] FAIL CLOSED: Production mode active but required SmartPing credentials are missing in configuration.`);
      throw new InternalServerErrorException({
        success: false,
        message: 'SMS Gateway production credentials missing.',
        errors: ['SMARTPING_CREDENTIALS_MISSING'],
      });
    }

    const recipient = fullPhoneNumber.replace(/^\+91/, '').replace(/^\+/, '').trim();
    const messageText = (template || 'Your OTP is {otp}. Do not share it.').replace('{otp}', otp);
    const isUnicode = /[^\u0000-\u007F]/.test(messageText);

    this.logger.log(`[SmartPing Provider] Sending production SMS via SmartPing Gateway to recipient ending in ...${recipient.slice(-4)} (unicode: ${isUnicode})`);

    try {
      const params = new URLSearchParams({
        username,
        password,
        unicode: isUnicode ? 'true' : 'false',
        from: senderId,
        to: recipient,
        text: messageText,
        dltContentId: dltId,
      });

      const response = await fetch(`${apiUrl}?${params.toString()}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      const bodyText = await response.text();

      if (!response.ok) {
        // Secure error logging without exposing credentials or secrets
        this.logger.error(`[SmartPing Provider] Production SMS dispatch failed. Status: ${response.status}, Provider Response: ${bodyText.slice(0, 200)}`);
        throw new Error(`SmartPing HTTP Error ${response.status}`);
      }

      this.logger.log(`[SmartPing Provider] Production SMS successfully dispatched via SmartPing Gateway.`);
      return {
        success: true,
        provider: 'smartping',
        message: 'OTP dispatched successfully via SmartPing SMS Gateway.',
      };
    } catch (error: any) {
      this.logger.error(`[SmartPing Provider] Production SMS dispatch error: ${error?.message || 'Unknown Error'}`);
      throw new InternalServerErrorException({
        success: false,
        message: 'Failed to send SMS OTP via SmartPing. Please try again.',
        errors: ['SMARTPING_DISPATCH_FAILED'],
      });
    }
  }
}

