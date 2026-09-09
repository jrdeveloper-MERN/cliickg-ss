import { Injectable, NotFoundException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { generateObjectId } from '../../common/utils/object-id.util';
import { CreateProductDto, UpdateProductDto } from './dto/create-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';

const Decimal = Prisma.Decimal;

function toInt(val: any, defaultVal = 0): number {
  if (val === null || val === undefined || val === '') return defaultVal;
  const num = parseInt(String(val), 10);
  return isNaN(num) ? defaultVal : num;
}

function toFloat(val: any, defaultVal = 0): number {
  if (val === null || val === undefined || val === '') return defaultVal;
  const num = parseFloat(String(val));
  return isNaN(num) ? defaultVal : num;
}

function sanitizeImageUrl(url: any): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (trimmed === '/uploads/undefined' || trimmed === 'undefined' || trimmed === 'null' || trimmed.startsWith('__FILE_')) {
    return '';
  }
  return trimmed;
}

function cleanVariantImages(imagesArr: any[], filesMap: Record<string, string>, vIdx: number): string[] {
  if (!Array.isArray(imagesArr)) return [];
  const result: string[] = [];

  imagesArr.forEach((img, imgIdx) => {
    if (typeof img === 'string') {
      if (img.startsWith('__FILE_')) {
        const uploaded = filesMap[`variant_${vIdx}_image_${imgIdx}`];
        const clean = sanitizeImageUrl(uploaded);
        if (clean) result.push(clean);
      } else {
        const clean = sanitizeImageUrl(img);
        if (clean) result.push(clean);
      }
    }
  });

  Object.keys(filesMap).forEach((key) => {
    if (key.startsWith(`variant_${vIdx}_image_`)) {
      const clean = sanitizeImageUrl(filesMap[key]);
      if (clean && !result.includes(clean)) {
        result.push(clean);
      }
    }
  });

  return result;
}



