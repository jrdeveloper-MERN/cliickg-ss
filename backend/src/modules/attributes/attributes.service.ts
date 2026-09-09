import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { generateObjectId } from '../../common/utils/object-id.util';
import { CreateAttributeCaptionDto, AddCaptionValueDto } from './dto/create-attribute-caption.dto';
import { CreateAttributeMappingDto } from './dto/create-attribute-mapping.dto';

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

@Injectable()
export class AttributesService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    try {
      const items = await this.prisma.attributeCaption.findMany();
      for (const item of items) {
        let modified = false;
        let cleanedValues: any[] = [];
        if (Array.isArray(item.values)) {
          cleanedValues = (item.values as any[]).map((v) => {
            if (v && v.image && (v.image.includes('undefined') || v.image === 'null')) {
              modified = true;
              return { ...v, image: '' };
            }
            return v;
          });
        }
        if (modified) {
          await this.prisma.attributeCaption.update({
            where: { id: item.id },
            data: { values: cleanedValues },
          });
        }
      }
    } catch (err) {
      // ignore
    }
  }

  // ================= ATTRIBUTE CAPTIONS =================
  async getCaptions() {
    const items = await this.prisma.attributeCaption.findMany({
      where: { isDeleted: false },
      orderBy: { createdAt: 'desc' },
    });
    return items.map(item => ({
      ...item,
      image: sanitizeImg(item.image),
      values: Array.isArray(item.values)
        ? (item.values as any[])
            .filter(v => Boolean(v && (v.value || v.id || v._id)))
            .map(v => ({
              ...v,
              image: sanitizeImg(v.image),
            }))
        : [],
    }));
  }

  async getCaptionById(id: string) {
    const item = await this.prisma.attributeCaption.findFirst({ where: { id, isDeleted: false } });
    if (!item) throw new NotFoundException({ message: 'Attribute Caption not found' });
    return {
      ...item,
      image: sanitizeImg(item.image),
      values: Array.isArray(item.values)
        ? (item.values as any[])
            .filter(v => Boolean(v && (v.value || v.id || v._id)))
            .map(v => ({
              ...v,
              image: sanitizeImg(v.image),
            }))
        : [],
    };
  }

  async createCaption(dto: CreateAttributeCaptionDto, imageUrl?: string) {
    const finalImage = sanitizeImg(imageUrl) || sanitizeImg(dto.image);
    return this.prisma.attributeCaption.create({
      data: {
        id: generateObjectId(),
        caption: dto.caption,
        image: finalImage,
        status: dto.status || 'Active',
        values: [],
      },
    });
  }

  async updateCaption(id: string, dto: CreateAttributeCaptionDto, imageUrl?: string) {
    await this.getCaptionById(id);
    const newImage = sanitizeImg(imageUrl) || sanitizeImg(dto.image);
    return this.prisma.attributeCaption.update({
      where: { id },
      data: {
        ...(dto.caption && { caption: dto.caption }),
        ...(dto.status && { status: dto.status }),
        ...(newImage !== undefined && newImage !== '' && { image: newImage }),
      },
    });
  }

  async toggleCaptionStatus(id: string) {
    const item = await this.getCaptionById(id);
    const newStatus = item.status === 'Active' ? 'Inactive' : 'Active';
    return this.prisma.attributeCaption.update({
      where: { id },
      data: { status: newStatus },
    });
  }

  async deleteCaption(id: string, adminUserId?: string) {
    await this.getCaptionById(id);
    await this.prisma.attributeCaption.update({
      where: { id },
      data: {
        isDeleted: true,
        status: 'Deleted',
        deletedAt: new Date(),
        deletedBy: adminUserId || 'admin',
      },
    });
    return { message: 'Attribute Caption deleted successfully' };
  }

  async addCaptionValue(id: string, dto: AddCaptionValueDto, imageUrl?: string) {
    const caption = await this.getCaptionById(id);
    const currentValues = (caption.values as any[]).filter(v => Boolean(v && (v.value || v.id || v._id)));

    const valueId = generateObjectId();
    const finalValImage = sanitizeImg(imageUrl) || sanitizeImg(dto.image);
    const newValue = {
      _id: valueId,
      id: valueId,
      value: dto.value,
      image: finalValImage,
      iconShow: dto.iconShow !== undefined ? (dto.iconShow === 'true' || dto.iconShow === true) : true,
      status: dto.status || 'Active',
    };

    currentValues.push(newValue);

    return this.prisma.attributeCaption.update({
      where: { id },
      data: { values: currentValues },
    });
  }

  async updateCaptionValue(id: string, valueId: string, dto: AddCaptionValueDto, imageUrl?: string) {
    const caption = await this.getCaptionById(id);
    const currentValues = (caption.values as any[]).filter(v => Boolean(v && (v.value || v.id || v._id)));

    const idx = currentValues.findIndex((v) => v._id === valueId || v.id === valueId);
    if (idx === -1) throw new NotFoundException({ message: 'Value not found' });

    if (dto.value !== undefined) currentValues[idx].value = dto.value;
    if (dto.iconShow !== undefined) currentValues[idx].iconShow = (dto.iconShow === 'true' || dto.iconShow === true);
    if (dto.status !== undefined) currentValues[idx].status = dto.status;
    const finalValImage = sanitizeImg(imageUrl) || sanitizeImg(dto.image);
    if (finalValImage) currentValues[idx].image = finalValImage;

    return this.prisma.attributeCaption.update({
      where: { id },
      data: { values: currentValues },
    });
  }

  async toggleCaptionValueStatus(id: string, valueId: string) {
    const caption = await this.getCaptionById(id);
    const currentValues = (caption.values as any[]).filter(v => Boolean(v && (v.value || v.id || v._id)));

    const idx = currentValues.findIndex((v) => v._id === valueId || v.id === valueId);
    if (idx === -1) throw new NotFoundException({ message: 'Value not found' });

    const currentStatus = currentValues[idx].status || 'Active';
    const nextStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
    currentValues[idx].status = nextStatus;
    currentValues[idx].iconShow = nextStatus === 'Active';

    return this.prisma.attributeCaption.update({
      where: { id },
      data: { values: currentValues },
    });
  }

  async deleteCaptionValue(id: string, valueId: string) {
    const caption = await this.getCaptionById(id);
    const currentValues = (caption.values as any[]).filter(v => Boolean(v && (v.value || v.id || v._id)));

    const filtered = currentValues.filter((v) => v._id !== valueId && v.id !== valueId);

    return this.prisma.attributeCaption.update({
      where: { id },
      data: { values: filtered },
    });
  }

  // ================= ATTRIBUTE MAPPINGS =================
  async getMappings(mainCategoryId?: string, categoryId?: string, subCategoryId?: string) {
    const where: any = { isDeleted: false };
    if (categoryId) where.categoryId = categoryId;

    const mappings = await this.prisma.attributeMapping.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const [mainCats, cats, subCats, captions] = await Promise.all([
      this.prisma.mainCategory.findMany({ where: { isDeleted: false } }),
      this.prisma.category.findMany({ where: { isDeleted: false } }),
      this.prisma.subCategory.findMany({ where: { isDeleted: false } }),
      this.prisma.attributeCaption.findMany({ where: { isDeleted: false } }),
    ]);

    const mainMap = new Map(mainCats.map(m => [m.id, m]));
    const catMap = new Map(cats.map(c => [c.id, c]));
    const subMap = new Map(subCats.map(s => [s.id, s]));
    const capMap = new Map(captions.map(c => [c.id, c]));

    let results = mappings.map(m => {
      const attrs = (m.attributes as any) || {};
      const mainId = attrs.mainCategoryId || '';
      const catId = m.categoryId || attrs.categoryId || '';
      const subId = attrs.subCategoryId || '';
      const attrId = attrs.attributeId || '';
      const values = Array.isArray(attrs.values) ? attrs.values : [];

      const mainObj = mainMap.get(mainId);
      const catObj = catMap.get(catId);
      const subObj = subMap.get(subId);
      const capObj = capMap.get(attrId);

      return {
        ...m,
        _id: m.id,
        mainCategoryId: mainObj ? { _id: mainObj.id, name: mainObj.name } : mainId,
        categoryId: catObj ? { _id: catObj.id, name: catObj.name } : catId,
        subCategoryId: subObj ? { _id: subObj.id, name: subObj.name } : subId,
        attributeId: capObj ? { _id: capObj.id, caption: capObj.caption } : attrId,
        values,
        attributes: {
          mainCategoryId: mainId,
          subCategoryId: subId,
          attributeId: attrId,
          values,
        },
      };
    });

    if (mainCategoryId) {
      results = results.filter(r => {
        const mId = typeof r.mainCategoryId === 'object' ? r.mainCategoryId?._id : r.mainCategoryId;
        return !mId || mId === mainCategoryId;
      });
    }

    if (subCategoryId) {
      results = results.filter(r => {
        const sId = typeof r.subCategoryId === 'object' ? r.subCategoryId?._id : r.subCategoryId;
        return !sId || sId === subCategoryId;
      });
    }

    return results;
  }

  async createMapping(dto: CreateAttributeMappingDto) {
    let parsedValues = [];
    if (Array.isArray(dto.values)) {
      parsedValues = dto.values;
    } else if (typeof dto.values === 'string') {
      parsedValues = dto.values.split(',').map((v) => v.trim()).filter(Boolean);
    }

    const created = await this.prisma.attributeMapping.create({
      data: {
        id: generateObjectId(),
        categoryId: dto.categoryId,
        attributes: {
          mainCategoryId: dto.mainCategoryId,
          subCategoryId: dto.subCategoryId,
          attributeId: dto.attributeId,
          values: parsedValues,
        },
      },
    });

    const [mainObj, catObj, subObj, capObj] = await Promise.all([
      dto.mainCategoryId ? this.prisma.mainCategory.findFirst({ where: { id: dto.mainCategoryId, isDeleted: false } }) : null,
      dto.categoryId ? this.prisma.category.findFirst({ where: { id: dto.categoryId, isDeleted: false } }) : null,
      dto.subCategoryId ? this.prisma.subCategory.findFirst({ where: { id: dto.subCategoryId, isDeleted: false } }) : null,
      dto.attributeId ? this.prisma.attributeCaption.findFirst({ where: { id: dto.attributeId, isDeleted: false } }) : null,
    ]);

    return {
      ...created,
      _id: created.id,
      mainCategoryId: mainObj ? { _id: mainObj.id, name: mainObj.name } : dto.mainCategoryId,
      categoryId: catObj ? { _id: catObj.id, name: catObj.name } : dto.categoryId,
      subCategoryId: subObj ? { _id: subObj.id, name: subObj.name } : dto.subCategoryId,
      attributeId: capObj ? { _id: capObj.id, caption: capObj.caption } : dto.attributeId,
      values: parsedValues,
    };
  }

  async updateMapping(id: string, dto: CreateAttributeMappingDto) {
    const mapping = await this.prisma.attributeMapping.findFirst({ where: { id, isDeleted: false } });
    if (!mapping) throw new NotFoundException({ message: 'Mapping not found' });

    let parsedValues = [];
    if (Array.isArray(dto.values)) {
      parsedValues = dto.values;
    } else if (typeof dto.values === 'string') {
      parsedValues = dto.values.split(',').map((v) => v.trim()).filter(Boolean);
    }

    const existingAttrs = (mapping.attributes as any) || {};

    const updated = await this.prisma.attributeMapping.update({
      where: { id },
      data: {
        ...(dto.categoryId && { categoryId: dto.categoryId }),
        attributes: {
          ...existingAttrs,
          ...(dto.mainCategoryId && { mainCategoryId: dto.mainCategoryId }),
          ...(dto.subCategoryId && { subCategoryId: dto.subCategoryId }),
          ...(dto.attributeId && { attributeId: dto.attributeId }),
          ...(dto.values && { values: parsedValues }),
        },
      },
    });

    const attrs = (updated.attributes as any) || {};
    const mainId = attrs.mainCategoryId || dto.mainCategoryId;
    const catId = updated.categoryId || dto.categoryId;
    const subId = attrs.subCategoryId || dto.subCategoryId;
    const attrId = attrs.attributeId || dto.attributeId;

    const [mainObj, catObj, subObj, capObj] = await Promise.all([
      mainId ? this.prisma.mainCategory.findFirst({ where: { id: mainId, isDeleted: false } }) : null,
      catId ? this.prisma.category.findFirst({ where: { id: catId, isDeleted: false } }) : null,
      subId ? this.prisma.subCategory.findFirst({ where: { id: subId, isDeleted: false } }) : null,
      attrId ? this.prisma.attributeCaption.findFirst({ where: { id: attrId, isDeleted: false } }) : null,
    ]);

    return {
      ...updated,
      _id: updated.id,
      mainCategoryId: mainObj ? { _id: mainObj.id, name: mainObj.name } : mainId,
      categoryId: catObj ? { _id: catObj.id, name: catObj.name } : catId,
      subCategoryId: subObj ? { _id: subObj.id, name: subObj.name } : subId,
      attributeId: capObj ? { _id: capObj.id, caption: capObj.caption } : attrId,
      values: parsedValues.length > 0 ? parsedValues : (attrs.values || []),
    };
  }

  async deleteMapping(id: string, adminUserId?: string) {
    const mapping = await this.prisma.attributeMapping.findFirst({ where: { id, isDeleted: false } });
    if (!mapping) throw new NotFoundException({ message: 'Mapping not found' });

    await this.prisma.attributeMapping.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: adminUserId || 'admin',
      },
    });
    return { message: 'Attribute Mapping deleted successfully' };
  }
}
