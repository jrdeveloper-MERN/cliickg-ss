import { Injectable, BadRequestException, UnauthorizedException, ForbiddenException, NotFoundException, InternalServerErrorException, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import * as bcrypt from 'bcryptjs';
import { randomUUID, randomInt } from 'crypto';

import { UsersService } from '../users/users.service';
import { RedisService, REDIS_KEYS, REDIS_TTLS } from '../../redis/redis.service';
import { SmartPingSmsProvider } from './providers/smartping-sms.provider';
import { PrismaService } from '../../database/prisma.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { AdminLoginDto } from './dto/admin-login.dto';

@Injectable()
export class AuthService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AuthService.name);
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly smsProvider: SmartPingSmsProvider,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) { }

  onModuleInit() {
    this.cleanupExpiredAdminSessions().catch((err) => {
      this.logger.error(`Error in initial admin session cleanup: ${err.message}`);
    });

    if (!this.cleanupInterval) {
      const INTERVAL_24_HOURS = 24 * 60 * 60 * 1000;
      this.cleanupInterval = setInterval(() => {
        this.cleanupExpiredAdminSessions().catch((err) => {
          this.logger.error(`Error in scheduled admin session cleanup interval: ${err.message}`);
        });
      }, INTERVAL_24_HOURS);
    }
  }

  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Automatic Cleanup: Deletes old revoked & expired admin sessions older than retention period
   */
  async cleanupExpiredAdminSessions(): Promise<number> {
    try {
      const retentionDays = Number(this.configService.get<string>('ADMIN_SESSION_RETENTION_DAYS', '30')) || 30;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const result = await this.prisma.adminSession.deleteMany({
        where: {
          OR: [
            {
              isRevoked: true,
              revokedAt: {
                lt: cutoffDate,
              },
            },
            {
              expiresAt: {
                lt: cutoffDate,
              },
            },
          ],
        },
      });

      this.logger.log(`Admin session cleanup completed. Deleted ${result.count} sessions older than ${retentionDays} days.`);
      return result.count;
    } catch (error: any) {
      this.logger.error(`Error during admin session cleanup: ${error?.message || error}`);
      return 0;
    }
  }

  /**
   * Helper: Parse & format phone number to E.164 using libphonenumber-js
   */
  private formatPhoneNumber(countryCode = '+91', mobileNumber: string) {
    let raw = String(mobileNumber || '').trim();
    let code = String(countryCode || '+91').trim();
    if (!code.startsWith('+')) code = '+' + code;

    if (raw.startsWith('+')) {
      const parsed = parsePhoneNumberFromString(raw);
      if (parsed && parsed.isValid()) {
        return {
          countryCode: '+' + parsed.countryCallingCode,
          mobileNumber: parsed.nationalNumber,
          fullPhoneNumber: parsed.format('E.164'),
        };
      }
    }

    const full = `${code}${raw}`;
    const parsed = parsePhoneNumberFromString(full);
    if (!parsed || !parsed.isValid()) {
      return null;
    }

    return {
      countryCode: '+' + parsed.countryCallingCode,
      mobileNumber: parsed.nationalNumber,
      fullPhoneNumber: parsed.format('E.164'),
    };
  }

  private maskMobile(fullPhone: string): string {
    if (!fullPhone || fullPhone.length < 6) return fullPhone;
    const visibleLast = fullPhone.slice(-4);
    const prefix = fullPhone.slice(0, 3);
    return `${prefix} ******${visibleLast}`;
  }

  private async createSessionAndGenerateToken(user: { id: string; username: string; role: string }): Promise<string> {
    const jti = randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.adminSession.create({
      data: {
        userId: user.id,
        jti,
        expiresAt,
      },
    });

    return this.jwtService.sign({
      id: user.id,
      username: user.username,
      role: user.role,
      jti,
    });
  }

  // =========================================
  // ADMIN LOGIN
  // =========================================
  async login(dto: AdminLoginDto) {
    const { username, password } = dto;

    const user = await this.usersService.findByUsername(username);
    if (!user) {
      throw new UnauthorizedException({
        success: false,
        message: 'Invalid username or password',
        errors: ['INVALID_CREDENTIALS'],
      });
    }

    if (user.accountStatus === 'DISABLED') {
      throw new ForbiddenException({
        success: false,
        message: 'Your account has been disabled. Contact support.',
        errors: ['ACCOUNT_DISABLED'],
      });
    }

    if (user.isDeleted) {
      throw new ForbiddenException({
        success: false,
        message: 'Account has been deleted.',
        errors: ['ACCOUNT_DELETED'],
      });
    }

    const isMatch = await bcrypt.compare(password, user.password || '');
    if (!isMatch) {
      throw new UnauthorizedException({
        success: false,
        message: 'Invalid username or password',
        errors: ['INVALID_CREDENTIALS'],
      });
    }

    const token = await this.createSessionAndGenerateToken(user);

    return {
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
        },
      },
      errors: null,
    };
  }

  // =========================================
  // ADMIN LOGOUT
  // =========================================
  async logout(jti: string) {
    if (!jti) {
      throw new UnauthorizedException({
        success: false,
        message: 'Unauthorized access. Session token required.',
        errors: ['UNAUTHORIZED'],
      });
    }

    await this.prisma.adminSession.updateMany({
      where: {
        jti,
        isRevoked: false,
      },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
      },
    });

    return {
      success: true,
      message: 'Logout successful',
      data: null,
      errors: null,
    };
  }


  // =========================================
  // POST /api/auth/send-otp
  // =========================================
  async sendOtp(dto: SendOtpDto) {
    const { countryCode = '+91', mobileNumber, isRegistration = false, email = '' } = dto;

    const phoneData = this.formatPhoneNumber(countryCode, mobileNumber);
    if (!phoneData) {
      throw new BadRequestException({
        success: false,
        message: 'Invalid mobile number or country code format',
        data: null,
        errors: ['INVALID_PHONE'],
      });
    }

    const { fullPhoneNumber } = phoneData;

    // User existence validation
    const existingUser = await this.usersService.findByFullPhoneNumber(fullPhoneNumber);

    if (isRegistration) {
      if (existingUser) {
        if (existingUser.isDeleted) {
          throw new ForbiddenException({
            success: false,
            message: 'Account has been deleted.',
            data: null,
            errors: ['ACCOUNT_DELETED'],
          });
        }
        if (existingUser.accountStatus === 'DISABLED') {
          throw new ForbiddenException({
            success: false,
            message: 'Your account has been disabled. Contact support.',
            data: null,
            errors: ['ACCOUNT_DISABLED'],
          });
        }
        throw new BadRequestException({
          success: false,
          message: 'An account with this mobile number already exists. Please log in instead.',
          data: { exists: true },
          errors: ['MOBILE_EXISTS'],
        });
      }
    } else {
      if (!existingUser) {
        throw new NotFoundException({
          success: false,
          message: 'Account not found for this mobile number. Please create a new account.',
          data: { exists: false },
          errors: ['USER_NOT_FOUND'],
        });
      }
      if (existingUser.isDeleted) {
        throw new ForbiddenException({
          success: false,
          message: 'Account has been deleted.',
          data: null,
          errors: ['ACCOUNT_DELETED'],
        });
      }
      if (existingUser.accountStatus === 'DISABLED') {
        throw new ForbiddenException({
          success: false,
          message: 'Your account has been disabled. Contact support.',
          data: null,
          errors: ['ACCOUNT_DISABLED'],
        });
      }
    }

    // Redis Rate Limiting (otp:ratelimit:<phone> -> Max 3 per 15 min / 900s)
    const rateLimitKey = REDIS_KEYS.OTP_RATELIMIT(fullPhoneNumber);
    const currentRequests = await this.redisService.increment(rateLimitKey, REDIS_TTLS.OTP_RATELIMIT);

    if (currentRequests && currentRequests > 3) {
      throw new BadRequestException({
        success: false,
        message: 'Maximum 3 OTP requests allowed per 15 minutes. Please wait before trying again.',
        data: null,
        errors: ['RATE_LIMIT_EXCEEDED'],
      });
    }

    // Centralized SMS Gateway Config Inspection
    const mode = (
      process.env.SMS_GATEWAY_MODE ||
      process.env.SMARTPING_MODE ||
      this.configService.get<string>('sms.gatewayMode') ||
      this.configService.get<string>('SMARTPING_MODE') ||
      'MOCK'
    ).toUpperCase().trim();

    if (!['MOCK', 'TEST', 'PRODUCTION'].includes(mode)) {
      throw new InternalServerErrorException({
        success: false,
        message: 'SMS Gateway mode configuration error. Contact administrator.',
        errors: ['SMARTPING_MODE_INVALID'],
      });
    }

    const nodeEnv = (this.configService.get<string>('nodeEnv') || process.env.NODE_ENV || 'development').toLowerCase();
    const envFakeOtp = process.env.DEV_FAKE_OTP_ENABLED !== undefined 
      ? ['true', '1', 'yes', 't'].includes(String(process.env.DEV_FAKE_OTP_ENABLED).toLowerCase().trim())
      : mode !== 'PRODUCTION';
    const fakeOtpEnabled = this.configService.get<boolean>('sms.fakeOtpEnabled') ?? envFakeOtp;
    const fakeOtpCode = this.configService.get<string>('sms.fakeOtpCode') || process.env.DEV_FAKE_OTP_CODE || '12345';

    // Generate strict 5-digit OTP code & bcrypt hash
    const isDevMock = mode === 'MOCK' || mode === 'TEST' || fakeOtpEnabled || String(process.env.SMS_GATEWAY_MODE).toUpperCase().trim() === 'MOCK';
    const rawOtp = isDevMock ? fakeOtpCode : randomInt(10000, 100000).toString();
    const hashedOtp = await bcrypt.hash(rawOtp, 10);

    // Store OTP in Redis temporary state (15 min TTL)
    const codeKey = REDIS_KEYS.OTP_CODE(fullPhoneNumber);
    const attemptsKey = REDIS_KEYS.OTP_ATTEMPTS(fullPhoneNumber);

    await this.redisService.set(codeKey, hashedOtp, REDIS_TTLS.OTP_CODE);
    await this.redisService.set(attemptsKey, '0', REDIS_TTLS.OTP_ATTEMPTS);

    // Dispatch via SmartPing Provider Abstraction
    await this.smsProvider.sendOtp({ fullPhoneNumber, otp: rawOtp });

    const masked = this.maskMobile(fullPhoneNumber);

    return {
      success: true,
      message: '5-digit OTP sent successfully',
      data: {
        exists: !!existingUser,
        maskedMobile: masked,
        ...(isDevMock && { mock: true, mockOtp: fakeOtpCode }),
      },
      errors: null,
    };
  }

  // =========================================
  // POST /api/auth/verify-otp
  // =========================================
  async verifyOtp(dto: VerifyOtpDto) {
    const { countryCode = '+91', mobileNumber, otp, isRegistration = false, fullName, email } = dto;

    const phoneData = this.formatPhoneNumber(countryCode, mobileNumber);
    if (!phoneData) {
      throw new BadRequestException({
        success: false,
        message: 'Invalid mobile number format',
        data: null,
        errors: ['INVALID_PHONE'],
      });
    }

    const { fullPhoneNumber } = phoneData;
    const codeKey = REDIS_KEYS.OTP_CODE(fullPhoneNumber);
    const attemptsKey = REDIS_KEYS.OTP_ATTEMPTS(fullPhoneNumber);

    // Check attempts limit (Max 5)
    const attemptsStr = await this.redisService.get(attemptsKey);
    const currentAttempts = attemptsStr ? parseInt(attemptsStr, 10) : 0;

    if (currentAttempts >= 5) {
      throw new BadRequestException({
        success: false,
        message: 'Maximum verification attempts exceeded. Please request a new OTP.',
        data: null,
        errors: ['MAX_ATTEMPTS_EXCEEDED'],
      });
    }

    // Retrieve hashed OTP from Redis
    const storedHashedOtp = await this.redisService.get(codeKey);
    if (!storedHashedOtp) {
      throw new BadRequestException({
        success: false,
        message: 'OTP has expired or no OTP requested. Please request a new OTP.',
        data: null,
        errors: ['OTP_EXPIRED'],
      });
    }

    // Safe comparison using bcrypt
    const mode = (
      process.env.SMS_GATEWAY_MODE ||
      process.env.SMARTPING_MODE ||
      this.configService.get<string>('sms.gatewayMode') ||
      this.configService.get<string>('SMARTPING_MODE') ||
      'MOCK'
    ).toUpperCase().trim();

    const nodeEnv = (this.configService.get<string>('nodeEnv') || process.env.NODE_ENV || 'development').toLowerCase();
    const envFakeOtp = process.env.DEV_FAKE_OTP_ENABLED !== undefined 
      ? ['true', '1', 'yes', 't'].includes(String(process.env.DEV_FAKE_OTP_ENABLED).toLowerCase().trim())
      : mode !== 'PRODUCTION';
    const fakeOtpEnabled = this.configService.get<boolean>('sms.fakeOtpEnabled') ?? envFakeOtp;
    const fakeOtpCode = this.configService.get<string>('sms.fakeOtpCode') || process.env.DEV_FAKE_OTP_CODE || '12345';

    let isMatch = await bcrypt.compare(String(otp).trim(), storedHashedOtp);
    if (!isMatch && (mode === 'MOCK' || mode === 'TEST' || fakeOtpEnabled || String(process.env.SMS_GATEWAY_MODE).toUpperCase().trim() === 'MOCK') && String(otp).trim() === fakeOtpCode) {
      isMatch = true;
    }

    if (!isMatch) {
      const newAttempts = await this.redisService.increment(attemptsKey, REDIS_TTLS.OTP_ATTEMPTS);
      const remaining = Math.max(0, 5 - (newAttempts || currentAttempts + 1));
      throw new BadRequestException({
        success: false,
        message: `Invalid 5-digit OTP code. ${remaining} attempt(s) remaining.`,
        data: { remainingAttempts: remaining },
        errors: ['INVALID_OTP'],
      });
    }

    // Check user in database
    let user = await this.usersService.findByFullPhoneNumber(fullPhoneNumber);

    if (user) {
      // Single-use OTP invalidation: Remove OTP state from Redis on successful verification
      await this.redisService.delete(codeKey);
      await this.redisService.delete(attemptsKey);

      if (user.isDeleted) {
        throw new ForbiddenException({
          success: false,
          message: 'Account has been deleted.',
          data: null,
          errors: ['ACCOUNT_DELETED'],
        });
      }
      if (user.accountStatus === 'DISABLED') {
        throw new ForbiddenException({
          success: false,
          message: 'Your account has been disabled. Contact support.',
          data: null,
          errors: ['ACCOUNT_DISABLED'],
        });
      }

      const customer = await this.usersService.findCustomerByUserId(user.id);
      const token = await this.createSessionAndGenerateToken(user);

      return {
        success: true,
        message: 'Login successful',
        data: {
          token,
          user: {
            id: user.id,
            username: user.username,
            name: user.name,
            email: user.email,
            mobileNumber: user.mobileNumber,
            countryCode: user.countryCode,
            fullPhoneNumber: user.fullPhoneNumber,
            role: user.role,
          },
          customer: customer || null,
        },
        errors: null,
      };
    } else if (isRegistration && fullName) {
      // Remove OTP state from Redis on successful registration completion
      await this.redisService.delete(codeKey);
      await this.redisService.delete(attemptsKey);

      const cleanName = String(fullName).trim();
      const cleanEmail = (email && String(email).trim())
        ? String(email).trim().toLowerCase()
        : '';

      const { user: newUser, customer: newCustomer } = await this.usersService.createCustomerUser({
        name: cleanName,
        email: cleanEmail,
        mobileNumber: phoneData.mobileNumber,
        countryCode: phoneData.countryCode,
        fullPhoneNumber,
      });

      const token = await this.createSessionAndGenerateToken(newUser);

      return {
        success: true,
        message: 'Registration completed successfully',
        data: {
          token,
          user: {
            id: newUser.id,
            username: newUser.username,
            name: newUser.name,
            email: newUser.email,
            mobileNumber: newUser.mobileNumber,
            countryCode: newUser.countryCode,
            fullPhoneNumber: newUser.fullPhoneNumber,
            role: newUser.role,
          },
          customer: newCustomer,
        },
        errors: null,
      };
    } else if (isRegistration && !fullName) {
      // Intermediate Step 1 verification for Registration (do not delete codeKey yet)
      return {
        success: true,
        message: 'OTP verified successfully. Please enter your name to complete registration.',
        data: { verified: true, needName: true },
        errors: null,
      };
    } else {
      throw new BadRequestException({
        success: false,
        message: 'Account not found. Please complete registration details.',
        data: { needRegistration: true },
        errors: ['NEED_REGISTRATION'],
      });
    }
  }

  async resendOtp(dto: SendOtpDto) {
    return this.sendOtp(dto);
  }

  // =========================================
  // GET /api/auth/me
  // =========================================
  async getMe(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException({
        success: false,
        message: 'User profile not found',
        data: null,
        errors: ['USER_NOT_FOUND'],
      });
    }

    const customer = await this.usersService.findCustomerByUserId(user.id);

    return {
      success: true,
      message: 'Profile details fetched successfully',
      data: {
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          email: user.email,
          mobileNumber: user.mobileNumber,
          countryCode: user.countryCode,
          fullPhoneNumber: user.fullPhoneNumber,
          role: user.role,
        },
        customer: customer || null,
        cartSummary: {
          itemCount: 0,
          totalAmount: 0,
        },
        wishlistCount: 0,
        addressCount: 0,
        recentOrdersCount: 0,
      },
      errors: null,
    };
  }
}
