import * as fs from 'fs';
import * as path from 'path';
import { Injectable, NotFoundException, BadRequestException, Logger, ForbiddenException, HttpException } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { generateObjectId } from '../../common/utils/object-id.util';
import { ShippingService } from '../shipping/shipping.service';
import { PromotionsService } from '../promotions/promotions.service';
import { PaymentsService } from '../payments/payments.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import { rollbackPromoUsageTx } from '../promotions/utils/promo-rollback.util';
import { RedisService } from '../../redis/redis.service';
import { calculateItemPricing } from '../../common/utils/pricing-engine.util';
import { restoreItemsStockTx } from './utils/inventory-restore.util';

const Decimal = Prisma.Decimal;

const INVENTORY_RELEASED_STATUSES = new Set([
  'CANCELLED',
  'RETURNED',
  'REFUNDED',
  'REFUND INITIATED',
  'REFUND_INITIATED',
  'PAYMENT_EXPIRED',
  'DELETED',
  'FAILED',
]);

export function isInventoryReleasedStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  return INVENTORY_RELEASED_STATUSES.has(status.trim().toUpperCase());
}

export function isInventoryHoldingStatus(status: string | null | undefined): boolean {
  if (!status) return true;
  return !isInventoryReleasedStatus(status);
}

export function attachCancellationDetails(order: any): any {
  if (!order) return order;

  if (order.orderStatus === 'Cancelled') {
    const cancelledHistory = Array.isArray(order.statusHistory) && order.statusHistory.length > 0
      ? [...order.statusHistory].reverse().find((h: any) => h.status === 'Cancelled')
      : null;

    let reason = order.failureReason || '';
    if (cancelledHistory && cancelledHistory.notes) {
      const extracted = cancelledHistory.notes.replace(/^Order cancelled.*Reason:\s*/i, '').trim();
      if (extracted) reason = extracted;
    }

    order.cancellationReason = reason || order.failureReason || 'Order cancelled';
    order.cancelledAt = cancelledHistory ? cancelledHistory.createdAt : (order.updatedAt || order.createdAt);
    order.cancelledBy = cancelledHistory ? (cancelledHistory.updatedBy || 'Admin') : 'Admin';
  }

  return order;
}


