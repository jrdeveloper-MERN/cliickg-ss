import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { generateObjectId } from '../../common/utils/object-id.util';
import { CreateSellerDto } from './dto/create-seller.dto';
import { UpdateSellerDto } from './dto/update-seller.dto';
import { RejectSellerDto } from './dto/reject-seller.dto';
import { UpdateSellerStatusDto } from './dto/update-seller-status.dto';

@Injectable()
export class SellersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Public Seller Registration Workflow
   */
  async register(dto: CreateSellerDto) {
    const cleanPan = dto.panNumber.trim().toUpperCase();
    const cleanEmail = dto.email.trim().toLowerCase();
    const cleanMobile = dto.mobileNumber.trim().replace(/\D/g, '');

    // Duplicate Registration Protection: Check PAN or Email for existing PENDING or APPROVED application
    const existing = await this.prisma.seller.findFirst({
      where: {
        OR: [
          { panNumber: cleanPan },
          { email: cleanEmail },
        ],
        status: { in: ['PENDING', 'APPROVED'] },
      },
    });

    if (existing) {
      throw new ConflictException({
        success: false,
        message: 'A seller application with this PAN number or Email address already exists.',
        errors: ['DUPLICATE_SELLER_APPLICATION'],
      });
    }

    const id = generateObjectId();
    const seq = await this.prisma.getNextSequence('seller', 1);
    const sellerId = `CLIICKG-S-${String(seq).padStart(6, '0')}`;

    const seller = await this.prisma.seller.create({
      data: {
        id,
        sellerId,
        businessName: dto.businessName.trim(),
        sellerType: 'Seller',
        gstNumber: dto.gstNumber ? dto.gstNumber.trim().toUpperCase() : '',
        panNumber: cleanPan,
        contactPerson: dto.contactPerson.trim(),
        email: cleanEmail,
        mobileNumber: cleanMobile,
        businessLocation: dto.businessLocation.trim(),
        pincode: dto.pincode.trim(),
        productCategory: dto.productCategory.trim(),
        agreementAccepted: dto.agreementAccepted,
        status: 'PENDING',
      },
    });

    return {
      success: true,
      message: 'Seller registration submitted successfully',
      data: {
        id: seller.id,
        sellerId: seller.sellerId,
        businessName: seller.businessName,
        status: seller.status,
        createdAt: seller.createdAt,
      },
    };
  }

  /**
   * Admin Paginated Seller Listing with Search & Filters
   */
  async getAll(query: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    sellerType?: string;
  }) {
    const { status, sellerType, search, page = 1, limit = 10 } = query;
    const pageNum = parseInt(String(page), 10) || 1;
    const limitNum = parseInt(String(limit), 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (status && status !== 'ALL') {
      where.status = status.toUpperCase();
    }

    if (sellerType) {
      where.sellerType = { contains: sellerType, mode: 'insensitive' };
    }

    if (search) {
      const trimmedSearch = search.trim();
      where.OR = [
        { sellerId: { contains: trimmedSearch, mode: 'insensitive' } },
        { businessName: { contains: trimmedSearch, mode: 'insensitive' } },
        { contactPerson: { contains: trimmedSearch, mode: 'insensitive' } },
        { email: { contains: trimmedSearch, mode: 'insensitive' } },
        { mobileNumber: { contains: trimmedSearch, mode: 'insensitive' } },
        { panNumber: { contains: trimmedSearch, mode: 'insensitive' } },
      ];
    }

    const [total, sellers] = await Promise.all([
      this.prisma.seller.count({ where }),
      this.prisma.seller.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
    ]);

    return {
      data: sellers,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }

  /**
   * Admin Get Seller Details by ID or Public sellerId
   */
  async getById(id: string) {
    const seller = await this.prisma.seller.findFirst({
      where: {
        OR: [{ id }, { sellerId: id }],
      },
    });

    if (!seller) {
      throw new NotFoundException({
        success: false,
        message: `Seller record not found for ID '${id}'`,
        errors: ['SELLER_NOT_FOUND'],
      });
    }

    return seller;
  }

  /**
   * Admin Approve Seller Application
   */
  async approve(id: string, adminUser: any) {
    const seller = await this.getById(id);
    const adminIdentity = adminUser?.email || adminUser?.username || adminUser?.id || 'Admin';

    const updated = await this.prisma.seller.update({
      where: { id: seller.id },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedBy: adminIdentity,
        rejectionReason: '',
      },
    });

    return {
      success: true,
      message: `Seller '${updated.businessName}' (${updated.sellerId}) has been successfully approved.`,
      data: updated,
    };
  }

  /**
   * Admin Reject Seller Application
   */
  async reject(id: string, dto: RejectSellerDto, adminUser: any) {
    const seller = await this.getById(id);
    const adminIdentity = adminUser?.email || adminUser?.username || adminUser?.id || 'Admin';

    const updated = await this.prisma.seller.update({
      where: { id: seller.id },
      data: {
        status: 'REJECTED',
        rejectionReason: dto.rejectionReason.trim(),
        rejectedAt: new Date(),
        rejectedBy: adminIdentity,
      },
    });

    return {
      success: true,
      message: `Seller '${updated.businessName}' (${updated.sellerId}) has been rejected.`,
      data: updated,
    };
  }

  /**
   * Admin Update Seller Account Status (PENDING, APPROVED, REJECTED, SUSPENDED)
   */
  async updateStatus(id: string, dto: UpdateSellerStatusDto, adminUser: any) {
    const seller = await this.getById(id);
    const adminIdentity = adminUser?.email || adminUser?.username || adminUser?.id || 'Admin';
    const newStatus = dto.status.toUpperCase();

    const dataToUpdate: any = { status: newStatus };

    if (newStatus === 'APPROVED') {
      dataToUpdate.approvedAt = new Date();
      dataToUpdate.approvedBy = adminIdentity;
      dataToUpdate.rejectionReason = '';
    } else if (newStatus === 'REJECTED') {
      dataToUpdate.rejectedAt = new Date();
      dataToUpdate.rejectedBy = adminIdentity;
    }

    const updated = await this.prisma.seller.update({
      where: { id: seller.id },
      data: dataToUpdate,
    });

    return {
      success: true,
      message: `Seller status updated to '${newStatus}' for '${updated.businessName}'.`,
      data: updated,
    };
  }

  /**
   * Admin Update Editable Business Details
   */
  async update(id: string, dto: UpdateSellerDto) {
    const seller = await this.getById(id);

    const dataToUpdate: any = {};
    if (dto.businessName !== undefined) dataToUpdate.businessName = dto.businessName.trim();
    if (dto.sellerType !== undefined) dataToUpdate.sellerType = dto.sellerType.trim();
    if (dto.gstNumber !== undefined) dataToUpdate.gstNumber = dto.gstNumber ? dto.gstNumber.trim().toUpperCase() : '';
    if (dto.panNumber !== undefined) dataToUpdate.panNumber = dto.panNumber.trim().toUpperCase();
    if (dto.contactPerson !== undefined) dataToUpdate.contactPerson = dto.contactPerson.trim();
    if (dto.email !== undefined) dataToUpdate.email = dto.email.trim().toLowerCase();
    if (dto.mobileNumber !== undefined) dataToUpdate.mobileNumber = dto.mobileNumber.trim().replace(/\D/g, '');
    if (dto.businessLocation !== undefined) dataToUpdate.businessLocation = dto.businessLocation.trim();
    if (dto.pincode !== undefined) dataToUpdate.pincode = dto.pincode.trim();
    if (dto.productCategory !== undefined) dataToUpdate.productCategory = dto.productCategory.trim();

    const updated = await this.prisma.seller.update({
      where: { id: seller.id },
      data: dataToUpdate,
    });

    return {
      success: true,
      message: `Seller details updated for '${updated.businessName}'.`,
      data: updated,
    };
  }
}
