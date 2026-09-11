import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { generateObjectId } from '../../common/utils/object-id.util';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class AddressesService {
  constructor(private readonly prisma: PrismaService) {}

  async getAddresses(userId: string) {
    const addresses = await this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
    return { success: true, data: addresses };
  }

  async createAddress(userId: string, dto: CreateAddressDto) {
    const count = await this.prisma.address.count({ where: { userId } });
    const isFirst = count === 0;
    const shouldBeDefault = isFirst || dto.isDefault === true;

    if (shouldBeDefault) {
      await this.prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    const addressLine1 = dto.addressLine1 || dto.address || '';
    const addressLine2 = dto.addressLine2 || dto.address2 || '';
    const newId = generateObjectId();

    const newAddress = await this.prisma.address.create({
      data: {
        id: newId,
        userId,
        name: dto.name,
        phone: dto.phone,
        email: dto.email || '',
        addressLine1,
        addressLine2,
        area: dto.area || '',
        city: dto.city,
        state: dto.state,
        pincode: dto.pincode,
        landmark: dto.landmark || '',
        isDefault: shouldBeDefault,
      },
    });

    return { success: true, data: newAddress };
  }

  async updateAddress(userId: string, addressId: string, dto: UpdateAddressDto) {
    const existing = await this.prisma.address.findUnique({ where: { id: addressId } });
    if (!existing) throw new NotFoundException({ success: false, message: 'Address not found' });
    if (existing.userId !== userId) throw new ForbiddenException({ success: false, message: 'Unauthorized address modification' });

    const shouldBeDefault = dto.isDefault !== undefined ? dto.isDefault : existing.isDefault;

    if (dto.isDefault === true) {
      await this.prisma.address.updateMany({
        where: { userId, id: { not: addressId } },
        data: { isDefault: false },
      });
    }

    const updated = await this.prisma.address.update({
      where: { id: addressId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...((dto.addressLine1 || dto.address) && { addressLine1: dto.addressLine1 || dto.address }),
        ...((dto.addressLine2 || dto.address2) && { addressLine2: dto.addressLine2 || dto.address2 }),
        ...(dto.area !== undefined && { area: dto.area }),
        ...(dto.city !== undefined && { city: dto.city }),
        ...(dto.state !== undefined && { state: dto.state }),
        ...(dto.pincode !== undefined && { pincode: dto.pincode }),
        ...(dto.landmark !== undefined && { landmark: dto.landmark }),
        isDefault: shouldBeDefault,
      },
    });

    return { success: true, data: updated };
  }

  async deleteAddress(userId: string, addressId: string) {
    const existing = await this.prisma.address.findUnique({ where: { id: addressId } });
    if (!existing) throw new NotFoundException({ success: false, message: 'Address not found' });
    if (existing.userId !== userId) throw new ForbiddenException({ success: false, message: 'Unauthorized address deletion' });

    await this.prisma.address.delete({ where: { id: addressId } });

    return { success: true, message: 'Address deleted successfully' };
  }

  async setDefaultAddress(userId: string, addressId: string) {
    const existing = await this.prisma.address.findUnique({ where: { id: addressId } });
    if (!existing) throw new NotFoundException({ success: false, message: 'Address not found' });
    if (existing.userId !== userId) throw new ForbiddenException({ success: false, message: 'Unauthorized address access' });

    await this.prisma.address.updateMany({
      where: { userId },
      data: { isDefault: false },
    });

    const updated = await this.prisma.address.update({
      where: { id: addressId },
      data: { isDefault: true },
    });

    return { success: true, data: updated };
  }
}
