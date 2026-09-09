import { Injectable, NotFoundException, BadRequestException, ConflictException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { generateObjectId } from '../../common/utils/object-id.util';
import { CreateMainCategoryDto, UpdateMainCategoryDto } from './dto/create-main-category.dto';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/create-category.dto';
import { CreateSubCategoryDto, UpdateSubCategoryDto } from './dto/create-subcategory.dto';

function sanitizeImg(url?: string): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (
    trimmed === '/uploads/undefined' ||
    trimmed === 'undefined' ||
    trimmed === 'null' ||
    trimmed.includes('undefined') ||
    trimmed.startsWith('__FILE_')
  ) {
    return '';
  }
  return trimmed;
}

function formatMainCategory(item: any) {
  if (!item) return item;
  return {
    ...item,
    _id: item.id,
    image: sanitizeImg(item.image),
  };
}

function formatCategory(item: any) {
  if (!item) return item;
  const mainCatObj = item.mainCategory
    ? { _id: item.mainCategory.id, id: item.mainCategory.id, name: item.mainCategory.name }
    : typeof item.mainCategoryId === 'object' && item.mainCategoryId
    ? { ...item.mainCategoryId, _id: item.mainCategoryId.id || item.mainCategoryId._id }
    : null;

  return {
    ...item,
    _id: item.id,
    image: sanitizeImg(item.image),
    mainCategoryId: mainCatObj || item.mainCategoryId,
    mainCategoryName: mainCatObj?.name || '',
  };
}

function formatSubCategory(item: any) {
  if (!item) return item;
  const mainCatObj = item.mainCategory
    ? { _id: item.mainCategory.id, id: item.mainCategory.id, name: item.mainCategory.name }
    : typeof item.mainCategoryId === 'object' && item.mainCategoryId
    ? { ...item.mainCategoryId, _id: item.mainCategoryId.id || item.mainCategoryId._id }
    : null;

  const catObj = item.category
    ? { _id: item.category.id, id: item.category.id, name: item.category.name }
    : typeof item.categoryId === 'object' && item.categoryId
    ? { ...item.categoryId, _id: item.categoryId.id || item.categoryId._id }
    : null;

  return {
    ...item,
    _id: item.id,
    image: sanitizeImg(item.image),
    mainCategoryId: mainCatObj || item.mainCategoryId,
    categoryId: catObj || item.categoryId,
    mainCategoryName: mainCatObj?.name || '',
    categoryName: catObj?.name || '',
  };
}

