import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { generateObjectId } from '../../common/utils/object-id.util';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { PromotionQueryDto } from './dto/promotion-query.dto';
import { ValidatePromotionDto } from './dto/validate-promotion.dto';

@Injectable()
export class PromotionsService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeAndValidateDiscountType(discountType?: string): 'Percentage' | 'Flat' {
    if (!discountType) return 'Percentage';
    const clean = String(discountType).trim();
    if (clean === 'Percentage' || clean.toLowerCase() === 'percentage') {
      return 'Percentage';
    }
    if (clean === 'Flat' || clean === 'Flat Amount' || clean.toLowerCase() === 'flat' || clean.toLowerCase() === 'flat amount') {
      return 'Flat';
    }
    throw new BadRequestException({
      message: `Unsupported discount type '${discountType}'. Only 'Percentage' and 'Flat' are allowed.`,
      reasonCode: 'PROMO_DISCOUNT_TYPE_UNSUPPORTED',
    });
  }

  private normalizeAndValidateTargetComponent(targetComponent?: string | string[]): 'Product Base Price' | 'Cart Subtotal' {
    const rawTarget = Array.isArray(targetComponent)
      ? (targetComponent[0] || 'Cart Subtotal')
      : (targetComponent || 'Cart Subtotal');
    const clean = String(rawTarget).trim();
    const lower = clean.toLowerCase();

    if (lower === 'product base price' || lower === 'product price' || lower === 'product') {
      return 'Product Base Price';
    }
    if (lower === 'cart subtotal' || lower === 'subtotal') {
      return 'Cart Subtotal';
    }

    throw new BadRequestException({
      message: `Unsupported target component '${clean}'. Active promotions can target only 'Product Base Price' or 'Cart Subtotal'.`,
      reasonCode: 'PROMO_TARGET_UNSUPPORTED',
    });
  }

  async getAll(query: PromotionQueryDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Number(query.limit) || 10);
    const skip = (page - 1) * limit;

    const where: any = { isDeleted: false };
    const now = new Date();

    if (query.status && query.status !== 'All') {
      if (query.status === 'Expired') {
        where.endDate = { lt: now };
      } else if (query.status === 'Active') {
        where.status = 'Active';
        where.AND = [
          { OR: [{ startDate: null }, { startDate: { lte: now } }] },
          { OR: [{ endDate: null }, { endDate: { gte: now } }] },
        ];
      } else if (query.status === 'Inactive') {
        where.status = 'Inactive';
      } else {
        where.status = query.status;
      }
    }

    if (query.discountType) {
      where.discountType = query.discountType;
    }

    if (query.search && query.search.trim()) {
      const q = query.search.trim();
      where.OR = [
        { code: { contains: q, mode: 'insensitive' } },
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.promoCode.count({ where }),
      this.prisma.promoCode.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const populatedData = await Promise.all(data.map(p => this.attachSpecificCustomers(p)));

    return {
      data: populatedData,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  private async attachSpecificCustomers(promo: any) {
    if (!promo) return promo;
    if (!Array.isArray(promo.specificCustomerIds) || promo.specificCustomerIds.length === 0) {
      return { ...promo, specificCustomers: [] };
    }

    const ids = promo.specificCustomerIds.map(s => String(s).trim());
    const users = await this.prisma.user.findMany({
      where: {
        OR: [
          { id: { in: ids } },
          { email: { in: ids } },
          { mobileNumber: { in: ids } },
          { fullPhoneNumber: { in: ids } }
        ]
      }
    });

    const userMap = new Map();
    users.forEach(u => {
      userMap.set(u.id, u);
      if (u.email) userMap.set(u.email.toLowerCase(), u);
      if (u.mobileNumber) userMap.set(u.mobileNumber, u);
      if (u.fullPhoneNumber) userMap.set(u.fullPhoneNumber, u);
    });

    const specificCustomers = ids.map(idStr => {
      const u = userMap.get(idStr) || userMap.get(idStr.toLowerCase());
      if (u) {
        return {
          _id: u.id,
          id: u.id,
          name: u.mobileNumber || u.fullPhoneNumber || u.name || idStr,
          fullName: u.name,
          email: u.email || '',
          phone: u.mobileNumber || u.fullPhoneNumber || idStr,
          mobile: u.mobileNumber || u.fullPhoneNumber || idStr,
          mobileNumber: u.mobileNumber || u.fullPhoneNumber || idStr
        };
      }
      return {
        _id: idStr,
        id: idStr,
        name: idStr,
        fullName: idStr,
        email: idStr.includes('@') ? idStr : '',
        phone: idStr.includes('@') ? '' : idStr,
        mobile: idStr.includes('@') ? '' : idStr,
        mobileNumber: idStr.includes('@') ? '' : idStr
      };
    });

    const uniqueCustomers = [];
    const seenKeys = new Set();
    for (const c of specificCustomers) {
      const key = c.mobile || c.phone || c.email || c.id;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        uniqueCustomers.push(c);
      }
    }

    return {
      ...promo,
      specificCustomers: uniqueCustomers
    };
  }

  async getById(id: string) {
    const promo = await this.prisma.promoCode.findFirst({
      where: {
        isDeleted: false,
        OR: [{ id }, { code: id }],
      },
    });

    if (!promo) {
      throw new NotFoundException({ message: `Promotion / PromoCode with ID '${id}' not found` });
    }

    return this.attachSpecificCustomers(promo);
  }

  async create(dto: CreatePromotionDto) {
    const cleanCode = dto.code.trim().toUpperCase();

    const existing = await this.prisma.promoCode.findFirst({
      where: { code: cleanCode, isDeleted: false },
    });

    if (existing) {
      throw new ConflictException({ message: `Promo Code '${cleanCode}' already exists.` });
    }

    const canonicalDiscountType = this.normalizeAndValidateDiscountType(dto.discountType);
    const canonicalTargetComp = this.normalizeAndValidateTargetComponent(dto.applyDiscountOn || dto.targetComponent);

    const created = await this.prisma.promoCode.create({
      data: {
        id: generateObjectId(),
        code: cleanCode,
        title: dto.title || dto.name || cleanCode,
        description: dto.description || '',
        discountType: canonicalDiscountType,
        discountValue: Number(dto.discountValue ?? dto.discount ?? 0),
        maxDiscountAmount: Number(dto.maxDiscountAmount || 0),
        minOrderAmount: Number(dto.minOrderAmount || 0),
        maxOrderAmount: Number(dto.maxOrderAmount || 0),
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        usageLimit: Number(dto.usageLimit ?? dto.noOfUsers ?? 0),
        perUserLimit: Number(dto.perUserLimit ?? dto.repeatUsage ?? 1),
        targetComponent: canonicalTargetComp,
        customerEligibility: dto.customerEligibility || dto.userType || 'All',
        specificCustomerIds: dto.specificCustomerIds || [],
        specificCustomerEmail: dto.specificCustomerEmail || '',
        allowedPaymentMethods: [],
        allowedPincodes: dto.allowedPincodes || [],
        productIds: dto.productIds || [],
        categoryIds: dto.categoryIds || [],
        mainCategoryIds: dto.mainCategoryIds || [],
        subCategoryIds: dto.subCategoryIds || [],
        productLimit: Number(dto.productLimit || 0),
        isExclusive: false,
        isStackable: false,
        badgeColor: dto.badgeColor || '#D97706',
        backgroundColor: dto.backgroundColor || '#FEF3C7',
        status: dto.status || 'Active',
      },
    });

    return this.attachSpecificCustomers(created);
  }

  async update(id: string, dto: UpdatePromotionDto) {
    const existing = await this.prisma.promoCode.findFirst({
      where: { isDeleted: false, OR: [{ id }, { code: id }] },
    });

    if (!existing) {
      throw new NotFoundException({ message: `Promotion with ID '${id}' not found` });
    }

    if (dto.code && dto.code.trim().toUpperCase() !== existing.code) {
      const codeConflict = await this.prisma.promoCode.findFirst({
        where: { code: dto.code.trim().toUpperCase(), isDeleted: false },
      });
      if (codeConflict) {
        throw new ConflictException({ message: `Promo Code '${dto.code.trim().toUpperCase()}' already exists.` });
      }
    }

    let canonicalDiscountType: 'Percentage' | 'Flat' | undefined = undefined;
    if (dto.discountType !== undefined) {
      canonicalDiscountType = this.normalizeAndValidateDiscountType(dto.discountType);
    }

    let canonicalTargetComp: 'Product Base Price' | 'Cart Subtotal' | undefined = undefined;
    if (dto.applyDiscountOn !== undefined || dto.targetComponent !== undefined) {
      canonicalTargetComp = this.normalizeAndValidateTargetComponent(dto.applyDiscountOn || dto.targetComponent);
    }

    const val = dto.discountValue ?? dto.discount;
    const uLimit = dto.usageLimit ?? dto.noOfUsers;
    const pLimit = dto.perUserLimit ?? dto.repeatUsage;
    const cElig = dto.customerEligibility ?? dto.userType;

    const updated = await this.prisma.promoCode.update({
      where: { id: existing.id },
      data: {
        ...(dto.code && { code: dto.code.trim().toUpperCase() }),
        ...((dto.title !== undefined || dto.name !== undefined) && { title: dto.title || dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(canonicalDiscountType && { discountType: canonicalDiscountType }),
        ...(val !== undefined && { discountValue: Number(val) }),
        ...(dto.maxDiscountAmount !== undefined && { maxDiscountAmount: Number(dto.maxDiscountAmount) }),
        ...(dto.minOrderAmount !== undefined && { minOrderAmount: Number(dto.minOrderAmount) }),
        ...(dto.maxOrderAmount !== undefined && { maxOrderAmount: Number(dto.maxOrderAmount) }),
        ...(dto.startDate !== undefined && { startDate: dto.startDate ? new Date(dto.startDate) : null }),
        ...(dto.endDate !== undefined && { endDate: dto.endDate ? new Date(dto.endDate) : null }),
        ...(uLimit !== undefined && { usageLimit: Number(uLimit) }),
        ...(pLimit !== undefined && { perUserLimit: Number(pLimit) }),
        ...(canonicalTargetComp && { targetComponent: canonicalTargetComp }),
        ...(cElig !== undefined && { customerEligibility: cElig }),
        ...(dto.specificCustomerIds && { specificCustomerIds: dto.specificCustomerIds }),
        ...(dto.specificCustomerEmail !== undefined && { specificCustomerEmail: dto.specificCustomerEmail }),
        ...(dto.allowedPincodes && { allowedPincodes: dto.allowedPincodes }),
        ...(dto.productIds && { productIds: dto.productIds }),
        ...(dto.categoryIds && { categoryIds: dto.categoryIds }),
        ...(dto.mainCategoryIds && { mainCategoryIds: dto.mainCategoryIds }),
        ...(dto.subCategoryIds && { subCategoryIds: dto.subCategoryIds }),
        ...(dto.productLimit !== undefined && { productLimit: Number(dto.productLimit) }),
        ...(dto.badgeColor !== undefined && { badgeColor: dto.badgeColor }),
        ...(dto.backgroundColor !== undefined && { backgroundColor: dto.backgroundColor }),
        ...(dto.status && { status: dto.status }),
      },
    });

    return this.attachSpecificCustomers(updated);
  }

  async toggleStatus(id: string) {
    const existing = await this.prisma.promoCode.findFirst({
      where: { isDeleted: false, OR: [{ id }, { code: id }] },
    });

    if (!existing) {
      throw new NotFoundException({ message: `Promotion with ID '${id}' not found` });
    }

    const nextStatus = existing.status === 'Active' ? 'Inactive' : 'Active';

    return this.prisma.promoCode.update({
      where: { id: existing.id },
      data: { status: nextStatus },
    });
  }

  async delete(id: string, adminUserId?: string) {
    const existing = await this.prisma.promoCode.findFirst({
      where: { isDeleted: false, OR: [{ id }, { code: id }] },
    });

    if (!existing) {
      throw new NotFoundException({ message: `Promotion with ID '${id}' not found` });
    }

    const newCode = existing.code.includes('_DELETED_')
      ? existing.code
      : `${existing.code}_DELETED_${Date.now()}`;

    await this.prisma.promoCode.update({
      where: { id: existing.id },
      data: {
        isDeleted: true,
        status: 'Deleted',
        deletedAt: new Date(),
        deletedBy: adminUserId || 'admin',
        code: newCode,
      },
    });
    return { message: `Promotion '${existing.code}' deleted successfully`, id: existing.id };
  }

  // ================= AUTHORITATIVE PROMOTION VALIDATION PIPELINE =================
  async validatePromoCode(dto: ValidatePromotionDto, authUserId?: string) {
    const rawCode = dto.code || dto.promoCode || '';
    const cleanCode = String(rawCode).trim().toUpperCase();

    if (!cleanCode) {
      throw new BadRequestException({
        message: 'Promo Code should not be empty.',
        reasonCode: 'PROMO_EMPTY',
      });
    }

    // 1. Fetch promo from PostgreSQL
    const promo = await this.prisma.promoCode.findFirst({
      where: {
        code: { equals: cleanCode, mode: 'insensitive' },
        isDeleted: false,
      },
    });

    if (!promo) {
      throw new NotFoundException({
        message: `Invalid Promo Code '${cleanCode}'`,
        reasonCode: 'PROMO_NOT_FOUND',
      });
    }

    // 2. Active Status Check
    if (promo.status !== 'Active') {
      throw new BadRequestException({
        message: `Promo Code '${cleanCode}' is currently inactive.`,
        reasonCode: 'PROMO_INACTIVE',
      });
    }

    // 3. Date Window Range Check (Server UTC Time)
    const now = new Date();
    if (promo.startDate && now < new Date(promo.startDate)) {
      throw new BadRequestException({
        message: `Promo Code '${cleanCode}' campaign has not started yet.`,
        reasonCode: 'PROMO_NOT_STARTED',
      });
    }

    if (promo.endDate && now > new Date(promo.endDate)) {
      throw new BadRequestException({
        message: `Promo Code '${cleanCode}' has expired.`,
        reasonCode: 'PROMO_EXPIRED',
      });
    }

    // 4. Global Usage Limit Check
    if (promo.usageLimit > 0 && promo.usedCount >= promo.usageLimit) {
      throw new BadRequestException({
        message: `Promo Code '${cleanCode}' usage limit has been reached.`,
        reasonCode: 'PROMO_USAGE_LIMIT_REACHED',
      });
    }

    // 5. Per-User Usage Limit Check (JWT Identity ONLY - Prevents Impersonation & Guest Bypass)
    if (promo.perUserLimit > 0) {
      if (!authUserId) {
        throw new BadRequestException({
          message: `This promo code requires customer login before it can be redeemed.`,
          reasonCode: 'PROMO_LOGIN_REQUIRED',
        });
      }

      const userUsageCount = await this.prisma.promoUsage.count({
        where: {
          promoCodeId: promo.id,
          userId: authUserId,
        },
      });

      if (userUsageCount >= promo.perUserLimit) {
        throw new BadRequestException({
          message: `You have already redeemed Promo Code '${cleanCode}' maximum allowed times.`,
          reasonCode: 'PROMO_USER_LIMIT_REACHED',
        });
      }
    }

    // 6. Customer Eligibility Check
    const eligibility = promo.customerEligibility || 'All';
    if (
      eligibility !== 'All' &&
      eligibility !== 'All Customers' &&
      eligibility !== 'All customers'
    ) {
      if (!authUserId) {
        throw new BadRequestException({
          message: `This promo code requires customer login before it can be redeemed.`,
          reasonCode: 'PROMO_LOGIN_REQUIRED',
        });
      }

      const completedOrdersCount = await this.prisma.order.count({
        where: {
          userId: authUserId,
          isDeleted: false,
          orderStatus: { notIn: ['Cancelled', 'CANCELLED'] },
          paymentStatus: { notIn: ['Failed', 'FAILURE'] },
        },
      });

      if (
        eligibility === 'First Purchase' ||
        eligibility === 'New Customer' ||
        eligibility.includes('First')
      ) {
        if (completedOrdersCount > 0) {
          throw new BadRequestException({
            message: `Promo Code '${cleanCode}' is valid strictly for first purchase only.`,
            reasonCode: 'PROMO_CUSTOMER_NOT_ELIGIBLE',
          });
        }
      } else if (eligibility === 'Second Purchase') {
        if (completedOrdersCount !== 1) {
          throw new BadRequestException({
            message: `Promo Code '${cleanCode}' is valid strictly for your second purchase.`,
            reasonCode: 'PROMO_CUSTOMER_NOT_ELIGIBLE',
          });
        }
      } else if (eligibility === 'Third Purchase') {
        if (completedOrdersCount !== 2) {
          throw new BadRequestException({
            message: `Promo Code '${cleanCode}' is valid strictly for your third purchase.`,
            reasonCode: 'PROMO_CUSTOMER_NOT_ELIGIBLE',
          });
        }
      } else if (eligibility === 'Returning Customer') {
        if (completedOrdersCount < 1) {
          throw new BadRequestException({
            message: `Promo Code '${cleanCode}' is valid for returning customers only.`,
            reasonCode: 'PROMO_CUSTOMER_NOT_ELIGIBLE',
          });
        }
      } else if (eligibility === 'VIP Customer') {
        if (completedOrdersCount < 3) {
          throw new BadRequestException({
            message: `Promo Code '${cleanCode}' is valid for VIP customers (3+ completed orders) only.`,
            reasonCode: 'PROMO_CUSTOMER_NOT_ELIGIBLE',
          });
        }
      } else if (
        eligibility === 'Specific Customer' ||
        eligibility === 'Specific'
      ) {
        if (!authUserId) {
          throw new BadRequestException({
            message: `This promo code requires customer login before it can be redeemed.`,
            reasonCode: 'PROMO_LOGIN_REQUIRED',
          });
        }

        const dbUser = authUserId ? await this.prisma.user.findUnique({
          where: { id: authUserId },
          include: { customer: true }
        }) : null;

        const specificIds: string[] = Array.isArray(promo.specificCustomerIds)
          ? promo.specificCustomerIds.map(s => String(s).trim().toLowerCase())
          : [];

        const singleEmail = (promo.specificCustomerEmail || '').trim().toLowerCase();

        const candidateIds = [
          authUserId,
          (dbUser as any)?.id,
          (dbUser as any)?._id,
          (dbUser as any)?.customer?.id,
          (dbUser as any)?.customer?.customerId,
          (dto as any)?.userId
        ].filter(Boolean).map(s => String(s).trim().toLowerCase());

        const candidateEmails = [
          dbUser?.email,
          (dbUser as any)?.customer?.email,
          (dto as any)?.customerEmail,
          (dto as any)?.email
        ].filter(Boolean).map(s => String(s).trim().toLowerCase());

        const normalizePhone = (p: string) => String(p || '').replace(/\D/g, '').slice(-10);

        const candidatePhones = [
          dbUser?.mobileNumber,
          dbUser?.fullPhoneNumber,
          (dbUser as any)?.customer?.phone,
          (dbUser as any)?.customer?.mobileNumber,
          (dto as any)?.customerPhone,
          (dto as any)?.phone
        ].filter(Boolean).map(normalizePhone).filter(p => p.length >= 7);

        const specificNormalizedPhones = specificIds.map(normalizePhone).filter(p => p.length >= 7);

        const matchesId = candidateIds.some(id => specificIds.includes(id));
        const matchesEmail = candidateEmails.some(e => specificIds.includes(e) || (singleEmail !== '' && singleEmail === e));
        const matchesPhone = candidatePhones.some(p => specificNormalizedPhones.includes(p));

        if (!matchesId && !matchesEmail && !matchesPhone) {
          throw new BadRequestException({
            message: `Promo Code '${cleanCode}' is restricted to specific designated customers.`,
            reasonCode: 'PROMO_CUSTOMER_NOT_ELIGIBLE',
          });
        }
      } else {
        // Restricted eligibility mode whose criteria cannot be verified with existing data
        throw new BadRequestException({
          message: `Promo Code '${cleanCode}' eligibility restriction (${eligibility}) cannot be verified for your account.`,
          reasonCode: 'PROMO_ELIGIBILITY_UNVERIFIABLE',
        });
      }
    }

    // SPEC-08: Require non-empty cartItems array for validation
    if (!dto.cartItems || !Array.isArray(dto.cartItems) || dto.cartItems.length === 0) {
      throw new BadRequestException({
        message: 'Cart items array is required to validate promo code.',
        reasonCode: 'PROMO_CART_ITEMS_REQUIRED',
      });
    }

    // 7. Authoritative Subtotal & Product/Category Scope Filtering from PostgreSQL ProductVariant
    let totalCartSubtotal = 0;
    let eligibleSubtotal = 0;

    const hasProductFilter =
      (promo.productIds && promo.productIds.length > 0) ||
      (promo.categoryIds && promo.categoryIds.length > 0) ||
      (promo.mainCategoryIds && promo.mainCategoryIds.length > 0) ||
      (promo.subCategoryIds && promo.subCategoryIds.length > 0);

    let calcSubtotal = 0;
    let calcEligible = 0;

    // Batch resolve catalog product & variant data authoritatively from PostgreSQL
    const itemProductIds = dto.cartItems.map((i: any) => String(i._id || i.productId || '')).filter(Boolean);
    const dbProducts = itemProductIds.length > 0
      ? await this.prisma.product.findMany({
          where: { id: { in: itemProductIds } },
          select: {
            id: true,
            mainCategoryId: true,
            categoryId: true,
            subCategoryId: true,
            price: true,
            variants: {
              select: {
                id: true,
                sku: true,
                price: true,
                status: true,
              },
            },
          },
        })
      : [];
    const prodMap = new Map(dbProducts.map((p) => [p.id, p]));

    const eligibleLineItems: Array<{ pId: string; itemQty: number; unitPrice: number; lineSubtotal: number }> = [];

    for (const item of dto.cartItems) {
      const pId = String(item._id || item.productId || '');
      const itemQty = Math.max(1, parseInt(String(item.quantity || 1), 10));
      if (isNaN(itemQty) || itemQty <= 0) continue;

      const dbP = prodMap.get(pId);
      let matchedVar: any = null;
      if (dbP && dbP.variants && dbP.variants.length > 0) {
        const targetVarId = item.variantId || item.variantKey || item.variant?._id || item.variant?.id;
        if (targetVarId) {
          matchedVar = dbP.variants.find((v: any) => v.id === targetVarId || v.sku === targetVarId || (v as any).purity === targetVarId);
        }
        if (!matchedVar && item.purity) {
          matchedVar = dbP.variants.find((v: any) => (v as any).purity === item.purity);
        }
        if (!matchedVar) {
          matchedVar = dbP.variants[0];
        }
      }

      // Strictly use PostgreSQL authoritative ProductVariant.price (or fallback Product.price)
      let serverUnitPrice = 0;
      if (matchedVar && Number(matchedVar.price) > 0) {
        serverUnitPrice = Number(matchedVar.price);
      } else if (dbP && Number(dbP.price) > 0) {
        serverUnitPrice = Number(dbP.price);
      }

      const lineSubtotal = Math.round(serverUnitPrice * itemQty * 100) / 100;
      calcSubtotal += lineSubtotal;

      let isEligible = true;
      if (hasProductFilter) {
        const isProdMatch = promo.productIds && promo.productIds.includes(pId);
        const isCatMatch = dbP && promo.categoryIds && promo.categoryIds.includes(dbP.categoryId);
        const isMainCatMatch = dbP && promo.mainCategoryIds && promo.mainCategoryIds.includes(dbP.mainCategoryId);
        const isSubCatMatch = dbP && promo.subCategoryIds && promo.subCategoryIds.includes(dbP.subCategoryId);
        isEligible = Boolean(isProdMatch || isCatMatch || isMainCatMatch || isSubCatMatch);
      }

      if (isEligible) {
        calcEligible += lineSubtotal;
        eligibleLineItems.push({
          pId,
          itemQty,
          unitPrice: serverUnitPrice,
          lineSubtotal,
        });
      }
    }

    // Apply Product Limit (Top N items by highest unit price)
    let finalEligibleLineItems = [...eligibleLineItems];
    const topNLimit = Number(promo.productLimit || 0);

    if (topNLimit > 0 && finalEligibleLineItems.length > topNLimit) {
      finalEligibleLineItems.sort((a, b) => b.unitPrice - a.unitPrice);
      finalEligibleLineItems = finalEligibleLineItems.slice(0, topNLimit);
      calcEligible = finalEligibleLineItems.reduce((sum, line) => sum + line.lineSubtotal, 0);
    }

    totalCartSubtotal = Math.round(calcSubtotal * 100) / 100;
    eligibleSubtotal = Math.round((hasProductFilter || topNLimit > 0 ? calcEligible : calcSubtotal) * 100) / 100;

    if ((hasProductFilter || topNLimit > 0) && eligibleSubtotal <= 0) {
      throw new BadRequestException({
        message: `No products in your cart are eligible for Promo Code '${cleanCode}'.`,
        reasonCode: 'PROMO_NO_ELIGIBLE_ITEMS',
      });
    }

    // 8. Min & Max Order Amount Validation
    if (eligibleSubtotal < Number(promo.minOrderAmount || 0)) {
      throw new BadRequestException({
        message: `Minimum subtotal of ₹${Number(promo.minOrderAmount || 0).toLocaleString('en-IN')} required to apply '${cleanCode}'.`,
        reasonCode: 'PROMO_MIN_ORDER_NOT_MET',
      });
    }

    if (Number(promo.maxOrderAmount || 0) > 0 && eligibleSubtotal > Number(promo.maxOrderAmount)) {
      throw new BadRequestException({
        message: `Eligible cart subtotal exceeds maximum threshold of ₹${Number(promo.maxOrderAmount).toLocaleString('en-IN')} for '${cleanCode}'.`,
        reasonCode: 'PROMO_MAX_ORDER_EXCEEDED',
      });
    }

    // 11. Calculate Discount Amount based strictly on targetComponent (Product Base Price vs Cart Subtotal)
    let targetMode: 'Product Base Price' | 'Cart Subtotal' = 'Cart Subtotal';
    try {
      targetMode = this.normalizeAndValidateTargetComponent(promo.targetComponent);
    } catch {
      targetMode = 'Cart Subtotal';
    }

    const discountValueNum = Number(promo.discountValue || 0);
    const maxDiscountCap = Number(promo.maxDiscountAmount || 0);
    const isPercentage = String(promo.discountType).toLowerCase().includes('percentage') || promo.discountType === 'Percentage';

    let discountAmount = 0;

    if (targetMode === 'Product Base Price') {
      // MODE A: PRODUCT BASE PRICE (Calculated per eligible product line)
      if (isPercentage) {
        const percentage = Math.max(0, Math.min(100, discountValueNum));
        let sumLineDiscounts = 0;

        for (const line of finalEligibleLineItems) {
          const rawLineDiscount = (line.lineSubtotal * percentage) / 100;
          // Apply PER-PRODUCT-LINE cap if maxDiscountAmount is set
          let cappedLineDiscount = rawLineDiscount;
          if (maxDiscountCap > 0) {
            cappedLineDiscount = Math.min(rawLineDiscount, maxDiscountCap);
          }
          const clampedLineDiscount = Math.max(0, Math.min(cappedLineDiscount, line.lineSubtotal));
          sumLineDiscounts += Math.round(clampedLineDiscount * 100) / 100;
        }

        discountAmount = sumLineDiscounts;
      } else {
        // Flat Discount on Product Base Price -> Proportional Allocation across eligible product lines
        const totalFlatToAllocate = Math.min(discountValueNum, eligibleSubtotal);
        if (totalFlatToAllocate > 0 && eligibleSubtotal > 0) {
          let allocatedSum = 0;
          let maxLineIndex = 0;
          let maxLineSubtotal = -1;

          const lineDiscounts: number[] = [];

          finalEligibleLineItems.forEach((line, idx) => {
            if (line.lineSubtotal > maxLineSubtotal) {
              maxLineSubtotal = line.lineSubtotal;
              maxLineIndex = idx;
            }
            const ratio = line.lineSubtotal / eligibleSubtotal;
            const lineAlloc = Math.floor(totalFlatToAllocate * ratio * 100) / 100;
            lineDiscounts.push(lineAlloc);
            allocatedSum += lineAlloc;
          });

          // Penny rounding reconciliation to ensure exact total flat discount allocation
          const remainder = Math.round((totalFlatToAllocate - allocatedSum) * 100) / 100;
          if (remainder > 0 && lineDiscounts.length > 0) {
            lineDiscounts[maxLineIndex] = Math.round((lineDiscounts[maxLineIndex] + remainder) * 100) / 100;
          }

          discountAmount = lineDiscounts.reduce((sum, d) => sum + d, 0);
        } else {
          discountAmount = 0;
        }
      }
    } else {
      // MODE B: CART SUBTOTAL (Calculated once against total eligible cart subtotal)
      if (isPercentage) {
        const percentage = Math.max(0, Math.min(100, discountValueNum));
        const rawDiscount = (eligibleSubtotal * percentage) / 100;
        // Apply PER-CART cap if maxDiscountAmount is set
        let cappedDiscount = rawDiscount;
        if (maxDiscountCap > 0) {
          cappedDiscount = Math.min(rawDiscount, maxDiscountCap);
        }
        discountAmount = cappedDiscount;
      } else {
        // Flat Discount on Cart Subtotal
        discountAmount = Math.min(discountValueNum, eligibleSubtotal);
      }
    }

    // Final safety clamp & rounding: 0 <= discountAmount <= eligibleSubtotal
    discountAmount = Math.max(0, Math.min(discountAmount, eligibleSubtotal));
    discountAmount = Math.round(discountAmount * 100) / 100;

    return {
      success: true,
      valid: true,
      promoCode: promo.code,
      discountType: promo.discountType,
      discountValue: Number(promo.discountValue),
      discountAmount,
      discount: discountAmount,
      eligibleSubtotal,
      finalPayable: Math.max(0, Math.round((totalCartSubtotal - discountAmount) * 100) / 100),
      message: `Promo Code '${promo.code}' applied successfully!`,
      promoSummary: {
        id: promo.id,
        code: promo.code,
        title: promo.title,
        discountType: promo.discountType,
        discountValue: Number(promo.discountValue),
        minOrderAmount: Number(promo.minOrderAmount),
        maxDiscountAmount: Number(promo.maxDiscountAmount),
        usageLimit: promo.usageLimit,
        perUserLimit: promo.perUserLimit,
        targetComponent: promo.targetComponent,
        badgeColor: promo.badgeColor,
        backgroundColor: promo.backgroundColor,
      },
    };
  }

  // SPEC-09: Real Promo Revenue Analytics
  async getAnalytics() {
    const promos = await this.prisma.promoCode.findMany({
      include: {
        promoUsages: {
          take: 100,
        },
      },
    });

    const totalPromotions = promos.length;
    const activePromotions = promos.filter(p => p.status === 'Active').length;
    const totalUsage = promos.reduce((sum, p) => sum + (p.usedCount || 0), 0);

    const totalDiscountGiven = promos.reduce((sum, p) => {
      const pDiscount = p.promoUsages.reduce((uSum, u) => uSum + Number(u.discountAmount || 0), 0);
      return sum + pDiscount;
    }, 0);

    // Query paid order totals for revenue calculations
    const paidOrders = await this.prisma.order.findMany({
      where: {
        promoCode: { not: '' },
        paymentStatus: { in: ['Paid', 'PAID', 'SUCCESS'] },
        isDeleted: false,
      },
      select: {
        promoCode: true,
        total: true,
      },
    });

    const revenueByCodeMap = new Map<string, number>();
    let grandTotalRevenue = 0;

    for (const order of paidOrders) {
      const codeKey = order.promoCode.trim().toUpperCase();
      const amt = Number(order.total || 0);
      revenueByCodeMap.set(codeKey, (revenueByCodeMap.get(codeKey) || 0) + amt);
      grandTotalRevenue += amt;
    }

    const topCoupons = promos
      .map(p => {
        const codeKey = p.code.trim().toUpperCase();
        const codeRev = revenueByCodeMap.get(codeKey) || 0;
        return {
          code: p.code,
          usage: p.usedCount || 0,
          discount: p.promoUsages.reduce((uSum, u) => uSum + Number(u.discountAmount || 0), 0),
          revenue: codeRev,
        };
      })
      .sort((a, b) => b.usage - a.usage)
      .slice(0, 5);

    return {
      totalPromotions,
      activePromotions,
      totalUsage,
      successfulUsage: totalUsage,
      totalDiscountGiven,
      totalRevenueGenerated: grandTotalRevenue,
      conversionRate: totalPromotions > 0 ? Math.round((activePromotions / totalPromotions) * 100) : 0,
      topCoupons,
      monthlyStats: [],
    };
  }

  // SPEC-01 & NEW-01: Public Active Promo Data Window & Targeted Promo Isolation
  async getActivePromos(user?: any) {
    const now = new Date();
    const where: any = {
      isDeleted: false,
      status: { in: ['Active', 'active'] },
      AND: [
        {
          OR: [
            { startDate: null },
            { startDate: { lte: now } },
          ],
        },
        {
          OR: [
            { endDate: null },
            { endDate: { gte: now } },
          ],
        },
      ],
    };

    let userEmail = '';
    let userId = '';

    if (user && user.id) {
      userId = user.id;
      const dbUser = await this.prisma.user.findUnique({ where: { id: user.id } });
      if (dbUser && dbUser.email) {
        userEmail = dbUser.email.trim().toLowerCase();
      } else if (user.email) {
        userEmail = String(user.email).trim().toLowerCase();
      }
    }

    if (userId || userEmail) {
      where.OR = [
        {
          customerEligibility: { notIn: ['Specific Customer', 'Specific'] },
          specificCustomerEmail: '',
        },
        ...(userEmail
          ? [
              {
                customerEligibility: { in: ['Specific Customer', 'Specific'] },
                specificCustomerEmail: { equals: userEmail, mode: 'insensitive' as const },
              },
            ]
          : []),
        ...(userId
          ? [
              {
                customerEligibility: { in: ['Specific Customer', 'Specific'] },
                specificCustomerIds: { has: userId },
              },
            ]
          : []),
      ];
    } else {
      where.customerEligibility = { notIn: ['Specific Customer', 'Specific'] };
      where.specificCustomerEmail = '';
    }

    const activePromos = await this.prisma.promoCode.findMany({
      where,
      select: {
        id: true,
        code: true,
        title: true,
        description: true,
        discountType: true,
        discountValue: true,
        minOrderAmount: true,
        maxDiscountAmount: true,
        startDate: true,
        endDate: true,
        badgeColor: true,
        backgroundColor: true,
        status: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return {
      success: true,
      data: activePromos,
    };
  }

  async evaluatePromoEligibility(
    promo: any,
    authUserId?: string,
    cartContext?: { subtotal?: number; cartItems?: any[]; pincode?: string; paymentMethod?: string }
  ): Promise<boolean> {
    const now = new Date();
    if (promo.status !== 'Active' && promo.status !== 'active') return false;
    if (promo.startDate && now < new Date(promo.startDate)) return false;
    if (promo.endDate && now > new Date(promo.endDate)) return false;

    if (promo.usageLimit > 0 && promo.usedCount >= promo.usageLimit) return false;

    if (promo.perUserLimit > 0) {
      if (!authUserId) return false;
      const userUsageCount = await this.prisma.promoUsage.count({
        where: { promoCodeId: promo.id, userId: authUserId },
      });
      if (userUsageCount >= promo.perUserLimit) return false;
    }

    const eligibility = promo.customerEligibility || 'All';
    if (
      eligibility !== 'All' &&
      eligibility !== 'All Customers' &&
      eligibility !== 'All customers'
    ) {
      if (eligibility === 'Specific Customer' || eligibility === 'Specific') {
        if (!authUserId) return false;
        const dbUser = await this.prisma.user.findUnique({
          where: { id: authUserId },
          include: { customer: true }
        });

        const specificIds: string[] = Array.isArray(promo.specificCustomerIds)
          ? promo.specificCustomerIds.map(s => String(s).trim().toLowerCase())
          : [];

        const singleEmail = (promo.specificCustomerEmail || '').trim().toLowerCase();

        const candidateIds = [
          authUserId,
          (dbUser as any)?.id,
          (dbUser as any)?._id,
          (dbUser as any)?.customer?.id,
          (dbUser as any)?.customer?.customerId
        ].filter(Boolean).map(s => String(s).trim().toLowerCase());

        const candidateEmails = [
          dbUser?.email,
          (dbUser as any)?.customer?.email
        ].filter(Boolean).map(s => String(s).trim().toLowerCase());

        const normalizePhone = (p: string) => String(p || '').replace(/\D/g, '').slice(-10);

        const candidatePhones = [
          dbUser?.mobileNumber,
          dbUser?.fullPhoneNumber,
          (dbUser as any)?.customer?.phone,
          (dbUser as any)?.customer?.mobileNumber
        ].filter(Boolean).map(normalizePhone).filter(p => p.length >= 7);

        const specificNormalizedPhones = specificIds.map(normalizePhone).filter(p => p.length >= 7);

        const matchesId = candidateIds.some(id => specificIds.includes(id));
        const matchesEmail = candidateEmails.some(e => specificIds.includes(e) || (singleEmail !== '' && singleEmail === e));
        const matchesPhone = candidatePhones.some(p => specificNormalizedPhones.includes(p));

        if (!matchesId && !matchesEmail && !matchesPhone) return false;
      } else if (authUserId) {
        const completedOrdersCount = await this.prisma.order.count({
          where: {
            userId: authUserId,
            isDeleted: false,
            orderStatus: { notIn: ['Cancelled', 'CANCELLED'] },
            paymentStatus: { notIn: ['Failed', 'FAILURE'] },
          },
        });

        if (
          eligibility === 'First Purchase' ||
          eligibility === 'New Customer' ||
          eligibility.includes('First')
        ) {
          if (completedOrdersCount > 0) return false;
        } else if (eligibility === 'Second Purchase') {
          if (completedOrdersCount !== 1) return false;
        } else if (eligibility === 'Third Purchase') {
          if (completedOrdersCount !== 2) return false;
        } else if (eligibility === 'Returning Customer') {
          if (completedOrdersCount < 1) return false;
        } else if (eligibility === 'VIP Customer') {
          if (completedOrdersCount < 3) return false;
        } else {
          return false;
        }
      }
    }

    if (cartContext) {
      const hasProductFilter =
        (promo.productIds && promo.productIds.length > 0) ||
        (promo.categoryIds && promo.categoryIds.length > 0) ||
        (promo.mainCategoryIds && promo.mainCategoryIds.length > 0) ||
        (promo.subCategoryIds && promo.subCategoryIds.length > 0);

      let calcSubtotal = 0;
      let calcEligibleSubtotal = 0;

      if (Array.isArray(cartContext.cartItems) && cartContext.cartItems.length > 0) {
        const itemProductIds = cartContext.cartItems.map((i: any) => String(i._id || i.productId || '')).filter(Boolean);
        const dbProducts = itemProductIds.length > 0
          ? await this.prisma.product.findMany({
              where: { id: { in: itemProductIds } },
              select: {
                id: true,
                mainCategoryId: true,
                categoryId: true,
                subCategoryId: true,
                price: true,
                variants: { select: { id: true, sku: true, price: true } },
              },
            })
          : [];
        const prodMap = new Map(dbProducts.map((p) => [p.id, p]));

        for (const item of cartContext.cartItems) {
          const pId = String(item._id || item.productId || '');
          const itemQty = Math.max(1, parseInt(String(item.quantity || 1), 10));
          if (isNaN(itemQty) || itemQty <= 0) continue;

          const dbP = prodMap.get(pId);
          let matchedVar: any = null;
          if (dbP && dbP.variants && dbP.variants.length > 0) {
            const targetVarId = item.variantId || item.variantKey || item.variant?._id || item.variant?.id;
            if (targetVarId) {
              matchedVar = dbP.variants.find((v: any) => v.id === targetVarId || v.sku === targetVarId || (v as any).purity === targetVarId);
            }
            if (!matchedVar && item.purity) {
              matchedVar = dbP.variants.find((v: any) => (v as any).purity === item.purity);
            }
            if (!matchedVar) {
              matchedVar = dbP.variants[0];
            }
          }

          let serverUnitPrice = 0;
          if (matchedVar && Number(matchedVar.price) > 0) {
            serverUnitPrice = Number(matchedVar.price);
          } else if (dbP && Number(dbP.price) > 0) {
            serverUnitPrice = Number(dbP.price);
          }

          const itemSub = serverUnitPrice * itemQty;
          calcSubtotal += itemSub;

          if (hasProductFilter) {
            const isProdMatch = promo.productIds && promo.productIds.includes(pId);
            const isCatMatch = dbP && promo.categoryIds && promo.categoryIds.includes(dbP.categoryId);
            const isMainCatMatch = dbP && promo.mainCategoryIds && promo.mainCategoryIds.includes(dbP.mainCategoryId);
            const isSubCatMatch = dbP && promo.subCategoryIds && promo.subCategoryIds.includes(dbP.subCategoryId);

            if (isProdMatch || isCatMatch || isMainCatMatch || isSubCatMatch) {
              calcEligibleSubtotal += itemSub;
            }
          } else {
            calcEligibleSubtotal += itemSub;
          }
        }
      } else if (typeof cartContext.subtotal === 'number') {
        calcSubtotal = cartContext.subtotal;
        calcEligibleSubtotal = cartContext.subtotal;
      }

      const effectiveSubtotal = hasProductFilter ? calcEligibleSubtotal : (calcSubtotal || cartContext.subtotal || 0);

      if (hasProductFilter && calcEligibleSubtotal <= 0) {
        return false;
      }

      if (effectiveSubtotal < Number(promo.minOrderAmount || 0)) {
        return false;
      }

      if (Number(promo.maxOrderAmount || 0) > 0 && effectiveSubtotal > Number(promo.maxOrderAmount)) {
        return false;
      }

      if (Array.isArray(promo.allowedPincodes) && promo.allowedPincodes.length > 0 && cartContext.pincode) {
        const cleanPincode = String(cartContext.pincode).trim();
        if (!promo.allowedPincodes.includes(cleanPincode)) {
          return false;
        }
      }
    }

    return true;
  }

  async getAvailablePromos(dto?: any, user?: any) {
    const activeRes = await this.getActivePromos(user);
    const activePromos = activeRes.data || [];

    const fullPromos = await this.prisma.promoCode.findMany({
      where: { id: { in: activePromos.map((p: any) => p.id) } },
    });
    const fullPromoMap = new Map(fullPromos.map((p) => [p.id, p]));

    const eligiblePromos: any[] = [];
    for (const publicPromo of activePromos) {
      const fullPromo = fullPromoMap.get(publicPromo.id);
      if (!fullPromo) continue;

      const isEligible = await this.evaluatePromoEligibility(fullPromo, user?.id, dto);
      if (isEligible) {
        eligiblePromos.push(publicPromo);
      }
    }

    return {
      success: true,
      data: eligiblePromos,
    };
  }

  async searchCustomers(query: string) {
    const q = (query || '').trim();
    const where = q.length >= 1 ? {
      OR: [
        { name: { contains: q, mode: 'insensitive' as const } },
        { email: { contains: q, mode: 'insensitive' as const } },
        { mobileNumber: { contains: q } },
      ],
    } : {};

    const users = await this.prisma.user.findMany({
      where,
      take: 20,
      orderBy: { createdAt: 'desc' },
    });

    return users.map(u => ({
      _id: u.id,
      id: u.id,
      name: u.name,
      fullName: u.name,
      email: u.email || '',
      phone: u.mobileNumber || '',
      mobile: u.mobileNumber || '',
      mobileNumber: u.mobileNumber || '',
    }));
  }
}

