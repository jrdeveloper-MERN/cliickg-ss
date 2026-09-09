import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { generateObjectId } from '../../common/utils/object-id.util';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async getMeCustomer(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException({ message: 'User not found' });

    let customer = await this.prisma.customer.findFirst({
      where: { userId: user.id },
    });

    if (!customer) {
      const cleanPhone = String(user.mobileNumber || user.username || '').replace(/\D/g, '').slice(-10);
      const cleanEmail = String(user.email || '').trim().toLowerCase();

      customer = await this.prisma.customer.findFirst({
        where: {
          OR: [
            { fullPhoneNumber: user.fullPhoneNumber },
            { phone: user.mobileNumber },
            ...(cleanPhone ? [{ phone: cleanPhone }, { mobileNumber: cleanPhone }] : []),
            ...(cleanEmail ? [{ email: cleanEmail }] : []),
          ],
        },
      });
    }

    if (!customer) {
      const cleanPhone = String(user.mobileNumber || user.username || '').replace(/\D/g, '').slice(-10);
      const newCustId = generateObjectId();
      const seq = await this.prisma.getNextSequence('customer', 1);
      const customerId = `CLIICKG-C-${String(seq).padStart(6, '0')}`;
      customer = await this.prisma.customer.create({
        data: {
          id: newCustId,
          customerId,
          userId: user.id,
          name: user.name || 'Customer',
          email: user.email || '',
          phone: cleanPhone || user.mobileNumber || '',
          countryCode: user.countryCode || '+91',
          mobileNumber: cleanPhone || user.mobileNumber || '',
          fullPhoneNumber: user.fullPhoneNumber || '',
          type: 'Customer',
          status: 'Active',
        },
      });
    } else if (!customer.userId) {
      customer = await this.prisma.customer.update({
        where: { id: customer.id },
        data: { userId: user.id },
      });
    }

    return customer;
  }

  async getAll(query: { status?: string; fromDate?: string; toDate?: string; search?: string; page?: number; limit?: number }) {
    const { status, fromDate, toDate, search, page = 1, limit = 10 } = query;
    const pageNum = parseInt(String(page), 10) || 1;
    const limitNum = parseInt(String(limit), 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (status === 'Deleted') {
      where.isDeleted = true;
    } else {
      where.isDeleted = false;
      if (status === 'Active') {
        where.status = 'Active';
      } else if (status === 'Disabled') {
        where.status = 'Disabled';
      }
    }

    if (search) {
      where.OR = [
        { customerId: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { mobileNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = new Date(fromDate);
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const [total, customers] = await Promise.all([
      this.prisma.customer.count({ where }),
      this.prisma.customer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
    ]);

    return {
      data: customers,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }

  async getById(id: string) {
    let customer = await this.prisma.customer.findUnique({ where: { id } });
    if (!customer) {
      customer = await this.prisma.customer.findFirst({
        where: { OR: [{ id }, { userId: id }, { customerId: id }] },
      });
    }
    if (!customer) throw new NotFoundException({ message: 'Customer record not found' });
    return customer;
  }

  async create(dto: CreateCustomerDto) {
    const cleanEmail = dto.email && String(dto.email).trim() ? String(dto.email).trim().toLowerCase() : '';
    const cleanPhone = String(dto.phone).replace(/\D/g, '');

    if (cleanEmail) {
      const existingEmail = await this.prisma.customer.findFirst({ where: { email: cleanEmail } });
      if (existingEmail) {
        throw new BadRequestException({ message: 'An account with this email address already exists.' });
      }
    }

    const existingPhone = await this.prisma.customer.findFirst({
      where: { OR: [{ phone: cleanPhone }, { mobileNumber: cleanPhone }] },
    });
    if (existingPhone) {
      throw new BadRequestException({ message: 'An account with this mobile number already exists.' });
    }

    // Enforce canonical customer type and reject unsupported types
    if (dto.type && dto.type !== 'Customer') {
      throw new BadRequestException({ message: 'Invalid customer type. Only Customer is allowed.' });
    }

    // Atomic server-generated canonical sequential Customer ID (cannot be overridden by client)
    const seq = await this.prisma.getNextSequence('customer', 1);
    const custId = `CLIICKG-C-${String(seq).padStart(6, '0')}`;
    const newId = generateObjectId();
    const customerType = 'Customer';

    const created = await this.prisma.customer.create({
      data: {
        id: newId,
        customerId: custId,
        type: customerType,
        name: dto.name,
        email: cleanEmail,
        phone: cleanPhone,
        mobileNumber: cleanPhone,
        countryCode: dto.countryCode || '+91',
        gender: dto.gender || 'Male',
        dob: dto.dob ? String(dto.dob) : '',
        address1: dto.address1 || '',
        address2: dto.address2 || '',
        area: dto.area || '',
        landmark: dto.landmark || '',
        city: dto.city || '',
        state: dto.state || 'TAMIL NADU',
        pincode: dto.pincode || '',
        status: dto.status || 'Active',
      },
    });

    try { await this.redisService.delete('dashboard:stats'); } catch {}
    return created;
  }

  async update(id: string, dto: UpdateCustomerDto) {
    const existing = await this.getById(id);

    const cleanEmail = dto.email !== undefined ? String(dto.email).trim().toLowerCase() : existing.email;
    const cleanPhone = dto.phone ? String(dto.phone).replace(/\D/g, '') : existing.phone;

    if (dto.email && cleanEmail && cleanEmail !== existing.email) {
      const dupEmail = await this.prisma.customer.findFirst({
        where: { id: { not: existing.id }, email: cleanEmail },
      });
      if (dupEmail) throw new BadRequestException({ message: 'Email address is already in use by another account.' });
    }

    if (dto.phone && cleanPhone !== existing.phone) {
      const dupPhone = await this.prisma.customer.findFirst({
        where: { id: { not: existing.id }, OR: [{ phone: cleanPhone }, { mobileNumber: cleanPhone }] },
      });
      if (dupPhone) throw new BadRequestException({ message: 'Mobile number is already in use by another account.' });
    }

    if (dto.dob) {
      const parsedDob = new Date(dto.dob);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (isNaN(parsedDob.getTime())) {
        throw new BadRequestException({ message: 'Invalid Date of Birth format.' });
      }
      if (parsedDob > today) {
        throw new BadRequestException({ message: 'Date of Birth cannot be in the future.' });
      }
    }

    const sanitizeText = (val?: string) => (val ? String(val).replace(/<[^>]*>?/gm, '').trim() : '');

    const updated = await this.prisma.customer.update({
      where: { id: existing.id },
      data: {
        ...(dto.name && { name: sanitizeText(dto.name) }),
        ...(dto.email !== undefined && { email: cleanEmail }),
        ...(dto.phone && { phone: cleanPhone, mobileNumber: cleanPhone }),
        ...(dto.gender && { gender: dto.gender }),
        ...(dto.dob !== undefined && { dob: dto.dob ? String(dto.dob).trim() : '' }),
        ...(dto.address1 !== undefined && { address1: sanitizeText(dto.address1) }),
        ...(dto.address2 !== undefined && { address2: sanitizeText(dto.address2) }),
        ...(dto.area !== undefined && { area: sanitizeText(dto.area) }),
        ...(dto.landmark !== undefined && { landmark: sanitizeText(dto.landmark) }),
        ...(dto.city !== undefined && { city: sanitizeText(dto.city) }),
        ...(dto.state !== undefined && { state: sanitizeText(dto.state) }),
        ...(dto.pincode !== undefined && { pincode: sanitizeText(dto.pincode) }),
        ...(dto.status && { status: dto.status }),
      },
    });

    // Synchronize linked User if present
    if (existing.userId) {
      await this.prisma.user.update({
        where: { id: existing.userId },
        data: {
          ...(dto.name && { name: dto.name }),
          ...(dto.email !== undefined && { email: cleanEmail ? cleanEmail : null }),
          ...(dto.phone && { mobileNumber: cleanPhone }),
        },
      });
    }

    return updated;
  }

  async toggleStatus(id: string) {
    const existing = await this.getById(id);
    const isCurrentlyActive = existing.status === 'Active';
    const nextStatus = isCurrentlyActive ? 'Disabled' : 'Active';

    const updated = await this.prisma.customer.update({
      where: { id },
      data: { status: nextStatus },
    });

    if (existing.userId) {
      await this.prisma.user.update({
        where: { id: existing.userId },
        data: { accountStatus: nextStatus === 'Disabled' ? 'DISABLED' : 'ACTIVE' },
      });
    }

    return updated;
  }

  async delete(id: string, hard = false) {
    const existing = await this.getById(id);
    if (hard) {
      if (existing.userId) {
        await this.prisma.user.delete({ where: { id: existing.userId } }).catch(() => {});
      }
      await this.prisma.customer.delete({ where: { id: existing.id } });
      return { success: true, message: 'Account has been permanently deleted.' };
    }

    await this.prisma.customer.update({
      where: { id: existing.id },
      data: {
        isDeleted: true,
        status: 'Deleted',
      },
    });

    if (existing.userId) {
      await this.prisma.user.update({
        where: { id: existing.userId },
        data: { isDeleted: true },
      });
    }

    try { await this.redisService.delete('dashboard:stats'); } catch {}

    return { success: true, message: 'Account has been deleted.' };
  }
}