@Injectable()
export class CategoriesService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    try {
      await this.prisma.mainCategory.updateMany({
        where: { image: { in: ['/uploads/undefined', 'undefined', 'null'] } },
        data: { image: '' },
      });
      await this.prisma.category.updateMany({
        where: { image: { in: ['/uploads/undefined', 'undefined', 'null'] } },
        data: { image: '' },
      });
      await this.prisma.subCategory.updateMany({
        where: { image: { in: ['/uploads/undefined', 'undefined', 'null'] } },
        data: { image: '' },
      });
    } catch (err) {
      // ignore
    }
  }

  // ================= MAIN CATEGORY =================
  async getAllMainCategories() {
    const items = await this.prisma.mainCategory.findMany({
      where: { isDeleted: false },
      orderBy: { createdAt: 'desc' },
    });
    return items.map(formatMainCategory);
  }

  async getMainCategoryById(id: string) {
    const item = await this.prisma.mainCategory.findFirst({
      where: { id, isDeleted: false },
    });
    if (!item) throw new NotFoundException({ message: 'Main Category not found' });
    return formatMainCategory(item);
  }

  async createMainCategory(dto: CreateMainCategoryDto, imageFileUrl?: string) {
    const existing = await this.prisma.mainCategory.findFirst({
      where: { name: { equals: dto.name, mode: 'insensitive' }, isDeleted: false },
    });
    if (existing) {
      throw new BadRequestException({ message: 'Main Category with this name already exists' });
    }

    const finalImage = sanitizeImg(imageFileUrl) || sanitizeImg(dto.image);

    const created = await this.prisma.mainCategory.create({
      data: {
        id: generateObjectId(),
        name: dto.name,
        image: finalImage,
        status: dto.status || 'Active',
      },
    });
    return formatMainCategory(created);
  }

  async updateMainCategory(id: string, dto: UpdateMainCategoryDto, imageFileUrl?: string) {
    await this.getMainCategoryById(id);
    const newImage = sanitizeImg(imageFileUrl) || sanitizeImg(dto.image);
    const updated = await this.prisma.mainCategory.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.status && { status: dto.status }),
        ...(newImage !== undefined && newImage !== '' && { image: newImage }),
      },
    });
    return formatMainCategory(updated);
  }

  async toggleMainCategoryStatus(id: string) {
    const item = await this.getMainCategoryById(id);
    const newStatus = item.status === 'Active' ? 'Inactive' : 'Active';
    const updated = await this.prisma.mainCategory.update({
      where: { id },
      data: { status: newStatus },
    });
    return formatMainCategory(updated);
  }

  async deleteMainCategory(id: string, adminUserId?: string) {
    await this.getMainCategoryById(id);

    const catCount = await this.prisma.category.count({ where: { mainCategoryId: id, isDeleted: false } });
    const subCount = await this.prisma.subCategory.count({ where: { mainCategoryId: id, isDeleted: false } });
    const prodCount = await this.prisma.product.count({ where: { mainCategoryId: id, isDeleted: false } });

    if (catCount > 0 || subCount > 0 || prodCount > 0) {
      throw new ConflictException({
        message: `Cannot delete main category because it is being used by ${catCount} categories, ${subCount} subcategories, and ${prodCount} products.`
      });
    }

    await this.prisma.mainCategory.update({
      where: { id },
      data: {
        isDeleted: true,
        status: 'Deleted',
        deletedAt: new Date(),
        deletedBy: adminUserId || 'admin',
      },
    });
    return { message: 'Main Category deleted successfully', id };
  }

  // ================= CATEGORY =================
  async getAllCategories(mainCategoryId?: string) {
    const items = await this.prisma.category.findMany({
      where: {
        isDeleted: false,
        ...(mainCategoryId && { mainCategoryId }),
      },
      include: {
        mainCategory: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return items.map(formatCategory);
  }

  async getCategoryById(id: string) {
    const item = await this.prisma.category.findFirst({
      where: { id, isDeleted: false },
      include: {
        mainCategory: { select: { id: true, name: true } },
      },
    });
    if (!item) throw new NotFoundException({ message: 'Category not found' });
    return formatCategory(item);
  }

  async createCategory(dto: CreateCategoryDto, imageFileUrl?: string) {
    const finalImage = sanitizeImg(imageFileUrl) || sanitizeImg(dto.image);
    const created = await this.prisma.category.create({
      data: {
        id: generateObjectId(),
        name: dto.name,
        mainCategoryId: dto.mainCategoryId,
        image: finalImage,
        status: dto.status || 'Active',
      },
      include: {
        mainCategory: { select: { id: true, name: true } },
      },
    });
    return formatCategory(created);
  }

  async updateCategory(id: string, dto: UpdateCategoryDto, imageFileUrl?: string) {
    await this.getCategoryById(id);
    const newImage = sanitizeImg(imageFileUrl) || sanitizeImg(dto.image);
    const updated = await this.prisma.category.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.mainCategoryId && { mainCategoryId: dto.mainCategoryId }),
        ...(dto.status && { status: dto.status }),
        ...(newImage !== undefined && newImage !== '' && { image: newImage }),
      },
      include: {
        mainCategory: { select: { id: true, name: true } },
      },
    });
    return formatCategory(updated);
  }

  async toggleCategoryStatus(id: string) {
    const item = await this.getCategoryById(id);
    const newStatus = item.status === 'Active' ? 'Inactive' : 'Active';
    const updated = await this.prisma.category.update({
      where: { id },
      data: { status: newStatus },
      include: {
        mainCategory: { select: { id: true, name: true } },
      },
    });
    return formatCategory(updated);
  }

  async deleteCategory(id: string, adminUserId?: string) {
    await this.getCategoryById(id);

    const subCount = await this.prisma.subCategory.count({ where: { categoryId: id, isDeleted: false } });
    const prodCount = await this.prisma.product.count({ where: { categoryId: id, isDeleted: false } });

    if (subCount > 0 || prodCount > 0) {
      throw new ConflictException({
        message: `Cannot delete category because it is being used by ${subCount} subcategories and ${prodCount} products.`
      });
    }

    await this.prisma.category.update({
      where: { id },
      data: {
        isDeleted: true,
        status: 'Deleted',
        deletedAt: new Date(),
        deletedBy: adminUserId || 'admin',
      },
    });
    return { message: 'Category deleted successfully', id };
  }

  // ================= SUBCATEGORY (Single Table: subcategories) =================
  async getAllSubCategories(mainCategoryId?: string, categoryId?: string) {
    const where: any = { isDeleted: false };
    if (mainCategoryId) where.mainCategoryId = mainCategoryId;
    if (categoryId) where.categoryId = categoryId;

    const items = await this.prisma.subCategory.findMany({
      where,
      include: {
        mainCategory: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return items.map(formatSubCategory);
  }

  async getSubCategoryById(id: string) {
    const item = await this.prisma.subCategory.findFirst({
      where: { id, isDeleted: false },
      include: {
        mainCategory: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
      },
    });
    if (!item) throw new NotFoundException({ message: 'Sub Category not found' });
    return formatSubCategory(item);
  }

  async createSubCategory(dto: CreateSubCategoryDto, imageFileUrl?: string) {
    const finalImage = sanitizeImg(imageFileUrl) || sanitizeImg(dto.image);
    const created = await this.prisma.subCategory.create({
      data: {
        id: generateObjectId(),
        name: dto.name,
        mainCategoryId: dto.mainCategoryId,
        categoryId: dto.categoryId,
        image: finalImage,
        status: dto.status || 'Active',
      },
      include: {
        mainCategory: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
      },
    });
    return formatSubCategory(created);
  }

  async updateSubCategory(id: string, dto: UpdateSubCategoryDto, imageFileUrl?: string) {
    await this.getSubCategoryById(id);
    const newImage = sanitizeImg(imageFileUrl) || sanitizeImg(dto.image);
    const updated = await this.prisma.subCategory.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.mainCategoryId && { mainCategoryId: dto.mainCategoryId }),
        ...(dto.categoryId && { categoryId: dto.categoryId }),
        ...(dto.status && { status: dto.status }),
        ...(newImage !== undefined && newImage !== '' && { image: newImage }),
      },
      include: {
        mainCategory: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
      },
    });
    return formatSubCategory(updated);
  }

  async toggleSubCategoryStatus(id: string) {
    const item = await this.getSubCategoryById(id);
    const newStatus = item.status === 'Active' ? 'Inactive' : 'Active';
    const updated = await this.prisma.subCategory.update({
      where: { id },
      data: { status: newStatus },
      include: {
        mainCategory: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
      },
    });
    return formatSubCategory(updated);
  }

  async deleteSubCategory(id: string, adminUserId?: string) {
    await this.getSubCategoryById(id);

    const prodCount = await this.prisma.product.count({ where: { subCategoryId: id, isDeleted: false } });

    if (prodCount > 0) {
      throw new ConflictException({
        message: `Cannot delete subcategory because it is being used by ${prodCount} products.`
      });
    }

    await this.prisma.subCategory.update({
      where: { id },
      data: {
        isDeleted: true,
        status: 'Deleted',
        deletedAt: new Date(),
        deletedBy: adminUserId || 'admin',
      },
    });
    return { message: 'Sub Category deleted successfully', id };
  }
}
