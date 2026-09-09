import { Injectable, Logger, OnModuleInit, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { generateObjectId } from '../../common/utils/object-id.util';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService implements OnModuleInit {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) { }

  async onModuleInit() {
    const adminUsername = process.env.ADMIN_USERNAME;
    const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD;

    // Only create initial admin if no admin user exists in database
    const existingAdmin = await this.prisma.user.findFirst({
      where: {
        OR: [
          { username: adminUsername },
          { role: { in: ['Admin', 'admin', 'SUPERADMIN'] } },
        ],
      },
    });

    if (!existingAdmin && adminUsername && defaultPassword) {
      await this.createDefaultAdminIfNotExist(adminUsername, defaultPassword);
    }
  }

  async findByUsername(username: string) {
    return this.prisma.user.findUnique({
      where: { username },
    });
  }

  async findByFullPhoneNumber(fullPhoneNumber: string) {
    return this.prisma.user.findFirst({
      where: {
        OR: [
          { fullPhoneNumber },
          { username: fullPhoneNumber },
        ],
      },
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async findCustomerByUserId(userId: string) {
    return this.prisma.customer.findFirst({
      where: {
        OR: [
          { userId },
          { id: userId },
        ],
      },
    });
  }

  async createDefaultAdminIfNotExist(username: string, passwordRaw: string) {
    const existing = await this.prisma.user.findUnique({ where: { username } });
    if (existing) return existing;

    const hashedPassword = await bcrypt.hash(passwordRaw, 10);
    const userId = generateObjectId();

    this.logger.log(`Creating default admin account [${username}] with 24-char hex ID [${userId}]`);
    return this.prisma.user.create({
      data: {
        id: userId,
        username,
        password: hashedPassword,
        name: 'Super Admin',
        role: 'admin',
        accountStatus: 'ACTIVE',
      },
    });
  }

  async createCustomerUser(data: {
    name: string;
    email: string;
    mobileNumber: string;
    countryCode: string;
    fullPhoneNumber: string;
  }) {
    const userId = generateObjectId();
    const seq = await this.prisma.getNextSequence('customer', 1);
    const customerId = `CLIICKG-C-${String(seq).padStart(6, '0')}`;
    const custEntityId = generateObjectId();
    const cartEntityId = generateObjectId();

    try {
      const user = await this.prisma.user.create({
        data: {
          id: userId,
          username: data.fullPhoneNumber,
          name: data.name,
          email: (data.email && data.email.trim()) ? data.email.trim().toLowerCase() : null,
          countryCode: data.countryCode,
          mobileNumber: data.mobileNumber,
          fullPhoneNumber: data.fullPhoneNumber,
          role: 'customer',
          accountStatus: 'ACTIVE',
        },
      });

      const customer = await this.prisma.customer.create({
        data: {
          id: custEntityId,
          customerId,
          userId: user.id,
          name: data.name,
          email: data.email || '',
          phone: data.mobileNumber,
          countryCode: data.countryCode,
          mobileNumber: data.mobileNumber,
          fullPhoneNumber: data.fullPhoneNumber,
          type: 'Customer',
          status: 'Active',
        },
      });

      await this.prisma.cart.create({
        data: {
          id: cartEntityId,
          userId: user.id,
        },
      });

      return { user, customer };
    } catch (error: any) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const target = Array.isArray(error.meta?.target) ? (error.meta?.target as string[]) : [];
        if (target.includes('email')) {
          throw new BadRequestException({
            success: false,
            message: 'An account with this email address already exists. Please log in.',
            data: { exists: true },
            errors: ['EMAIL_EXISTS'],
          });
        }
        throw new BadRequestException({
          success: false,
          message: 'An account with this mobile number already exists. Please log in.',
          data: { exists: true },
          errors: ['MOBILE_EXISTS'],
        });
      }
      throw error;
    }
  }
}