@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly shippingService: ShippingService,
    private readonly promotionsService: PromotionsService,
    private readonly paymentsService: PaymentsService,
    private readonly redisService: RedisService,
  ) {}

  private async invalidateDashboardCache(): Promise<void> {
    try {
      if (this.redisService) {
        await this.redisService.delete('dashboard:stats');
        await this.redisService.delete('payment:metrics');
      }
    } catch (err: any) {
      this.logger.warn(`Dashboard cache invalidation warning: ${err?.message}`);
    }
  }


  public buildOrdersWhere(query: OrderQueryDto): Prisma.OrderWhereInput {
    const {
      fromDate, toDate, customerName, customerType,
      orderStatus, paymentStatus, paymentMethod, gateway, courier,
      refundStatus, search, mobile, email
    } = query;

    const where: Prisma.OrderWhereInput = {};
    if (query.showDeleted === 'true' || query.includeDeleted === 'true') {
      where.isDeleted = true;
    } else if (query.includeAll !== 'true') {
      where.isDeleted = false;
    }

    if (orderStatus) {
      const statuses = Array.isArray(orderStatus)
        ? orderStatus
        : typeof orderStatus === 'string' && orderStatus.includes(',')
        ? orderStatus.split(',').map((s) => s.trim()).filter(Boolean)
        : [orderStatus];

      if (statuses.length > 1) {
        where.orderStatus = { in: statuses };
      } else if (statuses.length === 1) {
        where.orderStatus = { equals: statuses[0], mode: 'insensitive' };
      }
    }
    if (paymentStatus) {
      const pStatuses = Array.isArray(paymentStatus)
        ? paymentStatus
        : typeof paymentStatus === 'string' && paymentStatus.includes(',')
        ? paymentStatus.split(',').map((s) => s.trim()).filter(Boolean)
        : [paymentStatus];

      const expandedPStatuses: string[] = [];
      pStatuses.forEach((ps) => {
        const lower = ps.toLowerCase();
        if (lower === 'success' || lower === 'paid') {
          expandedPStatuses.push('Success', 'Paid', 'PAID', 'success', 'paid');
        } else {
          expandedPStatuses.push(ps);
        }
      });

      if (expandedPStatuses.length > 1) {
        where.paymentStatus = { in: expandedPStatuses };
      } else if (expandedPStatuses.length === 1) {
        where.paymentStatus = { equals: expandedPStatuses[0], mode: 'insensitive' };
      }
    }
    if (paymentMethod) {
      if (paymentMethod.toUpperCase() === 'COD') {
        where.paymentMethod = { in: ['COD', 'cod', 'Cash on Delivery', 'cash'] };
      } else {
        where.paymentMethod = { contains: paymentMethod, mode: 'insensitive' };
      }
    }
    if (gateway) {
      where.paymentGateway = { equals: gateway, mode: 'insensitive' };
    }
    if (courier) {
      where.courier = { is: { name: { contains: courier, mode: 'insensitive' } } };
    }
    if (customerType) where.customerType = customerType;
    if (refundStatus) where.refundStatus = refundStatus;

    if (customerName) {
      where.customerName = { contains: customerName, mode: 'insensitive' };
    }
    if (mobile) {
      where.mobile = { contains: mobile, mode: 'insensitive' };
    }
    if (email) {
      where.email = { contains: email, mode: 'insensitive' };
    }

    if (search && search.trim()) {
      const s = search.trim();
      where.OR = [
        { orderId: { contains: s, mode: 'insensitive' } },
        { orderNo: { contains: s, mode: 'insensitive' } },
        { invoiceNo: { contains: s, mode: 'insensitive' } },
        { customerName: { contains: s, mode: 'insensitive' } },
        { mobile: { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
      ];
    }

    if (fromDate || toDate) {
      if (fromDate && toDate) {
        const pFrom = new Date(fromDate);
        const pTo = new Date(toDate);
        if (!isNaN(pFrom.getTime()) && !isNaN(pTo.getTime()) && pFrom > pTo) {
          throw new BadRequestException('From Date cannot be greater than To Date.');
        }
      }
      const createdAtFilter: any = {};
      if (fromDate) {
        const parsedFrom = new Date(fromDate);
        if (!isNaN(parsedFrom.getTime())) {
          createdAtFilter.gte = parsedFrom;
        }
      }
      if (toDate) {
        const parsedTo = new Date(toDate);
        if (!isNaN(parsedTo.getTime())) {
          parsedTo.setHours(23, 59, 59, 999);
          createdAtFilter.lte = parsedTo;
        }
      }
      if (Object.keys(createdAtFilter).length > 0) {
        where.createdAt = createdAtFilter;
      }
    }

    return where;
  }

  public resolveOrderSort(sortBy?: string, sortOrder?: string): Prisma.OrderOrderByWithRelationInput | Prisma.OrderOrderByWithRelationInput[] {
    const defaultSort: Prisma.OrderOrderByWithRelationInput = { createdAt: 'desc' };
    if (!sortBy) return defaultSort;

    const normalized = sortBy.trim().toLowerCase();

    const sortMap: Record<string, Prisma.OrderOrderByWithRelationInput> = {
      newest: { createdAt: 'desc' },
      oldest: { createdAt: 'asc' },
      date_desc: { createdAt: 'desc' },
      date_asc: { createdAt: 'asc' },
      amount_high: { total: 'desc' },
      amount_low: { total: 'asc' },
      total_desc: { total: 'desc' },
      total_asc: { total: 'asc' },
      customer: { customerName: 'asc' },
      customer_asc: { customerName: 'asc' },
      customer_desc: { customerName: 'desc' },
      order_asc: { orderNo: 'asc' },
      order_desc: { orderNo: 'desc' },
      order_id_asc: { orderNo: 'asc' },
      order_id_desc: { orderNo: 'desc' },
      orderno_asc: { orderNo: 'asc' },
      orderno_desc: { orderNo: 'desc' },
      status_asc: { orderStatus: 'asc' },
      status_desc: { orderStatus: 'desc' },
    };

    if (sortMap[normalized]) {
      return sortMap[normalized];
    }

    if (sortOrder) {
      const dir: 'asc' | 'desc' = sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc';
      if (['createdat', 'date'].includes(normalized)) return { createdAt: dir };
      if (['total', 'amount'].includes(normalized)) return { total: dir };
      if (['orderno', 'orderid', 'order'].includes(normalized)) return { orderNo: dir };
      if (['customername', 'customer'].includes(normalized)) return { customerName: dir };
      if (['orderstatus', 'status'].includes(normalized)) return { orderStatus: dir };
    }

    return defaultSort;
  }

  async getAll(query: OrderQueryDto) {
    const { page = 1, limit = 10 } = query;
    const pageNum = parseInt(String(page), 10) || 1;
    const limitNum = parseInt(String(limit), 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    const where = this.buildOrdersWhere(query);
    const orderBy = this.resolveOrderSort(query.sortBy, query.sortOrder);

    const [total, orders] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        include: { items: true, paymentTimeline: { orderBy: { createdAt: 'desc' } }, statusHistory: true },
        orderBy,
        skip,
        take: limitNum,
      }),
    ]);

    orders.forEach(attachCancellationDetails);

    return {
      data: orders,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }

  async getById(id: string, requestingUserId?: string, requestingUserRole?: string) {
    const order = await this.prisma.order.findFirst({
      where: {
        OR: [{ id }, { orderId: id }, { orderNo: id }],
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                variants: true,
              },
            },
          },
        },
        paymentTimeline: { orderBy: { createdAt: 'desc' } },
        statusHistory: true,
        courier: true,
      },
    });
    if (!order) throw new NotFoundException({ message: 'Order not found' });

    if (requestingUserId && requestingUserRole !== 'admin' && requestingUserRole !== 'super admin') {
      const user = await this.prisma.user.findUnique({ where: { id: requestingUserId } });
      const mobile = user?.mobileNumber || user?.username || '';
      const email = user?.email || '';

      const isOwner =
        order.userId === requestingUserId ||
        (mobile && order.mobile === mobile) ||
        (email && order.email === email);

      if (!isOwner) {
        throw new ForbiddenException({ message: 'Access denied to this order.' });
      }
    }

    return attachCancellationDetails(order);
  }

  async getMyOrders(userId: string, query: OrderQueryDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return { data: [], total: 0 };

    const mobile = user.mobileNumber || user.username || '';
    const email = user.email || '';

    const where: any = {
      isDeleted: false,
      OR: [
        { userId: user.id },
        ...(mobile ? [{ mobile }] : []),
        ...(email ? [{ email }] : []),
      ],
    };

    const pageNum = parseInt(String(query.page || 1), 10);
    const limitNum = parseInt(String(query.limit || 10), 10);
    const skip = (pageNum - 1) * limitNum;

    const [total, orders] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        include: { items: true, statusHistory: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
    ]);

    orders.forEach(attachCancellationDetails);

    return {
      data: orders,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }

  // ================= CREATE ORDER WITH ZERO-TRUST PRICING & HISTORICAL SNAPSHOT =================
  async create(dto: CreateOrderDto, userId?: string) {
    const items = dto.items || [];
    if (items.length === 0) {
      throw new BadRequestException({ message: 'Order items array cannot be empty.' });
    }

    // 0. Idempotency Check - prevent duplicate order creation on retries
    if (dto.idempotencyKey || dto.orderId) {
      const key = dto.idempotencyKey || dto.orderId;
      const existing = await this.prisma.order.findFirst({
        where: {
          OR: [{ orderId: key }, { transactionId: key }],
        },
        include: { items: true },
      });
      if (existing) {
        this.logger.log(`Idempotent order request detected for key '${key}'. Returning existing order ${existing.orderId}.`);
        return existing;
      }
    }

    let customerName = dto.customerName || dto.customerInfo?.name || 'Customer';
    let mobile = dto.mobile || dto.customerInfo?.phone || '';
    let email = dto.email || dto.customerInfo?.email || '';

    if (userId) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user) {
        if (!customerName || customerName === 'Customer') customerName = user.name || 'Customer';
        if (!mobile) mobile = user.mobileNumber || user.username || '';
        if (!email) email = user.email || '';
      }
    }

    const targetAddress = dto.shippingAddress || dto.customerInfo || {
      pincode: '636010',
      state: 'TAMIL NADU',
      country: 'India',
    };

    let addressStr = dto.address;
    if (!addressStr && dto.customerInfo) {
      const c = dto.customerInfo;
      addressStr = `${c.address || ''}, ${c.city || ''}, ${c.state || ''} - ${c.pincode || ''}`;
    }

    let subtotal = 0;
    let totalGstAmount = 0;
    const orderItemsData: any[] = [];
    const stockUpdates: Array<{ variantId?: string; productId: string; productName: string; quantity: number }> = [];

    // 1. Zero-Trust Server Recalculation from PostgreSQL
    for (const item of items) {
      const targetProdId = item._id || item.productId;
      if (!targetProdId) throw new BadRequestException({ message: 'Product ID is missing on cart item.' });

      const dbProd = await this.prisma.product.findUnique({
        where: { id: targetProdId },
        include: { variants: true },
      });

      if (!dbProd) {
        throw new NotFoundException({ message: `Product '${targetProdId}' not found in catalog.` });
      }
      if (dbProd.status !== 'Active') {
        throw new BadRequestException({ message: `Product '${dbProd.name}' is no longer active.` });
      }

      let matchedVariant = null;
      if (item.variantId) {
        matchedVariant = dbProd.variants.find((v) => v.id === item.variantId);
      } else if (dbProd.variants.length > 0) {
        matchedVariant = dbProd.variants.find(
          (v: any) => (v.sku && item.sku && v.sku === item.sku) || (v.purity && item.selectedSize && v.purity === item.selectedSize)
        ) || dbProd.variants[0];
      }

      if (matchedVariant && matchedVariant.status === 'Inactive') {
        throw new BadRequestException({ message: `Variant for product '${dbProd.name}' is inactive.` });
      }

      const currentStock = matchedVariant ? Number(matchedVariant.stock || 0) : Number(dbProd.stock || 0);
      if (currentStock < item.quantity) {
        throw new BadRequestException({
          message: `Insufficient stock for product '${dbProd.name}'. Available: ${currentStock}, Requested: ${item.quantity}`,
        });
      }

      const pConfig = (matchedVariant as any)?.attributes?.pricingConfig || {};
      const pricing = calculateItemPricing({
        mrp: matchedVariant?.mrp ?? dbProd.price,
        offerPrice: matchedVariant?.offerPrice ?? matchedVariant?.price ?? dbProd.price,
        price: matchedVariant?.price ?? dbProd.price,
        discountType: pConfig.discountType,
        discountValue: pConfig.discountValue,
        gstRate: matchedVariant?.gst ?? 0,
        gstMode: (matchedVariant as any)?.gstMode ?? pConfig.gstMode ?? 'EXCLUSIVE',
        taxMode: (matchedVariant as any)?.taxMode ?? pConfig.taxMode ?? pConfig.gstType ?? 'CGST_SGST',
        quantity: item.quantity,
      });

      if (pricing.itemFinalPrice <= 0) {
        throw new BadRequestException({
          message: `Product '${dbProd.name}' lacks valid pricing configuration in PostgreSQL. Cannot proceed with order placement.`,
          errors: ['MISSING_PRICE_CONFIGURATION'],
        });
      }

      // Accumulate authoritative taxable subtotal and GST total
      subtotal += pricing.lineTaxableSubtotal;
      totalGstAmount += pricing.lineGstTotal;

      const grossWeight = Number((matchedVariant as any)?.grossWeight || (item as any).grossWeight || 0);
      const netWeight = Number((matchedVariant as any)?.netWeight || (item as any).netWeight || 0);
      const makingCharges = Number((matchedVariant as any)?.makingCharges || (item as any).makingCharges || 0);

      orderItemsData.push({
        id: generateObjectId(),
        productId: dbProd.id,
        productName: dbProd.name,
        productImage: dbProd.productImage || (dbProd.images && dbProd.images[0]) || '',
        variantId: matchedVariant ? matchedVariant.id : null,
        sku: item.sku || (matchedVariant ? matchedVariant.sku : '') || '',
        quantity: item.quantity,
        unitPrice: pricing.itemFinalPrice,
        totalPrice: pricing.lineTotal,
        attributes: {
          variantName: matchedVariant ? `${item.selectedSize || item.purity || 'Standard'}` : 'Standard',
          purity: item.selectedSize || item.purity || '',
          grossWeight,
          netWeight,
          makingCharges,
          mrp: pricing.mrp,
          discountAmount: pricing.discountAmount,
          offerPrice: pricing.offerPrice,
          price: pricing.itemFinalPrice,
          enableGst: pricing.gstRate > 0,
          gstRate: pricing.gstRate,
          gstMode: pricing.gstMode,
          taxMode: pricing.taxMode,
          gstType: pricing.taxMode === 'IGST' ? 'IGST' : 'CGST + SGST',
          taxableAmount: pricing.taxableAmount,
          cgstRate: pricing.taxMode === 'CGST_SGST' ? pricing.gstRate / 2 : 0,
          sgstRate: pricing.taxMode === 'CGST_SGST' ? pricing.gstRate / 2 : 0,
          cgstAmount: pricing.cgstAmount,
          sgstAmount: pricing.sgstAmount,
          igstAmount: pricing.igstAmount,
          gstAmount: pricing.gstAmount,
          gst: pricing.lineGstTotal,
          subtotal: pricing.lineTaxableSubtotal,
          itemTotal: pricing.lineTotal,
        },
      });

      if (matchedVariant) {
        stockUpdates.push({
          variantId: matchedVariant.id,
          productId: dbProd.id,
          productName: dbProd.name,
          quantity: item.quantity,
        });
      } else {
        stockUpdates.push({
          productId: dbProd.id,
          productName: dbProd.name,
          quantity: item.quantity,
        });
      }
    }

    // 2. Server-side Shipping & Promo Calculation
    const shippingCalc = await this.shippingService.calculateShipping({
      address: targetAddress,
      items: items.map((i) => ({
        productId: i._id || i.productId || '',
        variantId: i.variantId || null,
        quantity: i.quantity,
        sku: i.sku || '',
      })),
      paymentMethod: dto.paymentMethod || 'COD',
      deliveryType: dto.deliveryType || 'Standard',
    });

    if (shippingCalc.serviceable === false) {
      throw new BadRequestException({
        success: false,
        message: (shippingCalc as any).message || 'Delivery is not available for this destination address.',
        errors: (shippingCalc as any).errors || ['NON_SERVICEABLE'],
      });
    }

    let promoDiscount = 0;
    let promoSnapshot: any = null;
    let validPromoCode = '';

    if (dto.promoCode && dto.promoCode.trim()) {
      const valRes = await this.promotionsService.validatePromoCode(
        {
          code: dto.promoCode.trim(),
          subtotal,
          cartItems: items,
          paymentMethod: dto.paymentMethod,
          pincode: targetAddress?.pincode,
          userId,
          customerInfo: { email, phone: mobile, name: customerName, userId },
        },
        userId,
      );

      if (valRes.valid) {
        validPromoCode = valRes.promoCode;
        const rawDiscount = Number(valRes.discountAmount || 0);
        const verifiedDiscount = Math.min(
          Math.max(0, rawDiscount),
          subtotal,
          Number(valRes.eligibleSubtotal || subtotal)
        );
        promoDiscount = Math.round(verifiedDiscount * 100) / 100;
        promoSnapshot = valRes.promoSummary;
      }
    }

    const isOnline = Boolean(dto.paymentMethod && dto.paymentMethod.toUpperCase() !== 'COD');
    const shippingFee = shippingCalc.totalShipping || 0;
    const packagingFee = shippingCalc.packagingCharge || 0;
    const subtotalRounded = Math.round(subtotal * 100) / 100;
    const gstTotalRounded = Math.round(totalGstAmount * 100) / 100;
    const finalPayableAmount = Math.max(
      0,
      Math.round((subtotalRounded + gstTotalRounded + shippingFee + packagingFee - promoDiscount) * 100) / 100
    );

    const orderSeq = await this.prisma.getNextSequence('order', 1);
    const canonicalOrderFormatted = `CLIICKG-ORD-${String(orderSeq).padStart(6, '0')}`;
    const orderId = canonicalOrderFormatted;
    const orderNo = canonicalOrderFormatted;
    const paymentStatus = 'Pending';
    const initialOrderStatus = isOnline ? 'PENDING_PAYMENT' : 'Received';

    // Invalidate any previous un-paid PENDING_PAYMENT order for this customer/session
    const wherePending: any = {
      orderStatus: 'PENDING_PAYMENT',
      paymentStatus: { in: ['Pending', 'Initiated', 'Failed', 'Cancelled'] },
      OR: [
        ...(userId ? [{ userId }] : []),
        ...(mobile ? [{ mobile }] : []),
        ...(email ? [{ email }] : []),
      ],
    };
    try {
      const staleOrders = await this.prisma.order.findMany({
        where: wherePending,
        include: { items: true },
      });

      for (const staleOrder of staleOrders) {
        await this.prisma.$transaction(async (tx) => {
          const updateRes = tx.order.updateMany
            ? await tx.order.updateMany({
                where: {
                  id: staleOrder.id,
                  orderStatus: 'PENDING_PAYMENT',
                },
                data: {
                  orderStatus: 'PAYMENT_EXPIRED',
                  paymentStatus: 'EXPIRED',
                  failureReason: 'Superceded by new checkout attempt',
                },
              })
            : await tx.order.update({
                where: { id: staleOrder.id },
                data: {
                  orderStatus: 'PAYMENT_EXPIRED',
                  paymentStatus: 'EXPIRED',
                  failureReason: 'Superceded by new checkout attempt',
                },
              });

          if (updateRes && (updateRes as any).count === 0) {
            return;
          }

          await this.restoreItemsStockTx(tx, staleOrder.items);
          await rollbackPromoUsageTx(tx, staleOrder.id, this.logger);
          await tx.orderPaymentTimeline.create({
            data: {
              id: generateObjectId(),
              orderId: staleOrder.id,
              event: 'PAYMENT_SUPERSEDED',
              status: 'EXPIRED',
              amount: Number(staleOrder.total),
              gateway: staleOrder.paymentGateway || 'razorpay',
              payload: { reason: 'Superceded by new checkout attempt' },
            },
          });
        });
        this.logger.log(`[Checkout] Invalidated stale PENDING_PAYMENT order ${staleOrder.orderId} and restored stock.`);
      }
    } catch (staleErr: any) {
      this.logger.warn(`[Checkout] Non-critical error clearing stale pending orders: ${staleErr.message}`);
    }

    const orderEntityId = generateObjectId();

    // 3. Atomic Prisma Transaction (Stock Decrement + Promo Usage + Cart Clear + Order Creation)
    const createdOrder = await this.prisma.$transaction(async (tx) => {
      // A. Atomic Stock Decrement Verification
      for (const update of stockUpdates) {
        if (update.variantId) {
          const res = await tx.productVariant.updateMany({
            where: {
              id: update.variantId,
              stock: { gte: update.quantity },
            },
            data: {
              stock: { decrement: update.quantity },
            },
          });
          if (res.count !== 1) {
            throw new BadRequestException({
              message: `Insufficient stock for product '${update.productName}'.`,
            });
          }
        } else {
          const res = await tx.product.updateMany({
            where: {
              id: update.productId,
              stock: { gte: update.quantity },
            },
            data: {
              stock: { decrement: update.quantity },
            },
          });
          if (res.count !== 1) {
            throw new BadRequestException({
              message: `Insufficient stock for product '${update.productName}'.`,
            });
          }
        }
      }

      // B. SPEC-03: Atomically check per-user limit & increment promo usedCount & create PromoUsage redemption record inside transaction
      if (validPromoCode && promoSnapshot) {
        // 1. Acquire pessimistic row-level lock on target PromoCode row BEFORE per-user count check
        await tx.$queryRaw`SELECT id FROM "promocodes" WHERE id = ${promoSnapshot.id} FOR UPDATE`;

        if (userId && promoSnapshot.perUserLimit > 0) {
          const userUsageCount = await tx.promoUsage.count({
            where: {
              promoCodeId: promoSnapshot.id,
              userId,
            },
          });

          if (userUsageCount >= promoSnapshot.perUserLimit) {
            throw new BadRequestException({
              message: `You have already redeemed Promo Code '${validPromoCode}' maximum allowed times.`,
              reasonCode: 'PROMO_USER_LIMIT_REACHED',
            });
          }
        }

        if (promoSnapshot.usageLimit > 0) {
          const res = await tx.promoCode.updateMany({
            where: {
              id: promoSnapshot.id,
              usedCount: { lt: promoSnapshot.usageLimit },
            },
            data: {
              usedCount: { increment: 1 },
            },
          });
          if (res.count !== 1) {
            throw new BadRequestException({
              message: `Promo Code '${validPromoCode}' usage limit has been reached.`,
              reasonCode: 'PROMO_USAGE_LIMIT_REACHED',
            });
          }
        } else {
          await tx.promoCode.update({
            where: { id: promoSnapshot.id },
            data: { usedCount: { increment: 1 } },
          });
        }
      }

      // C. Create Order record in PostgreSQL first (satisfying FK constraints)
      const newOrder = await tx.order.create({
        data: {
          id: orderEntityId,
          orderId,
          orderNo,
          userId: userId || null,
          customerName,
          mobile,
          email,
          address: addressStr || '',
          paymentMethod: dto.paymentMethod ,
          paymentStatus,
          orderStatus: initialOrderStatus,
          invoiceStatus: 'Pending',
          total: finalPayableAmount,
          subtotal: subtotalRounded,
          shippingFee,
          packagingFee,
          gstTotal: gstTotalRounded,
          promoCode: validPromoCode,
          promoDiscount,
          promotionSnapshot: promoSnapshot ? JSON.parse(JSON.stringify(promoSnapshot)) : undefined,
          shippingSnapshot: shippingCalc.snapshot ? JSON.parse(JSON.stringify(shippingCalc.snapshot)) : undefined,
          transactionId: dto.idempotencyKey || '',
          items: {
            create: orderItemsData.map((oi) => ({
              id: oi.id,
              productId: oi.productId,
              productName: oi.productName,
              productImage: oi.productImage,
              variantId: oi.variantId,
              sku: oi.sku,
              quantity: oi.quantity,
              unitPrice: oi.unitPrice,
              totalPrice: oi.totalPrice,
              attributes: oi.attributes,
            })),
          },
          statusHistory: {
            create: [
              {
                id: generateObjectId(),
                status: initialOrderStatus,
                notes: isOnline ? 'Order initialized. Pending online payment.' : 'Order created via Web API.',
                updatedBy: customerName,
              },
            ],
          },
          shipmentTimeline: {
            create: [
              {
                id: generateObjectId(),
                status: 'Shipment Created',
                notes: `Shipment registered. Estimated Delivery: ${new Date(shippingCalc.estimatedDeliveryDate).toLocaleDateString()}`,
              },
            ],
          },
        },
        include: { items: true },
      });

      // D. SPEC-03: Create PromoUsage redemption record linked to created order
      if (validPromoCode && promoSnapshot) {
        await tx.promoUsage.create({
          data: {
            id: generateObjectId(),
            promoCodeId: promoSnapshot.id,
            userId: userId || null,
            orderId: newOrder.id,
            discountAmount: promoDiscount,
          },
        });
      }

      // E. Clear Cart ONLY for COD orders (Online payment clears cart after payment verification)
      if (userId && !isOnline) {
        const userCart = await tx.cart.findFirst({ where: { userId } });
        if (userCart) {
          await tx.cartItem.deleteMany({ where: { cartId: userCart.id } });
        }
      }

      return newOrder;
    });

    await this.invalidateDashboardCache();
    return createdOrder;
  }

  private async restoreItemsStockTx(tx: any, items: any[]): Promise<void> {
    return restoreItemsStockTx(tx, items, this.logger);
  }

  async updateStatus(id: string, orderStatus: string, notes?: string, updatedBy?: string, reason?: string) {
    const existing = await this.getById(id);
    const historyId = generateObjectId();

    if (orderStatus === 'Cancelled') {
      const trimmedReason = (reason || notes || '').trim();
      if (!trimmedReason) {
        throw new BadRequestException({ message: 'Cancellation reason is required when cancelling an order.' });
      }
    }

    const ALLOWED_TRANSITIONS: Record<string, string[]> = {
      PENDING_PAYMENT: ['Received', 'PAYMENT_EXPIRED', 'Cancelled', 'FAILED'],
      Received: ['Processing', 'Cancelled'],
      Processing: ['Shipped', 'Cancelled'],
      Shipped: ['Delivered', 'Cancelled'],
      Delivered: ['Return Requested'],
      'Return Requested': ['Returned', 'Delivered', 'Cancelled'],
      Returned: ['Refund Initiated'],
      'Refund Initiated': ['Refunded', 'Cancelled'],
      Refunded: [],
      Cancelled: ['Refund Initiated'],
      PAYMENT_EXPIRED: ['Cancelled'],
      FAILED: ['Cancelled'],
      DELETED: [],
    };

    let shouldDispatchRefund = false;
    let refundTargetOrderId = '';

    const trimmedReason = (reason || notes || '').trim();

    const updated = await this.prisma.$transaction(async (tx) => {
      const currentOrder = await tx.order.findUnique({
        where: { id: existing.id },
        include: { items: true },
      });

      if (!currentOrder) {
        throw new NotFoundException({ message: 'Order not found' });
      }

      if (currentOrder.orderStatus !== orderStatus) {
        const allowedNext = ALLOWED_TRANSITIONS[currentOrder.orderStatus];
        if (allowedNext && !allowedNext.includes(orderStatus)) {
          throw new BadRequestException({
            message: `Invalid status transition from '${currentOrder.orderStatus}' to '${orderStatus}'.`,
          });
        }
      }

      const wasHolding = isInventoryHoldingStatus(currentOrder.orderStatus);
      const isTargetReleased = isInventoryReleasedStatus(orderStatus);

      if (wasHolding && isTargetReleased) {
        await this.restoreItemsStockTx(tx, currentOrder.items);
        await rollbackPromoUsageTx(tx, currentOrder.id, this.logger);
      }

      const isReturnRejection = currentOrder.orderStatus === 'Return Requested' && orderStatus === 'Delivered';
      const historyNotes = notes || (
        orderStatus === 'Cancelled'
          ? `Order cancelled by admin. Reason: ${trimmedReason}`
          : isReturnRejection
            ? `Return request rejected by admin. Order status reverted to Delivered.`
            : `Order status updated to ${orderStatus}`
      );

      const updateData: any = {
        orderStatus,
        statusHistory: {
          create: [
            {
              id: historyId,
              status: orderStatus,
              notes: historyNotes,
              updatedBy: updatedBy || 'Admin',
            },
          ],
        },
      };

      if (isReturnRejection) {
        updateData.returnStatus = 'REJECTED';
        if (currentOrder.refundStatus === 'Pending') {
          updateData.refundStatus = 'None';
        }
        await tx.returnRequest.updateMany({
          where: { orderId: currentOrder.id },
          data: {
            status: 'REJECTED',
            refundStatus: 'None',
          },
        });
      }

      if (orderStatus === 'Cancelled') {
        if (currentOrder.paymentStatus === 'Paid') {
          updateData.refundStatus = 'Pending';
        }
      } else if (orderStatus === 'Refund Initiated') {
        updateData.refundStatus = 'Initiated';
        updateData.paymentStatus = 'Refund Initiated';
        updateData.paymentTimeline = {
          create: [
            {
              id: generateObjectId(),
              event: 'REFUND_INITIATED',
              status: 'REFUND_INITIATED',
              amount: String(currentOrder.total),
              gateway: currentOrder.paymentGateway || 'razorpay',
              payload: { notes: trimmedReason || 'Refund process initiated by Admin', updatedBy: updatedBy || 'Admin' },
            },
          ],
        };
      } else if (orderStatus === 'Refunded') {
        updateData.refundStatus = 'Refunded';
        updateData.paymentStatus = 'Refunded';
        updateData.paymentTimeline = {
          create: [
            {
              id: generateObjectId(),
              event: 'REFUND_COMPLETED',
              status: 'REFUNDED',
              amount: String(currentOrder.total),
              gateway: currentOrder.paymentGateway || 'razorpay',
              payload: { notes: trimmedReason || 'Refund completed by Admin', updatedBy: updatedBy || 'Admin' },
            },
          ],
        };
      }

      const txUpdated = await tx.order.update({
        where: { id: currentOrder.id },
        data: updateData,
        include: { items: true, statusHistory: true },
      });

      refundTargetOrderId = currentOrder.id;
      if ((orderStatus === 'Refund Initiated' || orderStatus === 'Refunded') && ['Paid', 'Success', 'PAID'].includes(currentOrder.paymentStatus)) {
        shouldDispatchRefund = true;
      }

      return txUpdated;
    });

    // Outer database transaction has COMMITTED successfully.
    // DEF-ORD-001: Trigger automated Razorpay refund call OUTSIDE the Prisma transaction boundary
    if (shouldDispatchRefund && refundTargetOrderId) {
      try {
        await this.paymentsService.processOrderRefund(
          { orderId: refundTargetOrderId, reason: trimmedReason },
          updatedBy,
          'admin',
        );
      } catch (rfErr: any) {
        this.logger.warn(`[Automated Refund] Triggered from status change to '${orderStatus}' encountered: ${rfErr.message}`);
      }
    }

    await this.invalidateDashboardCache();
    return attachCancellationDetails(updated);
  }

  async updatePaymentStatus(id: string, paymentStatus: string, updatedBy?: string) {
    const order = await this.getById(id);
    const updated = await this.prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus,
        paymentTimeline: {
          create: [
            {
              id: generateObjectId(),
              event: 'PAYMENT_STATUS_UPDATED',
              status: paymentStatus.toUpperCase(),
              amount: String(order.total),
              gateway: order.paymentGateway || 'COD',
              payload: { updatedBy: updatedBy || 'Admin', paymentStatus },
            },
          ],
        },
      },
    });
    await this.invalidateDashboardCache();
    return updated;
  }

  async cancelOrder(id: string, reason?: string, userId?: string) {
    const trimmedReason = (reason || '').trim();
    if (!trimmedReason) {
      throw new BadRequestException({ message: 'Cancellation reason is required.' });
    }

    const order = await this.getById(id, userId);
    const nonCancellable = ['Shipped', 'Delivered', 'Cancelled', 'Returned', 'Refund Initiated', 'Refunded'];

    if (nonCancellable.includes(order.orderStatus)) {
      throw new BadRequestException({ message: `Cannot cancel order in '${order.orderStatus}' status.` });
    }

    return this.prisma.$transaction(async (tx) => {
      const currentOrder = await tx.order.findUnique({
        where: { id: order.id },
        include: { items: true },
      });

      if (!currentOrder) {
        throw new NotFoundException({ message: 'Order not found' });
      }

      if (nonCancellable.includes(currentOrder.orderStatus)) {
        throw new BadRequestException({ message: `Cannot cancel order in '${currentOrder.orderStatus}' status.` });
      }

      const isHolding = isInventoryHoldingStatus(currentOrder.orderStatus);
      if (isHolding) {
        await this.restoreItemsStockTx(tx, currentOrder.items);
        await rollbackPromoUsageTx(tx, currentOrder.id, this.logger);
      }

      const updated = await tx.order.update({
        where: { id: currentOrder.id },
        data: {
          orderStatus: 'Cancelled',
          refundStatus: currentOrder.paymentStatus === 'Paid' ? 'Pending' : 'None',
          statusHistory: {
            create: [
              {
                id: generateObjectId(),
                status: 'Cancelled',
                notes: `Order cancelled by customer. Reason: ${trimmedReason}`,
                updatedBy: 'Customer',
              },
            ],
          },
        },
        include: { items: true, statusHistory: true },
      });
      await this.invalidateDashboardCache();
      return attachCancellationDetails(updated);
    });
  }

  async requestReturn(id: string, reason: string, comments?: string, userId?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true, returnRequest: true },
    });

    if (!order) {
      throw new NotFoundException({ message: 'Order not found' });
    }

    if (userId) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      const mobile = user?.mobileNumber || user?.username || '';
      const email = user?.email || '';

      const isOwner =
        order.userId === userId ||
        (mobile && order.mobile === mobile) ||
        (email && order.email === email);

      if (!isOwner) {
        throw new ForbiddenException({ message: 'You can only request returns for your own orders.' });
      }
    }

    const eligibleStatuses = ['Delivered'];
    if (!eligibleStatuses.includes(order.orderStatus)) {
      throw new BadRequestException({
        message: `Return requests are only allowed for delivered orders. Current status: '${order.orderStatus}'.`,
      });
    }

    if (order.returnRequest || (order.returnStatus && order.returnStatus !== 'NONE')) {
      throw new BadRequestException({ message: 'A return request has already been submitted for this order.' });
    }

    const returnRequestId = generateObjectId();
    const isPaid = order.paymentStatus === 'Paid' || order.paymentStatus === 'Success';
    const refundStatus = isPaid ? 'Pending' : 'None';

    const [returnRequest, updatedOrder] = await this.prisma.$transaction([
      this.prisma.returnRequest.create({
        data: {
          id: returnRequestId,
          orderId: order.id,
          userId: userId || order.userId || generateObjectId(),
          reason,
          comments: comments || '',
          status: 'REQUESTED',
          refundStatus,
        },
      }),
      this.prisma.order.update({
        where: { id },
        data: {
          returnReason: reason,
          returnStatus: 'REQUESTED',
          returnRequestedAt: new Date(),
          refundStatus,
          statusHistory: {
            create: [
              {
                id: generateObjectId(),
                status: 'Return Requested',
                notes: `Return requested by customer. Reason: ${reason}. Comments: ${comments || 'None'}`,
                updatedBy: 'Customer',
              },
            ],
          },
        },
        include: { items: true, returnRequest: true },
      }),
    ]);

    await this.invalidateDashboardCache();

    return {
      success: true,
      message: 'Return request submitted successfully',
      returnRequest,
      order: updatedOrder,
    };
  }

  async getReturnStatus(id: string, userId?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { returnRequest: true },
    });

    if (!order) {
      throw new NotFoundException({ message: 'Order not found' });
    }

    if (userId) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      const mobile = user?.mobileNumber || user?.username || '';
      const email = user?.email || '';

      const isOwner =
        order.userId === userId ||
        (mobile && order.mobile === mobile) ||
        (email && order.email === email);

      if (!isOwner) {
        throw new ForbiddenException({ message: 'Access denied.' });
      }
    }

    return {
      returnRequested: Boolean(order.returnRequest || (order.returnStatus && order.returnStatus !== 'NONE')),
      returnStatus: order.returnStatus || order.returnRequest?.status || 'NONE',
      returnReason: order.returnReason || order.returnRequest?.reason || '',
      returnRequest: order.returnRequest,
    };
  }

  async delete(id: string, adminUserId?: string) {
    const order = await this.prisma.order.findFirst({
      where: {
        OR: [{ id }, { orderId: id }, { orderNo: id }],
      },
    });

    if (!order) {
      throw new NotFoundException({ success: false, message: 'Order not found' });
    }

    // Perform Soft Delete inside transaction: restore stock if order was inventory-holding, then update metadata
    const updated = await this.prisma.$transaction(async (tx) => {
      const currentOrder = await tx.order.findUnique({
        where: { id: order.id },
        include: { items: true },
      });

      if (!currentOrder) {
        throw new NotFoundException({ success: false, message: 'Order not found' });
      }

      const wasHolding = isInventoryHoldingStatus(currentOrder.orderStatus);

      if (wasHolding && !currentOrder.isDeleted) {
        await this.restoreItemsStockTx(tx, currentOrder.items);
        await rollbackPromoUsageTx(tx, currentOrder.id, this.logger);
      }

      return tx.order.update({
        where: { id: currentOrder.id },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: adminUserId || 'admin',
          orderStatus: 'DELETED',
        },
      });
    });

    await this.prisma.orderPaymentTimeline.create({
      data: {
        id: generateObjectId(),
        orderId: order.id,
        event: 'ORDER_SOFT_DELETED',
        status: 'DELETED',
        amount: Number(order.total),
        gateway: order.paymentGateway || 'N/A',
        payload: { deletedBy: adminUserId || 'admin', deletedAt: new Date() },
      },
    });

    await this.invalidateDashboardCache();

    this.logger.log(`[Soft Delete] Order ${order.orderId} soft-deleted by ${adminUserId || 'admin'}.`);
    return {
      success: true,
      message: `Order #${order.orderNo || order.orderId} soft deleted successfully.`,
      data: updated,
    };
  }

  async generateInvoicePdf(id: string, requestingUserId?: string, requestingUserRole?: string, res?: any) {
    try {
      const order = await this.prisma.order.findFirst({
        where: { OR: [{ id }, { orderId: id }, { orderNo: id }] },
        include: { items: true },
      });

      if (!order) {
        throw new NotFoundException({ message: 'Order not found' });
      }

      if (requestingUserId && requestingUserRole !== 'admin' && requestingUserRole !== 'super admin') {
        const user = await this.prisma.user.findUnique({ where: { id: requestingUserId } });
        const mobile = user?.mobileNumber || user?.username || '';
        const email = user?.email || '';

        const isOwner =
          order.userId === requestingUserId ||
          (mobile && order.mobile === mobile) ||
          (email && order.email === email);

        if (!isOwner) {
          throw new ForbiddenException({ message: 'Access denied to this order invoice.' });
        }
      }

      let user = null;
      if (requestingUserId) {
        user = await this.prisma.user.findUnique({ where: { id: requestingUserId } }).catch(() => null);
      }

      const orderNum = order.orderNo || order.orderId || id;
      const filename = `invoice-${orderNum}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      const PDFDoc = typeof PDFDocument === 'function' ? PDFDocument : ((PDFDocument as any)?.default || require('pdfkit'));
      const doc = new PDFDoc({ size: 'A4', margin: 50 });
      doc.pipe(res);

    // --- Header & Logo ---
    const logoPath = path.join(process.cwd(), 'src/assets/logo.jpg');
    const fallbackLogoPath = path.join(__dirname, '../../assets/logo.jpg');
    const finalLogoPath = fs.existsSync(logoPath) ? logoPath : (fs.existsSync(fallbackLogoPath) ? fallbackLogoPath : null);

    if (finalLogoPath) {
      try {
        doc.image(finalLogoPath, 50, 32, { width: 110 });
      } catch {
        doc.fillColor('#059669').fontSize(22).font('Helvetica-Bold').text('CLIICKG', 50, 45);
      }
    } else {
      doc.fillColor('#059669').fontSize(22).font('Helvetica-Bold').text('CLIICKG', 50, 45);
    }

    doc.fillColor('#0F172A').fontSize(16).font('Helvetica-Bold').text('TAX INVOICE', 400, 35, { align: 'right' });
    doc.fillColor('#475569').fontSize(9).font('Helvetica').text(`Invoice #: ${order.invoiceNo || orderNum}`, 400, 55, { align: 'right' });
    doc.text(`Order #: ${orderNum}`, 400, 68, { align: 'right' });
    doc.text(`Date: ${order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN') : 'N/A'}`, 400, 81, { align: 'right' });

    doc.moveTo(50, 110).lineTo(545, 110).strokeColor('#E2E8F0').lineWidth(1).stroke();

    // --- Customer & Delivery Info ---
    doc.fillColor('#0F172A').fontSize(10).font('Helvetica-Bold').text('Billed & Shipped To:', 50, 125);
    doc.fillColor('#334155').fontSize(9).font('Helvetica');
    const custName = order.customerName || user?.name || 'Valued Customer';
    doc.text(custName, 50, 140);
    if (order.mobile) doc.text(`Phone: +91 ${order.mobile}`, 50, 153);
    if (order.email) doc.text(`Email: ${order.email}`, 50, 166);

    const addr = (order.shippingAddress as any) || {};
    if (addr.addressLine1 || addr.address || addr.city) {
      const line1 = addr.addressLine1 || addr.address || '';
      const line2 = addr.addressLine2 || '';
      const cityState = [addr.city, addr.state].filter(Boolean).join(', ');
      const pin = addr.pincode ? ` - ${addr.pincode}` : '';
      if (line1) doc.text(`${line1}${line2 ? ', ' + line2 : ''}`, 50, 179);
      if (cityState || pin) doc.text(`${cityState}${pin}`, 50, 192);
    }

    // Payment details column
    doc.fillColor('#0F172A').fontSize(10).font('Helvetica-Bold').text('Payment Information:', 340, 125);
    doc.fillColor('#334155').fontSize(9).font('Helvetica');
    doc.text(`Payment Method: ${order.paymentMethod || 'COD'}`, 340, 140);
    doc.text(`Payment Status: ${order.paymentStatus || 'Pending'}`, 340, 153);
    doc.text(`Order Status: ${order.orderStatus || 'Processing'}`, 340, 166);

    doc.moveTo(50, 215).lineTo(545, 215).strokeColor('#CBD5E1').lineWidth(1).stroke();

    // --- Table Header ---
    let y = 230;
    doc.fillColor('#1E293B').fontSize(9).font('Helvetica-Bold');
    doc.text('Item Description', 50, y);
    doc.text('Size/Variant', 270, y);
    doc.text('Qty', 365, y, { width: 35, align: 'center' });
    doc.text('Unit Price (Rs.)', 410, y, { width: 65, align: 'right' });
    doc.text('Total (Rs.)', 480, y, { width: 65, align: 'right' });

    y += 18;
    doc.moveTo(50, y).lineTo(545, y).strokeColor('#E2E8F0').lineWidth(0.5).stroke();

    // --- Table Rows ---
    y += 10;
    doc.font('Helvetica').fontSize(9).fillColor('#334155');

    const items = order.items || [];
    items.forEach((item: any) => {
      const name = item.productName || item.name || 'Item';

      const rawSize = String(
        item.attributes?.variantName ||
        item.attributes?.purity ||
        item.selectedSize ||
        item.variant ||
        item.variantName ||
        ''
      ).trim();
      const isHexOrUuid = /^[0-9a-fA-F]{16,}$/.test(rawSize) || /^[0-9a-fA-F-]{24,}$/.test(rawSize);
      const size = (!rawSize || isHexOrUuid) ? (item.attributes?.purity || 'Standard') : rawSize;

      const qty = item.quantity || 1;
      const price = Number(item.unitPrice || item.price || 0);
      const total = Number(item.totalPrice || (price * qty));

      doc.text(name, 50, y, { width: 210 });
      doc.text(size, 270, y, { width: 90 });
      doc.text(String(qty), 365, y, { width: 35, align: 'center' });
      doc.text(price.toLocaleString('en-IN'), 410, y, { width: 65, align: 'right' });
      doc.text(total.toLocaleString('en-IN'), 480, y, { width: 65, align: 'right' });

      y += 22;
    });

    doc.moveTo(50, y).lineTo(545, y).strokeColor('#CBD5E1').lineWidth(1).stroke();

    // --- Totals Summary ---
    y += 15;
    const subtotal = Number(order.subtotal || order.total || 0);
    const discount = Number(order.promoDiscount || (order as any).discount || 0);
    const shippingFee = Number(order.shippingFee || 0);
    const gstTotal = Number(order.gstTotal || 0);
    const grandTotal = Number(order.total || 0);

    doc.font('Helvetica').fontSize(9).fillColor('#475569');
    doc.text('Subtotal:', 360, y, { width: 90, align: 'right' });
    doc.text(`Rs. ${subtotal.toLocaleString('en-IN')}`, 455, y, { width: 90, align: 'right' });

    if (discount > 0) {
      y += 15;
      doc.text('Discount:', 360, y, { width: 90, align: 'right' });
      doc.text(`- Rs. ${discount.toLocaleString('en-IN')}`, 455, y, { width: 90, align: 'right' });
    }

    y += 15;
    doc.text('Shipping:', 360, y, { width: 90, align: 'right' });
    doc.text(shippingFee === 0 ? 'FREE' : `Rs. ${shippingFee.toLocaleString('en-IN')}`, 455, y, { width: 90, align: 'right' });

    if (gstTotal > 0) {
      y += 15;
      doc.text('GST (Tax):', 360, y, { width: 90, align: 'right' });
      doc.text(`Rs. ${gstTotal.toLocaleString('en-IN')}`, 455, y, { width: 90, align: 'right' });
    }

    y += 18;
    doc.moveTo(360, y).lineTo(545, y).strokeColor('#059669').lineWidth(1.5).stroke();

    y += 8;
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#059669');
    doc.text('Grand Total:', 360, y, { width: 90, align: 'right' });
    doc.text(`Rs. ${grandTotal.toLocaleString('en-IN')}`, 455, y, { width: 90, align: 'right' });

    // --- Footer ---
    doc.fontSize(8).font('Helvetica-Oblique').fillColor('#94A3B8');
    doc.text('Thank you for ordering with CLIICKG. Fast Home Delivery Marketplace.', 50, 750, { align: 'center' });
    doc.text('This is a computer-generated invoice and requires no physical signature.', 50, 765, { align: 'center' });

    doc.end();
    } catch (err: any) {
      if (err instanceof HttpException) {
        throw err;
      }
      this.logger.error(`Error generating invoice PDF for order ${id}: ${err.message}`, err.stack);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'Failed to generate invoice PDF', error: err.message });
      }
    }
  }

  async getPaymentErrors() {
    return this.prisma.order.findMany({
      where: {
        OR: [
          { paymentStatus: 'Failed' },
          { paymentStatus: 'CANCELLED' },
          { paymentStatus: 'FAILED' }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getAuditLogs() {
    return this.prisma.order.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 50,
      select: {
        id: true,
        orderId: true,
        orderStatus: true,
        paymentStatus: true,
        updatedAt: true,
        createdAt: true,
        customerName: true,
      }
    });
  }

  async updateCourier(id: string, dto: any, updatedBy?: string) {
    const order = await this.prisma.order.findFirst({
      where: { OR: [{ id }, { orderId: id }, { orderNo: id }] },
      include: { items: true },
    });
    if (!order) throw new NotFoundException({ message: 'Order not found' });

    // 1. Terminal State Protection
    const INVALID_DISPATCH_STATES = ['CANCELLED', 'REFUNDED', 'RETURNED', 'REFUND INITIATED', 'FAILED'];
    if (INVALID_DISPATCH_STATES.includes((order.orderStatus || '').toUpperCase())) {
      throw new BadRequestException({
        message: `Cannot dispatch courier for an order in '${order.orderStatus}' state.`,
      });
    }

    // 2. Product Ownership & Quantity Validation
    let targetItem: any = null;
    if (dto.productId) {
      targetItem = order.items.find(
        (i) => i.id === dto.productId || i.productId === dto.productId || i.sku === dto.productId,
      );
      if (!targetItem) {
        throw new BadRequestException({
          message: `Product ID '${dto.productId}' does not belong to this order.`,
        });
      }
    } else if (order.items.length > 0) {
      targetItem = order.items[0];
    }

    // Validate sendingQuantity if provided
    let finalSendingQty = 1;
    if (dto.sendingQuantity !== undefined && dto.sendingQuantity !== null) {
      const parsedQty = parseInt(String(dto.sendingQuantity), 10);
      if (isNaN(parsedQty) || parsedQty < 1) {
        throw new BadRequestException({ message: 'Sending quantity must be a valid positive integer.' });
      }
      if (targetItem && parsedQty > targetItem.quantity) {
        throw new BadRequestException({
          message: `Sending quantity (${parsedQty}) exceeds ordered item quantity (${targetItem.quantity}).`,
        });
      }
      finalSendingQty = parsedQty;
    } else if (targetItem) {
      finalSendingQty = targetItem.quantity || 1;
    }

    // 3. Validate Tracking Number / AWB
    const trackingNumberStr = (dto.trackingNumber || '').trim();
    if (!trackingNumberStr) {
      throw new BadRequestException({ message: 'Tracking ID / AWB number is required for dispatch.' });
    }

    // 4. Validate & Link Courier from CourierMaster
    let courier: any = null;
    const targetCourierKey = dto.courierId || dto.courierName || dto.courierCode;

    if (targetCourierKey) {
      courier = await this.prisma.courierMaster.findFirst({
        where: {
          OR: [
            { id: String(targetCourierKey) },
            { code: { equals: String(targetCourierKey).toLowerCase(), mode: 'insensitive' } },
            { name: { equals: String(targetCourierKey), mode: 'insensitive' } },
          ],
        },
      });

      if (dto.courierId && !courier) {
        throw new BadRequestException({ message: `Courier with ID '${dto.courierId}' not found in Courier Master.` });
      }
      if (courier && courier.status !== 'Active') {
        throw new BadRequestException({ message: `Courier Partner '${courier.name}' is currently inactive.` });
      }
    }

    const existingSnapshot = typeof order.shippingSnapshot === 'object' && order.shippingSnapshot ? (order.shippingSnapshot as any) : {};
    const courierNameStr = courier?.name || dto.courierName || existingSnapshot.courierName || 'Standard Courier';
    const courierCodeStr = courier?.code || dto.courierCode || existingSnapshot.courierCode || '';
    
    let trackingUrlStr = dto.trackingUrl || existingSnapshot.trackingUrl || '';
    if (courier?.trackingUrlTemplate && trackingNumberStr) {
      trackingUrlStr = courier.trackingUrlTemplate
        .replace('{{trackingNumber}}', trackingNumberStr)
        .replace('{tracking}', trackingNumberStr);
    }

    // 5. Transaction Safety: Atomic update of Order + OrderShipmentTimeline + OrderStatusHistory
    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          orderStatus: 'Shipped',
          courierId: courier?.id || order.courierId || null,
          shippingSnapshot: {
            ...existingSnapshot,
            courierId: courier?.id || order.courierId || null,
            courierName: courierNameStr,
            courierCode: courierCodeStr,
            trackingNumber: trackingNumberStr,
            trackingUrl: trackingUrlStr,
            dispatchDate: dto.dispatchDate || new Date().toISOString(),
            expectedDelivery: dto.expectedDelivery || existingSnapshot.expectedDelivery || null,
            notes: dto.notes || existingSnapshot.notes || '',
            receiptImage: dto.receiptImage || existingSnapshot.receiptImage || '',
            productId: targetItem?.id || targetItem?.productId || dto.productId || null,
            productName: targetItem?.productName || dto.productName || 'Item',
            sendingQuantity: finalSendingQty,
          },
        },
        include: { courier: true, items: true },
      });

      await tx.orderShipmentTimeline.create({
        data: {
          id: generateObjectId(),
          orderId: order.id,
          status: 'Shipped',
          location: courierNameStr || 'Dispatch Hub',
          notes: `Dispatched via ${courierNameStr} - Tracking/AWB: ${trackingNumberStr}. Qty: ${finalSendingQty}. ${dto.notes || ''}`,
        },
      });

      if (order.orderStatus !== 'Shipped') {
        await tx.orderStatusHistory.create({
          data: {
            id: generateObjectId(),
            orderId: order.id,
            status: 'Shipped',
            notes: `Order status updated to Shipped via Courier Dispatch (${courierNameStr} / AWB: ${trackingNumberStr})`,
            updatedBy: updatedBy || 'Admin',
          },
        });
      }

      return updatedOrder;
    });

    return {
      success: true,
      message: 'Courier dispatch details updated successfully',
      data: updated,
    };
  }

  async deleteCourier(id: string) {
    const order = await this.prisma.order.findFirst({
      where: { OR: [{ id }, { orderId: id }, { orderNo: id }] },
    });
    if (!order) throw new NotFoundException({ message: 'Order not found' });

    const existingSnapshot = typeof order.shippingSnapshot === 'object' && order.shippingSnapshot ? (order.shippingSnapshot as any) : {};
    delete existingSnapshot.courierId;
    delete existingSnapshot.courierName;
    delete existingSnapshot.trackingNumber;
    delete existingSnapshot.trackingUrl;
    delete existingSnapshot.productId;
    delete existingSnapshot.productName;
    delete existingSnapshot.sendingQuantity;

    const updated = await this.prisma.$transaction(async (tx) => {
      const res = await tx.order.update({
        where: { id: order.id },
        data: {
          courierId: null,
          shippingSnapshot: existingSnapshot,
        },
        include: { courier: true, items: true },
      });

      await tx.orderShipmentTimeline.deleteMany({
        where: { orderId: order.id, status: { in: ['Shipped', 'Dispatched'] } },
      });

      return res;
    });

    return {
      success: true,
      message: 'Courier dispatch details reset successfully',
      data: updated,
    };
  }
}