@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getAll(query: ProductQueryDto) {
    const {
      search, q, category, mainCategory, subCategory,
      mainCategoryId, categoryId, subCategoryId,
      status, page = 1, limit = 100, minPrice, maxPrice,
      date, fromDate, toDate
    } = query;

    const pageNum = parseInt(String(page), 10) || 1;
    const limitNum = parseInt(String(limit), 10) || 100;
    const skip = (pageNum - 1) * limitNum;

    const where: any = { isDeleted: false };

    if (date && date.toLowerCase() === 'today') {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);
      where.createdAt = { gte: startOfToday, lte: endOfToday };
    } else if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = new Date(fromDate);
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    // 1. Keyword search (decoupled from category filters, preserved exact/partial terms)
    const rawSearch = search || q || '';
    const trimmedSearch = typeof rawSearch === 'string' ? rawSearch.trim() : '';
    if (trimmedSearch.length > 0) {
      where.OR = [
        { name: { contains: trimmedSearch, mode: 'insensitive' } },
        { shortDescription: { contains: trimmedSearch, mode: 'insensitive' } },
        { description: { contains: trimmedSearch, mode: 'insensitive' } },
      ];
    }

    // 2. Category filtering by name or relation (independent from search query)
    const catTerm = (category || mainCategory || '').trim();
    if (catTerm) {
      const categoryFilter = {
        OR: [
          { mainCategoryId: catTerm },
          { categoryId: catTerm },
          { mainCategory: { name: { equals: catTerm, mode: 'insensitive' } } },
          { category: { name: { equals: catTerm, mode: 'insensitive' } } },
        ],
      };
      if (where.OR) {
        where.AND = [categoryFilter];
      } else {
        where.OR = categoryFilter.OR;
      }
    }

    const subCatTerm = (subCategory || '').trim();
    if (subCatTerm) {
      const subCatFilter = {
        OR: [
          { subCategoryId: subCatTerm },
          { subCategory: { name: { equals: subCatTerm, mode: 'insensitive' } } },
        ],
      };
      where.AND = where.AND || [];
      where.AND.push(subCatFilter);
    }

    if (mainCategoryId) where.mainCategoryId = mainCategoryId;
    if (categoryId) where.categoryId = categoryId;
    if (subCategoryId) where.subCategoryId = subCategoryId;
    if (status) where.status = status;

    if (minPrice !== undefined || maxPrice !== undefined) {
      const minNum = minPrice ? Number(minPrice) : 0;
      const maxNum = maxPrice ? Number(maxPrice) : Number.MAX_SAFE_INTEGER;
      where.price = { gte: minNum, lte: maxNum };
    }

    const [total, products] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        include: {
          mainCategory: { select: { id: true, name: true } },
          category: { select: { id: true, name: true } },
          subCategory: { select: { id: true, name: true } },
          variants: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
    ]);

    // Dynamic min/max bounds calculation strictly from active products in database
    let dbMinPrice = 0;
    let dbMaxPrice = 0;

    const activeProducts = await this.prisma.product.findMany({
      where: { status: 'Active', isDeleted: false },
      select: { price: true },
    });

    if (activeProducts.length > 0) {
      const prices = activeProducts.map((p) => Number(p.price)).filter((p) => p > 0);
      if (prices.length > 0) {
        dbMinPrice = Math.min(...prices);
        dbMaxPrice = Math.max(...prices);
      }
    }

    const mappedProducts = products.map((p) => ({
      ...p,
      _id: p.id,
      productDetails: p.variants,
      mainCategoryId: p.mainCategory ? { ...p.mainCategory, _id: p.mainCategory.id } : p.mainCategoryId,
      categoryId: p.category ? { ...p.category, _id: p.category.id } : p.categoryId,
      subCategoryId: p.subCategory ? { ...p.subCategory, _id: p.subCategory.id } : p.subCategoryId,
    }));

    return {
      data: mappedProducts,
      products: mappedProducts,
      total,
      minPrice: dbMinPrice,
      maxPrice: dbMaxPrice,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }

  async getById(id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, isDeleted: false },
      include: {
        mainCategory: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
        subCategory: { select: { id: true, name: true } },
        variants: true,
      },
    });

    if (!product) throw new NotFoundException({ message: 'Product not found' });

    return {
      ...product,
      _id: product.id,
      productDetails: product.variants,
      mainCategoryId: product.mainCategory ? { ...product.mainCategory, _id: product.mainCategory.id } : product.mainCategoryId,
      categoryId: product.category ? { ...product.category, _id: product.category.id } : product.categoryId,
      subCategoryId: product.subCategory ? { ...product.subCategory, _id: product.subCategory.id } : product.subCategoryId,
    };
  }

  async create(dto: CreateProductDto, filesMap: Record<string, string> = {}, extraUploadedImages: string[] = []) {
    // 1. Verify required category relations exist in database
    const [mainCat, cat, subCat] = await Promise.all([
      this.prisma.mainCategory.findUnique({ where: { id: dto.mainCategoryId } }),
      this.prisma.category.findUnique({ where: { id: dto.categoryId } }),
      this.prisma.subCategory.findUnique({ where: { id: dto.subCategoryId } }),
    ]);

    if (!mainCat) {
      throw new BadRequestException({ message: `Main Category ID '${dto.mainCategoryId}' does not exist in database` });
    }
    if (!cat) {
      throw new BadRequestException({ message: `Category ID '${dto.categoryId}' does not exist in database` });
    }
    if (!subCat) {
      throw new BadRequestException({ message: `SubCategory ID '${dto.subCategoryId}' does not exist in database` });
    }



    let productImage = sanitizeImageUrl(filesMap['productImage'] || dto.productImage);
    let secondaryImage = sanitizeImageUrl(filesMap['secondaryImage'] || dto.secondaryImage);
    
    let certificates: string[] = [];
    if (dto.certificates || dto.selectedCertificates) {
      const raw = dto.certificates || dto.selectedCertificates;
      if (typeof raw === 'string') {
        try { certificates = JSON.parse(raw); } catch { certificates = [raw]; }
      } else if (Array.isArray(raw)) {
        certificates = raw;
      }
    }

    let images: string[] = extraUploadedImages.map(img => sanitizeImageUrl(img)).filter(Boolean);
    if (!productImage && images.length > 0) productImage = images[0];

    let parsedAttributes: any = {};
    if (typeof dto.attributes === 'string') {
      try { parsedAttributes = JSON.parse(dto.attributes); } catch {}
    } else if (typeof dto.attributes === 'object') {
      parsedAttributes = dto.attributes;
    }

    let parsedDetails: any[] = [];
    if (typeof dto.productDetails === 'string') {
      try { parsedDetails = JSON.parse(dto.productDetails); } catch {}
    } else if (Array.isArray(dto.productDetails)) {
      parsedDetails = dto.productDetails;
    }

    const productId = generateObjectId();

    // Map ProductVariant child records with strict numeric type conversions and zero-trust pricing recalculation
    const variantsData = parsedDetails.map((detail, vIdx) => {
      const varImages = cleanVariantImages(detail.images, filesMap, vIdx);
      const mrpVal = Math.max(0, toFloat(detail.mrp, 0));
      const enableDiscount = Boolean(detail.enableDiscount);
      const isDiscountActive = detail.isDiscountActive !== false;
      const discountType = detail.discountType === 'Percentage' ? 'Percentage' : 'Flat';
      const rawDiscountVal = Math.max(0, toFloat(detail.discountValue, 0));
      const enableGst = detail.enableGst !== undefined ? Boolean(detail.enableGst) : (detail.gst !== undefined && detail.gst !== '' && toFloat(detail.gst, 0) > 0);
      const rawGst = detail.gst !== undefined && detail.gst !== '' ? toFloat(detail.gst, 0) : (detail.finalGstRate !== undefined && detail.finalGstRate !== '' ? toFloat(detail.finalGstRate, 0) : 0);
      const gstVal = enableGst ? Math.max(0, rawGst) : 0;
      
      const gstMode = String(detail.gstMode || 'EXCLUSIVE').toUpperCase() === 'INCLUSIVE' ? 'INCLUSIVE' : 'EXCLUSIVE';
      const rawTaxMode = detail.taxMode || detail.gstType || 'CGST_SGST';
      const taxMode = (rawTaxMode === 'IGST' || rawTaxMode === 'igst') ? 'IGST' : 'CGST_SGST';
      const gstType = taxMode === 'IGST' ? 'IGST' : 'CGST + SGST';

      let deduction = 0;
      if (enableDiscount && isDiscountActive && mrpVal > 0 && rawDiscountVal > 0) {
        if (discountType === 'Percentage') {
          const rate = Math.min(100, rawDiscountVal);
          deduction = Math.round((mrpVal * (rate / 100)) * 100) / 100;
        } else {
          deduction = Math.min(mrpVal, rawDiscountVal);
        }
      }

      let offerPriceVal = mrpVal;
      if (enableDiscount && isDiscountActive) {
        offerPriceVal = Math.max(0, Math.round((mrpVal - deduction) * 100) / 100);
      } else if (detail.offerPrice !== undefined && detail.offerPrice !== '') {
        const rawOffer = toFloat(detail.offerPrice, 0);
        offerPriceVal = rawOffer > 0 ? rawOffer : mrpVal;
      }

      const computedPrice = offerPriceVal > 0 ? offerPriceVal : (mrpVal > 0 ? mrpVal : toFloat(detail.price || detail.finalPrice, 0));

      const userAttrs = typeof detail.attributes === 'object' && detail.attributes !== null ? { ...detail.attributes } : {};
      delete userAttrs.pricingConfig;

      const mergedAttributes = {
        ...userAttrs,
        pricingConfig: {
          enableDiscount,
          discountType,
          discountValue: rawDiscountVal,
          isDiscountActive,
          enableGst,
          gstMode,
          taxMode,
          gstType,
          deduction,
        },
      };

      const finalSku = detail.sku ? String(detail.sku).trim() : (detail.skuCode ? String(detail.skuCode).trim() : `SKU-${Math.floor(100000 + Math.random() * 900000)}`);

      return {
        id: generateObjectId(),
        sku: finalSku,
        skuCode: detail.skuCode ? String(detail.skuCode).trim() : finalSku,
        mrp: mrpVal,
        offerPrice: offerPriceVal,
        gst: gstVal,
        gstMode,
        taxMode,
        price: computedPrice,
        attributes: mergedAttributes,
        stock: toInt(detail.stock, 0),
        stockStatus: detail.stockStatus || detail.availability || (toInt(detail.stock, 0) > 0 ? 'In Stock' : 'Out of Stock'),
        status: detail.status || 'Active',
        images: varImages,
      };
    });

    try {
      let mainPrice = Number(dto.price) || 0;
      if (mainPrice <= 0 && variantsData.length > 0) {
        const vPrices = variantsData.map((v) => Number(v.price)).filter((p) => p > 0);
        if (vPrices.length > 0) mainPrice = Math.min(...vPrices);
      }

      const product = await this.prisma.product.create({
        data: {
          id: productId,
          name: dto.name,
          offerText: dto.offerText || '',
          gender: dto.gender || '',
          mainCategoryId: dto.mainCategoryId,
          categoryId: dto.categoryId,
          subCategoryId: dto.subCategoryId,
          hsnCode: dto.hsnCode || '',
          productImage,
          secondaryImage,
          shortDescription: dto.shortDescription || '',
          description: dto.description || '',
          certificates,
          images,
          price: mainPrice,
          stock: Number(dto.stock) || 0,
          attributes: parsedAttributes,
          status: dto.status || 'Active',
          variants: {
            create: variantsData,
          },
        },
        include: {
          mainCategory: { select: { id: true, name: true } },
          category: { select: { id: true, name: true } },
          subCategory: { select: { id: true, name: true } },
          variants: true,
        },
      });

      return product;
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException({ message: `A product or variant with this unique identifier (${error.meta?.target || 'SKU/Name'}) already exists.` });
      }
      if (error.code === 'P2003') {
        throw new BadRequestException({ message: `Invalid foreign key relation: ${error.meta?.field_name || 'Category ID'}` });
      }
      this.logger.error(`Product creation failed: ${error.message}`, error.stack);
      throw new BadRequestException({ message: error.message || 'Failed to create product' });
    }
  }

  async update(id: string, dto: UpdateProductDto, filesMap: Record<string, string> = {}) {
    const existing = await this.getById(id);

    let productImage = filesMap['productImage'] || existing.productImage;
    let secondaryImage = filesMap['secondaryImage'] || existing.secondaryImage;

    let parsedAttributes: any = existing.attributes;
    if (dto.attributes) {
      if (typeof dto.attributes === 'string') {
        try { parsedAttributes = JSON.parse(dto.attributes); } catch {}
      } else {
        parsedAttributes = dto.attributes;
      }
    }

    try {
      if (dto.productDetails) {
        let parsedDetails: any[] = [];
        if (typeof dto.productDetails === 'string') {
          try { parsedDetails = JSON.parse(dto.productDetails); } catch {}
        } else if (Array.isArray(dto.productDetails)) {
          parsedDetails = dto.productDetails;
        }

        await this.prisma.productVariant.deleteMany({ where: { productId: id } });

        const newVariants = parsedDetails.map((detail, vIdx) => {
          const varImages = cleanVariantImages(detail.images, filesMap, vIdx);
          const mrpDec = Decimal.max(new Decimal(0), new Decimal(String(detail.mrp || 0)));
          const mrpVal = mrpDec.toNumber();
          
          const enableDiscount = Boolean(detail.enableDiscount);
          const isDiscountActive = detail.isDiscountActive !== false;
          const discountType = detail.discountType === 'Percentage' ? 'Percentage' : 'Flat';
          const rawDiscountDec = Decimal.max(new Decimal(0), new Decimal(String(detail.discountValue || 0)));
          const rawDiscountVal = rawDiscountDec.toNumber();

          const enableGst = detail.enableGst !== undefined ? Boolean(detail.enableGst) : (detail.gst !== undefined && detail.gst !== '' && toFloat(detail.gst, 0) > 0);
          const rawGst = detail.gst !== undefined && detail.gst !== '' ? detail.gst : (detail.finalGstRate !== undefined && detail.finalGstRate !== '' ? detail.finalGstRate : 0);
          const gstDec = enableGst ? Decimal.max(new Decimal(0), new Decimal(String(rawGst || 0))) : new Decimal(0);
          const gstVal = gstDec.toNumber();
          
          const gstMode = String(detail.gstMode || 'EXCLUSIVE').toUpperCase() === 'INCLUSIVE' ? 'INCLUSIVE' : 'EXCLUSIVE';
          const rawTaxMode = detail.taxMode || detail.gstType || 'CGST_SGST';
          const taxMode = (rawTaxMode === 'IGST' || rawTaxMode === 'igst') ? 'IGST' : 'CGST_SGST';
          const gstType = taxMode === 'IGST' ? 'IGST' : 'CGST + SGST';

          let deductionDec = new Decimal(0);
          if (enableDiscount && isDiscountActive && mrpDec.gt(0) && rawDiscountDec.gt(0)) {
            if (discountType === 'Percentage') {
              const rate = Decimal.min(new Decimal(100), rawDiscountDec);
              deductionDec = mrpDec.mul(rate).div(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
            } else {
              deductionDec = Decimal.min(mrpDec, rawDiscountDec).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
            }
          }
          const deduction = deductionDec.toNumber();

          let offerPriceDec = mrpDec;
          if (enableDiscount && isDiscountActive) {
            offerPriceDec = Decimal.max(new Decimal(0), mrpDec.minus(deductionDec)).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
          } else if (detail.offerPrice !== undefined && detail.offerPrice !== '') {
            const rawOffer = new Decimal(String(detail.offerPrice || 0));
            offerPriceDec = rawOffer.gt(0) ? rawOffer : mrpDec;
          }
          const offerPriceVal = offerPriceDec.toNumber();

          const computedPriceDec = offerPriceDec.gt(0) ? offerPriceDec : (mrpDec.gt(0) ? mrpDec : new Decimal(String(detail.price || detail.finalPrice || 0)));
          const computedPrice = computedPriceDec.toNumber();

          const userAttrs = typeof detail.attributes === 'object' && detail.attributes !== null ? { ...detail.attributes } : {};
          delete userAttrs.pricingConfig;

          const mergedAttributes = {
            ...userAttrs,
            pricingConfig: {
              enableDiscount,
              discountType,
              discountValue: rawDiscountVal,
              isDiscountActive,
              enableGst,
              gstMode,
              taxMode,
              gstType,
              deduction,
            },
          };

          const finalSku = detail.sku ? String(detail.sku).trim() : (detail.skuCode ? String(detail.skuCode).trim() : `SKU-${Math.floor(100000 + Math.random() * 900000)}`);

          return {
            id: generateObjectId(),
            productId: id,
            sku: finalSku,
            skuCode: detail.skuCode ? String(detail.skuCode).trim() : finalSku,
            mrp: mrpVal,
            offerPrice: offerPriceVal,
            gst: gstVal,
            gstMode,
            taxMode,
            price: computedPrice,
            attributes: mergedAttributes,
            stock: toInt(detail.stock, 0),
            stockStatus: detail.stockStatus || detail.availability || (toInt(detail.stock, 0) > 0 ? 'In Stock' : 'Out of Stock'),
            status: detail.status || 'Active',
            images: varImages,
          };
        });

        await this.prisma.productVariant.createMany({ data: newVariants });
      }

      const updated = await this.prisma.product.update({
        where: { id },
        data: {
          ...(dto.name && { name: dto.name }),
          ...(dto.offerText !== undefined && { offerText: dto.offerText }),
          ...(dto.gender !== undefined && { gender: dto.gender }),
          ...(dto.mainCategoryId && { mainCategoryId: dto.mainCategoryId }),
          ...(dto.categoryId && { categoryId: dto.categoryId }),
          ...(dto.subCategoryId && { subCategoryId: dto.subCategoryId }),
          ...(dto.hsnCode !== undefined && { hsnCode: dto.hsnCode }),
          ...(dto.shortDescription !== undefined && { shortDescription: dto.shortDescription }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.price !== undefined && { price: Number(dto.price) }),
          ...(dto.stock !== undefined && { stock: Number(dto.stock) }),
          ...(dto.status && { status: dto.status }),
          productImage,
          secondaryImage,
          attributes: parsedAttributes,
        },
        include: {
          mainCategory: { select: { id: true, name: true } },
          category: { select: { id: true, name: true } },
          subCategory: { select: { id: true, name: true } },
          variants: true,
        },
      });

      return updated;
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException({ message: `A product or variant with this unique identifier (${error.meta?.target || 'SKU/Name'}) already exists.` });
      }
      if (error.code === 'P2003') {
        throw new BadRequestException({ message: `Invalid foreign key relation: ${error.meta?.field_name || 'Category or Profile ID'}` });
      }
      this.logger.error(`Product update failed: ${error.message}`, error.stack);
      throw new BadRequestException({ message: error.message || 'Failed to update product' });
    }
  }

  async toggleStatus(id: string) {
    const existing = await this.getById(id);
    const nextStatus = existing.status === 'Active' ? 'Inactive' : 'Active';

    const updated = await this.prisma.product.update({
      where: { id },
      data: { status: nextStatus },
      include: {
        mainCategory: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
        subCategory: { select: { id: true, name: true } },
        variants: true,
      },
    });

    return {
      ...updated,
      _id: updated.id,
      productDetails: updated.variants,
      mainCategoryId: updated.mainCategory ? { ...updated.mainCategory, _id: updated.mainCategory.id } : updated.mainCategoryId,
      categoryId: updated.category ? { ...updated.category, _id: updated.category.id } : updated.categoryId,
      subCategoryId: updated.subCategory ? { ...updated.subCategory, _id: updated.subCategory.id } : updated.subCategoryId,
    };
  }

  async delete(id: string, adminUserId?: string) {
    const product = await this.prisma.product.findFirst({ where: { id, isDeleted: false } });
    if (!product) {
      throw new NotFoundException({ message: 'Product not found' });
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        // Remove from active shopping carts
        await tx.cartItem.deleteMany({ where: { productId: id } });

        // Soft delete product (OrderItems & ProductVariants are preserved for historical integrity)
        await tx.product.update({
          where: { id },
          data: {
            isDeleted: true,
            status: 'Deleted',
            deletedAt: new Date(),
            deletedBy: adminUserId || 'admin',
          },
        });

        // Clean up from CMS deals & featured sections if present
        const deals = await tx.todaysDeal.findMany({ where: { productIds: { has: id } } });
        for (const deal of deals) {
          await tx.todaysDeal.update({
            where: { id: deal.id },
            data: { productIds: { set: deal.productIds.filter((pId) => pId !== id) } },
          });
        }

        const sections = await tx.featuredSection.findMany({ where: { productIds: { has: id } } });
        for (const section of sections) {
          await tx.featuredSection.update({
            where: { id: section.id },
            data: { productIds: { set: section.productIds.filter((pId) => pId !== id) } },
          });
        }
      });

      return { message: 'Product deleted successfully', id };
    } catch (error: any) {
      this.logger.error(`Failed to delete product ${id}: ${error.message}`, error.stack);
      throw new BadRequestException({ message: error.message || 'Failed to delete product' });
    }
  }
}
