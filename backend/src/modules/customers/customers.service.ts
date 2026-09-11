import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { generateObjectId } from '../../common/utils/object-id.util';
import { normalizePhoneNumber } from '../../common/utils/phone.util';
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
    const rawPhone = dto.phone || (dto as any).mobileNumber || '';
    
    // Standardize & normalize phone number
    const phoneData = normalizePhoneNumber(rawPhone, dto.countryCode || '+91');
    if (!phoneData) {
      throw new BadRequestException({ message: 'Invalid mobile number format. Please provide a valid 10-digit Indian mobile number.' });
    }

    const { countryCode, mobileNumber: cleanPhone, fullPhoneNumber } = phoneData;

    if (cleanEmail) {
      const existingEmail = await this.prisma.customer.findFirst({ where: { email: cleanEmail } });
      if (existingEmail) {
        throw new BadRequestException({ message: 'An account with this email address already exists.' });
      }
    }

    const existingPhone = await this.prisma.customer.findFirst({
      where: { OR: [{ phone: cleanPhone }, { mobileNumber: cleanPhone }, { fullPhoneNumber }] },
    });
    if (existingPhone) {
      throw new BadRequestException({ message: 'An account with this mobile number already exists.' });
    }

    const existingUserPhone = await this.prisma.user.findFirst({
      where: { OR: [{ username: cleanPhone }, { username: fullPhoneNumber }, { mobileNumber: cleanPhone }, { fullPhoneNumber }] },
    });
    if (existingUserPhone) {
      throw new BadRequestException({ message: 'A user account with this mobile number already exists.' });
    }

    // Enforce canonical customer type and reject unsupported types
    if (dto.type && dto.type !== 'Customer') {
      throw new BadRequestException({ message: 'Invalid customer type. Only Customer is allowed.' });
    }

    const address1Val = dto.address1 || dto.address || '';

    // Atomic transaction: Create linked User, Customer, and Cart together
    const createdCustomer = await this.prisma.$transaction(async (tx) => {
      const userId = generateObjectId();
      const createdUser = await tx.user.create({
        data: {
          id: userId,
          username: fullPhoneNumber, // Same canonical E.164 username format as Client registration
          mobileNumber: cleanPhone,   // 10-digit national number
          fullPhoneNumber: fullPhoneNumber, // +919876543210
          countryCode: countryCode,
          name: dto.name,
          email: cleanEmail || null,
          role: 'customer',
          accountStatus: dto.accountStatus || (dto.status === 'Disabled' ? 'DISABLED' : 'ACTIVE'),
        },
      });

      const seq = await this.prisma.getNextSequence('customer', 1);
      const custId = `CLIICKG-C-${String(seq).padStart(6, '0')}`;
      const newCustomerPk = generateObjectId();

      const formattedAddr = [address1Val, dto.address2, dto.area, dto.landmark ? `(Landmark: ${dto.landmark})` : '', dto.city, dto.state, dto.pincode ? `- ${dto.pincode}` : ''].filter(Boolean).join(', ');

      const newCust = await tx.customer.create({
        data: {
          id: newCustomerPk,
          customerId: custId,
          userId: createdUser.id,
          type: 'Customer',
          name: dto.name,
          email: cleanEmail,
          phone: cleanPhone,
          mobileNumber: cleanPhone,
          fullPhoneNumber: fullPhoneNumber,
          countryCode: countryCode,
          gender: dto.gender || 'Male',
          dob: dto.dob ? String(dto.dob) : '',
          address: dto.address || formattedAddr,
          address1: address1Val,
          address2: dto.address2 || '',
          area: dto.area || '',
          landmark: dto.landmark || '',
          city: dto.city || '',
          state: dto.state || '',
          pincode: dto.pincode || '',
          status: dto.status || 'Active',
          accountStatus: dto.accountStatus || (dto.status === 'Disabled' ? 'DISABLED' : 'ACTIVE'),
        },
      });

      // Create linked Cart record (same as canonical Client registration)
      const cartEntityId = generateObjectId();
      await tx.cart.create({
        data: {
          id: cartEntityId,
          userId: createdUser.id,
        },
      });

      return newCust;
    });

    try { await this.redisService.delete('dashboard:stats'); } catch {}
    return createdCustomer;
  }

  async update(id: string, dto: UpdateCustomerDto, isAdmin = false) {
    const existing = await this.getById(id);

    const cleanEmail = dto.email !== undefined ? String(dto.email).trim().toLowerCase() : existing.email;
    const cleanPhone = !isAdmin && dto.phone ? String(dto.phone).replace(/\D/g, '') : existing.phone;

    if (dto.email && cleanEmail && cleanEmail !== existing.email) {
      const dupEmail = await this.prisma.customer.findFirst({
        where: { id: { not: existing.id }, email: cleanEmail },
      });
      if (dupEmail) throw new BadRequestException({ message: 'Email address is already in use by another account.' });
    }

    if (!isAdmin && dto.phone && cleanPhone !== existing.phone) {
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

    const addr1 = dto.address1 !== undefined ? sanitizeText(dto.address1) : existing.address1;
    const addr2 = dto.address2 !== undefined ? sanitizeText(dto.address2) : existing.address2;
    const areaVal = dto.area !== undefined ? sanitizeText(dto.area) : existing.area;
    const landmarkVal = dto.landmark !== undefined ? sanitizeText(dto.landmark) : existing.landmark;
    const cityVal = dto.city !== undefined ? sanitizeText(dto.city) : existing.city;
    const stateVal = dto.state !== undefined ? sanitizeText(dto.state) : existing.state;
    const pincodeVal = dto.pincode !== undefined ? sanitizeText(dto.pincode) : existing.pincode;
    const fallbackAddr = dto.address !== undefined ? sanitizeText(dto.address) : existing.address;

    const formattedFullAddress = [addr1 || fallbackAddr, addr2, areaVal, landmarkVal ? `(Landmark: ${landmarkVal})` : '', cityVal, stateVal, pincodeVal ? `- ${pincodeVal}` : ''].filter(Boolean).join(', ');

    const updated = await this.prisma.customer.update({
      where: { id: existing.id },
      data: {
        ...(dto.name && { name: sanitizeText(dto.name) }),
        ...(dto.email !== undefined && { email: cleanEmail }),
        ...(!isAdmin && dto.phone && { phone: cleanPhone, mobileNumber: cleanPhone }),
        ...(dto.gender && { gender: dto.gender }),
        ...(dto.dob !== undefined && { dob: dto.dob ? String(dto.dob).trim() : '' }),
        address: formattedFullAddress,
        ...(dto.address1 !== undefined && { address1: addr1 }),
        ...(dto.address2 !== undefined && { address2: addr2 }),
        ...(dto.area !== undefined && { area: areaVal }),
        ...(dto.landmark !== undefined && { landmark: landmarkVal }),
        ...(dto.city !== undefined && { city: cityVal }),
        ...(dto.state !== undefined && { state: stateVal }),
        ...(dto.pincode !== undefined && { pincode: pincodeVal }),
        ...(dto.status && { status: dto.status }),
        ...(dto.accountStatus && { accountStatus: dto.accountStatus }),
      },
    });

    // Synchronize linked User if present
    if (existing.userId) {
      await this.prisma.user.update({
        where: { id: existing.userId },
        data: {
          ...(dto.name && { name: dto.name }),
          ...(dto.email !== undefined && { email: cleanEmail ? cleanEmail : null }),
          ...(!isAdmin && dto.phone && { mobileNumber: cleanPhone }),
          ...(dto.accountStatus && { accountStatus: dto.accountStatus }),
          ...(dto.status && { accountStatus: dto.status === 'Disabled' ? 'DISABLED' : 'ACTIVE' }),
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
