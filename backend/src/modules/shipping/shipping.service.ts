import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { generateObjectId } from '../../common/utils/object-id.util';
import { CalculateShippingDto } from './dto/calculate-shipping.dto';
import { CreateDeliveryZoneDto } from './dto/create-delivery-zone.dto';
import { UpdateDeliveryZoneDto } from './dto/update-delivery-zone.dto';
import { CreateCourierDto } from './dto/create-courier.dto';
import { UpdateCourierDto } from './dto/update-courier.dto';
import { CreatePackagingDto } from './dto/create-packaging.dto';
import { UpdatePackagingDto } from './dto/update-packaging.dto';

@Injectable()
export class ShippingService {
  private readonly logger = new Logger(ShippingService.name);

  constructor(private readonly prisma: PrismaService) { }

  // =========================================================================
  // 1. AUTHORITATIVE SHIPPING CALCULATION (ZERO-TRUST SERVER RECALCULATION)
  // =========================================================================
  // 1. AUTHORITATIVE SHIPPING CALCULATION (ZERO-TRUST SERVER RECALCULATION)
  // =========================================================================
  async calculateShipping(dto: CalculateShippingDto) {
    const { address, packagingRuleId, paymentMethod = 'Online', deliveryType = 'Standard' } = dto;
    const rawItems = dto.items || (dto as any).cartItems || [];
    const items = Array.isArray(rawItems) ? rawItems : [];
    const pincode = String(address?.pincode || '').trim();
    const state = address?.state ? String(address.state).trim().toUpperCase() : '';
    const reqDeliveryType = (deliveryType || 'Standard').trim();

    // Step 1 — Validate Pincode Format
    if (!pincode || !/^\d{6}$/.test(pincode)) {
      throw new BadRequestException({
        success: false,
        message: 'Valid 6-digit postal pincode is required for shipping calculation.',
        errors: ['INVALID_PINCODE'],
      });
    }

    // Step 2 — PINCODE SERVICEABILITY: UNIFIED AUTHORITATIVE PRECEDENCE ALGORITHM
    // STEP 2A PRECEDENCE: Explicit Exclusive Pincode Exclusion on Delivery Zone
    const excludedZone = await this.prisma.deliveryZone.findFirst({
      where: {
        status: 'Active',
        isDeleted: false,
        exclusivePincodes: { has: pincode },
      },
    });

    if (excludedZone) {
      return {
        serviceable: false,
        reason: 'NON_SERVICEABLE',
        totalShipping: 0,
        shippingCharge: 0,
        packagingCharge: 0,
        estimatedDeliveryDays: null,
        estimatedDeliveryDate: null,
        message: `Delivery to pincode '${pincode}' is restricted (Excluded Zone Pincode).`,
        errors: ['EXCLUSIVE_PINCODE_EXCLUDED'],
      };
    }

    // STEP 2B PRECEDENCE: Exact Pincode Match (Highest Priority First)
    let selectedZone: any = null;
    const pincodeMatchingZones = await this.prisma.deliveryZone.findMany({
      where: {
        status: 'Active',
        isDeleted: false,
        serviceable: true,
        pincodes: { has: pincode },
      },
      include: {
        chargeRules: { where: { status: 'Active', isDeleted: false } },
      },
      orderBy: { priority: 'desc' },
    });

    if (pincodeMatchingZones.length > 0) {
      selectedZone = pincodeMatchingZones[0];
    } else if (state) {
      // STEP 2C PRECEDENCE: State Fallback (Highest Priority First)
      const stateMatchingZones = await this.prisma.deliveryZone.findMany({
        where: {
          status: 'Active',
          isDeleted: false,
          serviceable: true,
          states: { has: state },
        },
        include: {
          chargeRules: { where: { status: 'Active', isDeleted: false } },
        },
        orderBy: { priority: 'desc' },
      });

      if (stateMatchingZones.length > 0) {
        selectedZone = stateMatchingZones[0];
      }
    }

    // STEP 2D PRECEDENCE: No Zone Match -> Non-serviceable
    if (!selectedZone) {
      return {
        serviceable: false,
        reason: 'NON_SERVICEABLE',
        totalShipping: 0,
        shippingCharge: 0,
        packagingCharge: 0,
        estimatedDeliveryDays: null,
        estimatedDeliveryDate: null,
        message: `Pincode '${pincode}' is non-serviceable. No delivery zone configured.`,
        errors: ['NON_SERVICEABLE'],
      };
    }

    // Step 3 — Load Authoritative Cart Data & Gross Weight from PostgreSQL
    let cartGrossWeightKg = 0;
    let cartSubtotal = 0;
    let totalQuantity = 0;
    const itemDetails: any[] = [];

    if (items.length > 0) {
      const productIds = Array.from(new Set(items.map((i) => i.productId || i._id).filter(Boolean))) as string[];
      const dbProducts = await this.prisma.product.findMany({
        where: { id: { in: productIds }, isDeleted: false },
        include: { variants: true },
      });
      const productMap = new Map(dbProducts.map((p) => [p.id, p]));

      for (const item of items) {
        const prodId = item.productId || item._id;
        const qty = Math.max(1, Number(item.quantity || 1));
        totalQuantity += qty;

        const dbProd = prodId ? productMap.get(prodId) : null;

        let matchedVariant = null;
        if (dbProd) {
          if (item.variantId) {
            matchedVariant = dbProd.variants.find((v) => v.id === item.variantId);
          } else if (dbProd.variants.length > 0) {
            matchedVariant = dbProd.variants.find((v) => v.sku && item.sku && v.sku === item.sku) || dbProd.variants[0];
          }
        }

        const unitPrice = matchedVariant && Number(matchedVariant.price) > 0
          ? Number(matchedVariant.price)
          : Number(dbProd?.price || item.price || item.sellingPrice || 0);

        cartSubtotal += unitPrice * qty;

        // Weight Calculation:
        // Prioritize item weight in payload, then variant weight, then product weight, fallback to 0.5kg
        const rawWeight = Number(
          item.grossWeight || item.grossWeightKg || item.weight || (matchedVariant as any)?.grossWeight || (dbProd as any)?.grossWeight || 0.5
        );

        // Convert Grams to Kg if > 50 (e.g., 500g -> 0.5 Kg)
        const itemWeightKg = rawWeight > 50 ? rawWeight / 1000 : rawWeight;

        cartGrossWeightKg += itemWeightKg * qty;

        itemDetails.push({
          productId: prodId || null,
          productName: dbProd?.name || item.name || item.productName || 'Product',
          variantId: matchedVariant?.id || item.variantId || null,
          quantity: qty,
          unitPrice,
          grossWeightKg: itemWeightKg,
          safetyCharacteristic: (dbProd as any)?.safetyCharacteristic || 'NORMAL',
        });
      }
    }

    // Step 4 — Resolve Single Authoritative Delivery Charge Rule (FLAT, PER_KG, PER_ITEM)
    let baseShippingFee = 0;
    let appliedPricingMethod = 'FLAT';
    let chargeRuleApplied: any = null;
    let matchedRule: any = null;

    let activeRules: any[] = selectedZone.chargeRules || [];

    if (activeRules.length === 0) {
      activeRules = await this.prisma.deliveryChargeRule.findMany({
        where: { status: 'Active', isDeleted: false, zoneId: null },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (activeRules.length > 0) {
      // Find rule matching weight range or quantity range
      matchedRule = activeRules.find((r) => {
        let minW = Number(r.minWeight || 0);
        let maxW = Number(r.maxWeight || 0);
        let minQ = Number(r.minQuantity || 0);
        let maxQ = Number(r.maxQuantity || 0);

        if (minW > 50) minW = minW / 1000;
        if (maxW > 50) maxW = maxW / 1000;

        const weightMatch = cartGrossWeightKg >= minW && (maxW === 0 || cartGrossWeightKg <= maxW);
        const qtyMatch = totalQuantity >= minQ && (maxQ === 0 || totalQuantity <= maxQ);
        return weightMatch && qtyMatch;
      }) || activeRules[0];

      appliedPricingMethod = String(matchedRule.pricingMethod || 'FLAT').toUpperCase();
      const baseCharge = Number(matchedRule.baseCharge || 0);
      const perKgCharge = Number(matchedRule.perKgCharge || 0);
      const perItemCharge = Number(matchedRule.perItemCharge || 0);

      switch (appliedPricingMethod) {
        case 'PER_KG':
        case 'WEIGHT':
          baseShippingFee = baseCharge + (cartGrossWeightKg * perKgCharge);
          break;
        case 'PER_ITEM':
        case 'ITEM':
        case 'QUANTITY':
          baseShippingFee = baseCharge + (totalQuantity * perItemCharge);
          break;
        case 'FLAT':
        default:
          baseShippingFee = baseCharge;
          break;
      }

      chargeRuleApplied = {
        id: matchedRule.id,
        name: matchedRule.name,
        pricingMethod: appliedPricingMethod,
        baseCharge,
        perKgCharge,
        perItemCharge,
        deliveryTypes: matchedRule.deliveryTypes || null,
      };
    }

    // Step 5 — Free Shipping Threshold Check (from ShippingSetting)
    const shippingSetting = await this.prisma.shippingSetting.findFirst();
    const globalFreeMin = Number(shippingSetting?.freeShippingMinAmount || 0);
    let freeShippingApplied = false;

    if (globalFreeMin > 0 && cartSubtotal >= globalFreeMin) {
      freeShippingApplied = true;
      baseShippingFee = 0;
    }

    // Step 6 — DELIVERY TYPE SURCHARGE EVALUATION
    let deliveryTypeSurcharge = 0;
    let selectedDeliveryDays = selectedZone.estimatedDeliveryDays > 0 ? selectedZone.estimatedDeliveryDays : 3;

    const rawDeliveryTypes = matchedRule?.deliveryTypes
      ? (typeof matchedRule.deliveryTypes === 'string' ? JSON.parse(matchedRule.deliveryTypes) : matchedRule.deliveryTypes)
      : null;

    if (rawDeliveryTypes && typeof rawDeliveryTypes === 'object') {
      const typeConfig = rawDeliveryTypes[reqDeliveryType] || rawDeliveryTypes[reqDeliveryType.replace(/\s+/g, '')];

      if (typeConfig) {
        if (typeConfig.enabled === false && reqDeliveryType !== 'Standard') {
          throw new BadRequestException({
            success: false,
            message: `Delivery option '${reqDeliveryType}' is not supported or enabled for pincode '${pincode}'.`,
            errors: ['DELIVERY_TYPE_DISABLED'],
          });
        }
        deliveryTypeSurcharge = Number(typeConfig.additionalCharge || typeConfig.baseCharge || 0);
        if (typeConfig.estimatedDays !== undefined && Number(typeConfig.estimatedDays) >= 0) {
          selectedDeliveryDays = Number(typeConfig.estimatedDays);
        }
      }
    }

    const calculatedShippingFee = Math.max(0, baseShippingFee + deliveryTypeSurcharge);

    // Build Available Delivery Types Map for Frontend UI (Only enabled options)
    const availableDeliveryTypesMap: Record<string, any> = {};
    const standardTypes = ['Standard', 'Express', 'SameDay', 'NextDay', 'Scheduled'];
    for (const t of standardTypes) {
      const cfg = rawDeliveryTypes?.[t] || rawDeliveryTypes?.[t.replace(/\s+/g, '')];
      const isEnabled = cfg ? Boolean(cfg.enabled !== false) : (t === 'Standard' || t === 'Express');
      if (!isEnabled) continue; // Exclude disabled delivery types

      const addCharge = Number(cfg?.additionalCharge || (t === 'Express' ? 150 : 0));
      const typeBaseFee = freeShippingApplied ? 0 : baseShippingFee;
      const totalTypeCost = Math.max(0, typeBaseFee + addCharge);

      const defaultDays = t === 'SameDay' ? 0 : t === 'NextDay' ? 1 : t === 'Express' ? 1 : selectedDeliveryDays;
      const estDays = cfg?.estimatedDays !== undefined && cfg.estimatedDays !== null ? Number(cfg.estimatedDays) : defaultDays;

      availableDeliveryTypesMap[t] = {
        enabled: true,
        baseCharge: typeBaseFee,
        additionalCharge: addCharge,
        totalShippingCost: totalTypeCost,
        estimatedDays: estDays,
        estimatedDeliveryDays: estDays,
        handlingFee: 0,
        packingFee: 0,
        insuranceFee: 0,
        codCharge: 0,
        fuelSurcharge: 0,
        remoteAreaCharge: 0,
        rainCharge: 0,
        peakSeasonCharge: 0,
        packagingCharge: 0,
        gst: 0,
      };
    }

    if (Object.keys(availableDeliveryTypesMap).length === 0) {
      availableDeliveryTypesMap['Standard'] = {
        enabled: true,
        baseCharge: freeShippingApplied ? 0 : baseShippingFee,
        additionalCharge: 0,
        totalShippingCost: freeShippingApplied ? 0 : baseShippingFee,
        estimatedDays: selectedDeliveryDays,
        handlingFee: 0, packingFee: 0, insuranceFee: 0, codCharge: 0, fuelSurcharge: 0, remoteAreaCharge: 0, rainCharge: 0, peakSeasonCharge: 0, packagingCharge: 0, gst: 0
      };
    }

    // Step 7 — Optional Packaging Rule Validation
    let packagingCharge = 0;
    let selectedPackagingDetails: any = null;

    if (packagingRuleId) {
      const packagingRule = await this.prisma.packagingRule.findFirst({
        where: { id: packagingRuleId, isDeleted: false },
      });

      if (!packagingRule || packagingRule.status !== 'Active') {
        throw new BadRequestException({
          success: false,
          message: 'Selected packaging rule is invalid or inactive.',
          errors: ['PACKAGING_INACTIVE'],
        });
      }

      const baseAmount = Number(packagingRule.charge || 0);
      const gstRate = Number(packagingRule.gstRate ?? 18);
      const gstAmount = baseAmount * (gstRate / 100);
      packagingCharge = baseAmount + gstAmount;

      selectedPackagingDetails = {
        id: packagingRule.id,
        name: packagingRule.name,
        boxSize: packagingRule.boxSize,
        baseAmount,
        gstRate,
        gstAmount,
        charge: packagingCharge,
      };
    }

    const totalShipping = calculatedShippingFee;
    const totalOrderShippingAndPackaging = totalShipping + packagingCharge;

    // Step 8 — Estimated Delivery Date
    const estimatedDeliveryDate = new Date(Date.now() + selectedDeliveryDays * 24 * 60 * 60 * 1000).toISOString();

    // Step 9 — Build Immutable Snapshot
    const snapshot = {
      calculatedAt: new Date().toISOString(),
      pincode,
      zone: {
        id: selectedZone.id,
        name: selectedZone.name,
        code: selectedZone.code,
        priority: selectedZone.priority,
      },
      shipping: {
        pricingMethod: appliedPricingMethod,
        billableWeightKg: cartGrossWeightKg,
        quantity: totalQuantity,
        baseCharge: baseShippingFee,
        deliveryType: reqDeliveryType,
        deliveryTypeSurcharge,
        charge: totalShipping,
      },
      packaging: selectedPackagingDetails,
      chargeRuleApplied,
      freeShippingApplied,
      totalShipping,
      packagingCharge,
      totalShippingAndPackaging: totalOrderShippingAndPackaging,
      estimatedDeliveryDays: selectedDeliveryDays,
      estimatedDeliveryDate,
    };

    return {
      serviceable: true,
      zone: {
        id: selectedZone.id,
        name: selectedZone.name,
        code: selectedZone.code,
        priority: selectedZone.priority,
      },
      shipping: {
        pricingMethod: appliedPricingMethod,
        billableWeight: cartGrossWeightKg,
        quantity: totalQuantity,
        deliveryType: reqDeliveryType,
        baseCharge: baseShippingFee,
        deliveryTypeSurcharge,
        charge: totalShipping,
      },
      packaging: {
        selected: selectedPackagingDetails?.name || null,
        ruleId: packagingRuleId || null,
        charge: packagingCharge,
      },
      deliveryTypes: availableDeliveryTypesMap,
      totalShipping,
      shippingCharge: totalShipping,
      packagingCharge,
      estimatedDeliveryDays: selectedDeliveryDays,
      estimatedDeliveryDate,
      snapshot,
    };
  }

  // =========================================================================
  // 2. SHIPPING DASHBOARD STATISTICS (REAL DB DATA)
  // =========================================================================
  async getDashboardStats() {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      totalZones,
      totalCouriers,
      activeCouriers,
      activeRules,
      activePackagingRules,
      internationalZonesCount,
      zonesList,
      todayOrdersCount,
      avgShippingFeeRaw,
      pendingShipmentsCount,
      deliveredTodayCount,
      failedDeliveriesCount,
      restrictedOrdersCount,
      codOrdersCount,
    ] = await Promise.all([
      this.prisma.deliveryZone.count({ where: { isDeleted: false } }),
      this.prisma.courierMaster.count({ where: { isDeleted: false } }),
      this.prisma.courierMaster.count({ where: { status: 'Active', isDeleted: false } }),
      this.prisma.deliveryChargeRule.count({ where: { status: 'Active', isDeleted: false } }),
      this.prisma.packagingRule.count({ where: { status: 'Active', isDeleted: false } }),
      this.prisma.deliveryZone.count({ where: { type: 'International', isDeleted: false } }),
      this.prisma.deliveryZone.findMany({ where: { isDeleted: false }, select: { pincodes: true, exclusivePincodes: true, serviceable: true } }),
      this.prisma.order.count({ where: { createdAt: { gte: startOfToday }, isDeleted: false } }),
      this.prisma.order.aggregate({ where: { isDeleted: false }, _avg: { shippingFee: true } }),
      this.prisma.order.count({ where: { isDeleted: false, orderStatus: { in: ['Received', 'Processing', 'Pending', 'Packed'] } } }),
      this.prisma.order.count({ where: { isDeleted: false, orderStatus: 'Delivered', updatedAt: { gte: startOfToday } } }),
      this.prisma.order.count({ where: { isDeleted: false, orderStatus: { in: ['Returned', 'RTO', 'Failed'] } } }),
      this.prisma.order.count({ where: { isDeleted: false, orderStatus: { in: ['Cancelled', 'Restricted'] } } }),
      this.prisma.order.count({ where: { isDeleted: false, paymentMethod: 'COD' } }),
    ]);

    let totalServiceablePincodes = 0;
    let totalExclusivePincodes = 0;
    let codZonesCount = 0;

    zonesList.forEach((z) => {
      totalServiceablePincodes += (z.pincodes || []).length;
      totalExclusivePincodes += (z.exclusivePincodes || []).length;
      if (z.serviceable) codZonesCount++;
    });

    const avgShippingCharge = avgShippingFeeRaw?._avg?.shippingFee
      ? Number(avgShippingFeeRaw._avg.shippingFee).toFixed(2)
      : '0.00';

    return {
      totalZones,
      totalCouriers,
      activeCouriers,
      activeRules,
      activePackagingRules,
      internationalZonesCount,
      codZonesCount,
      serviceablePincodesCount: totalServiceablePincodes,
      restrictedPincodesCount: totalExclusivePincodes,
      exclusivePincodesCount: totalExclusivePincodes,
      todayOrders: todayOrdersCount,
      avgShippingCharge,
      pendingShipments: pendingShipmentsCount,
      deliveredToday: deliveredTodayCount,
      failedDeliveries: failedDeliveriesCount,
      restrictedOrders: restrictedOrdersCount,
      codOrders: codOrdersCount,
    };
  }

  // =========================================================================
  // 3. DELIVERY ZONES CRUD
  // =========================================================================
  async getDeliveryZones() {
    const zones = await this.prisma.deliveryZone.findMany({
      where: { isDeleted: false },
      include: { chargeRules: { where: { isDeleted: false } } },
      orderBy: { priority: 'desc' },
    });
    return zones.map((z) => ({
      ...z,
      _id: z.id,
      zoneName: z.name,
      zoneType: z.type,
      state: z.states.join(', '),
      pincodes: z.pincodes || [],
      exclusivePincodes: z.exclusivePincodes || [],
    }));
  }

  async createDeliveryZone(dto: any) {
    const zoneName = dto.name || dto.zoneName || 'Delivery Zone';
    const zoneCode = dto.code
      ? dto.code.trim().toUpperCase()
      : (zoneName.toUpperCase().replace(/[^A-Z0-9]/g, '_') + '_' + Date.now().toString().slice(-4));

    const parsePincodes = (val: any): string[] => {
      if (Array.isArray(val)) return val.map((p) => String(p).trim()).filter(Boolean);
      if (typeof val === 'string' && val.trim()) return val.split(',').map((p) => p.trim()).filter(Boolean);
      return [];
    };

    const parseStates = (val: any): string[] => {
      if (Array.isArray(val)) return val.map((s) => String(s).trim().toUpperCase()).filter(Boolean);
      if (typeof val === 'string' && val.trim()) return val.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
      return [];
    };

    const created = await this.prisma.deliveryZone.create({
      data: {
        id: generateObjectId(),
        name: zoneName,
        code: zoneCode,
        type: dto.zoneType || dto.type || 'Domestic',
        country: dto.country || 'India',
        states: parseStates(dto.states || dto.state),
        district: dto.district || '',
        pincodes: parsePincodes(dto.pincodes),
        exclusivePincodes: parsePincodes(dto.exclusivePincodes),
        priority: Number(dto.priority || 0),
        description: dto.description || '',
        serviceable: dto.serviceable !== false,
        estimatedDeliveryDays: Number(dto.estimatedDeliveryDays || 3),
        status: dto.status || 'Active',
      },
    });

    return {
      ...created,
      _id: created.id,
      zoneName: created.name,
      zoneType: created.type,
      state: created.states.join(', '),
    };
  }

  async updateDeliveryZone(id: string, dto: any) {
    const zone = await this.prisma.deliveryZone.findFirst({ where: { id, isDeleted: false } });
    if (!zone) throw new NotFoundException(`Delivery Zone with ID '${id}' not found`);

    const parsePincodes = (val: any): string[] => {
      if (Array.isArray(val)) return val.map((p) => String(p).trim()).filter(Boolean);
      if (typeof val === 'string' && val.trim()) return val.split(',').map((p) => p.trim()).filter(Boolean);
      return [];
    };

    const parseStates = (val: any): string[] => {
      if (Array.isArray(val)) return val.map((s) => String(s).trim().toUpperCase()).filter(Boolean);
      if (typeof val === 'string' && val.trim()) return val.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
      return [];
    };

    const updated = await this.prisma.deliveryZone.update({
      where: { id },
      data: {
        ...(dto.name || dto.zoneName ? { name: dto.name || dto.zoneName } : {}),
        ...(dto.code && { code: dto.code.trim().toUpperCase() }),
        ...(dto.zoneType || dto.type ? { type: dto.zoneType || dto.type } : {}),
        ...(dto.country !== undefined && { country: dto.country }),
        ...(dto.states !== undefined || dto.state !== undefined ? { states: parseStates(dto.states || dto.state) } : {}),
        ...(dto.district !== undefined && { district: dto.district }),
        ...(dto.pincodes !== undefined && { pincodes: parsePincodes(dto.pincodes) }),
        ...(dto.exclusivePincodes !== undefined && { exclusivePincodes: parsePincodes(dto.exclusivePincodes) }),
        ...(dto.priority !== undefined && { priority: Number(dto.priority || 0) }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.serviceable !== undefined && { serviceable: Boolean(dto.serviceable) }),
        ...(dto.estimatedDeliveryDays !== undefined && { estimatedDeliveryDays: Number(dto.estimatedDeliveryDays || 3) }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
    });

    return {
      ...updated,
      _id: updated.id,
      zoneName: updated.name,
      state: updated.states.join(', '),
    };
  }

  async toggleDeliveryZoneStatus(id: string) {
    const zone = await this.prisma.deliveryZone.findFirst({ where: { id, isDeleted: false } });
    if (!zone) throw new NotFoundException(`Delivery Zone with ID '${id}' not found`);

    const nextStatus = zone.status === 'Active' ? 'Inactive' : 'Active';
    return this.prisma.deliveryZone.update({
      where: { id },
      data: { status: nextStatus },
    });
  }

  async deleteDeliveryZone(id: string, adminUserId?: string) {
    const zone = await this.prisma.deliveryZone.findFirst({ where: { id, isDeleted: false } });
    if (!zone) throw new NotFoundException(`Delivery Zone with ID '${id}' not found`);

    const newCode = zone.code.includes('_DELETED_')
      ? zone.code
      : `${zone.code}_DELETED_${Date.now()}`;

    await this.prisma.deliveryZone.update({
      where: { id },
      data: {
        isDeleted: true,
        status: 'Deleted',
        deletedAt: new Date(),
        deletedBy: adminUserId || 'admin',
        code: newCode,
      },
    });
    return { message: `Delivery zone '${zone.name}' deleted successfully`, id };
  }

  // =========================================================================
  // 4. DELIVERY CHARGES CRUD (SUPPORTING FLAT, PER_KG, PER_ITEM)
  // =========================================================================
  async getDeliveryCharges() {
    const rules = await this.prisma.deliveryChargeRule.findMany({
      where: { isDeleted: false },
      include: { zone: true },
      orderBy: { createdAt: 'desc' },
    });
    return rules.map((r) => ({
      ...r,
      _id: r.id,
      baseCharge: Number(r.baseCharge || 0),
      perKgCharge: Number(r.perKgCharge || 0),
      perItemCharge: Number(r.perItemCharge || 0),
      minWeight: Number(r.minWeight || 0),
      maxWeight: Number(r.maxWeight || 0),
      minQuantity: Number(r.minQuantity || 0),
      maxQuantity: Number(r.maxQuantity || 0),
      deliveryTypes: typeof r.deliveryTypes === 'string' ? JSON.parse(r.deliveryTypes) : (r.deliveryTypes || null),
    }));
  }

  async createDeliveryCharge(dto: any) {
    const pricingMethod = (dto.pricingMethod || 'FLAT').toUpperCase();
    const created = await this.prisma.deliveryChargeRule.create({
      data: {
        id: generateObjectId(),
        name: dto.name || 'Delivery Charge Rule',
        zoneId: dto.zoneId || null,
        pricingMethod,
        baseCharge: Number(dto.baseCharge || 0),
        perKgCharge: Number(dto.perKgCharge || 0),
        perItemCharge: Number(dto.perItemCharge || 0),
        minWeight: Number(dto.minWeight || 0),
        maxWeight: Number(dto.maxWeight || 0),
        minQuantity: Number(dto.minQuantity || 0),
        maxQuantity: Number(dto.maxQuantity || 0),
        deliveryTypes: dto.deliveryTypes !== undefined ? dto.deliveryTypes : null,
        status: dto.status || 'Active',
      },
      include: { zone: true },
    });
    return {
      ...created,
      _id: created.id,
      deliveryTypes: typeof created.deliveryTypes === 'string' ? JSON.parse(created.deliveryTypes) : (created.deliveryTypes || null),
    };
  }

  async updateDeliveryCharge(id: string, dto: any) {
    const rule = await this.prisma.deliveryChargeRule.findFirst({ where: { id, isDeleted: false } });
    if (!rule) throw new NotFoundException(`Delivery Charge Rule with ID '${id}' not found`);

    const updated = await this.prisma.deliveryChargeRule.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.zoneId !== undefined && { zoneId: dto.zoneId || null }),
        ...(dto.pricingMethod && { pricingMethod: dto.pricingMethod.toUpperCase() }),
        ...(dto.baseCharge !== undefined && { baseCharge: Number(dto.baseCharge || 0) }),
        ...(dto.perKgCharge !== undefined && { perKgCharge: Number(dto.perKgCharge || 0) }),
        ...(dto.perItemCharge !== undefined && { perItemCharge: Number(dto.perItemCharge || 0) }),
        ...(dto.minWeight !== undefined && { minWeight: Number(dto.minWeight || 0) }),
        ...(dto.maxWeight !== undefined && { maxWeight: Number(dto.maxWeight || 0) }),
        ...(dto.minQuantity !== undefined && { minQuantity: Number(dto.minQuantity || 0) }),
        ...(dto.maxQuantity !== undefined && { maxQuantity: Number(dto.maxQuantity || 0) }),
        ...(dto.deliveryTypes !== undefined && { deliveryTypes: dto.deliveryTypes }),
        ...(dto.status && { status: dto.status }),
      },
      include: { zone: true },
    });
    return {
      ...updated,
      _id: updated.id,
      deliveryTypes: typeof updated.deliveryTypes === 'string' ? JSON.parse(updated.deliveryTypes) : (updated.deliveryTypes || null),
    };
  }

  async deleteDeliveryCharge(id: string, adminUserId?: string) {
    const rule = await this.prisma.deliveryChargeRule.findFirst({ where: { id, isDeleted: false } });
    if (!rule) throw new NotFoundException(`Delivery Charge Rule with ID '${id}' not found`);

    await this.prisma.deliveryChargeRule.update({
      where: { id },
      data: {
        isDeleted: true,
        status: 'Deleted',
        deletedAt: new Date(),
        deletedBy: adminUserId || 'admin',
      },
    });
    return { message: `Delivery Charge Rule '${rule.name}' deleted successfully`, id };
  }

  // =========================================================================
  // 5. COURIER MASTER CRUD
  // =========================================================================
  async getCouriers() {
    const couriers = await this.prisma.courierMaster.findMany({
      where: { isDeleted: false },
      orderBy: { createdAt: 'desc' },
    });
    return couriers.map((c) => ({
      ...c,
      _id: c.id,
      courierName: c.name,
      courierCode: c.code ? c.code.toUpperCase() : '',
    }));
  }

  async createCourier(dto: any) {
    const name = dto.courierName || dto.name || '';
    const code = (dto.courierCode || dto.code || '').trim().toLowerCase();

    const created = await this.prisma.courierMaster.create({
      data: {
        id: generateObjectId(),
        name,
        code,
        logo: dto.logo || '',
        website: dto.website || '',
        trackingUrlTemplate: dto.trackingUrlTemplate || '',
        supportedStates: Array.isArray(dto.supportedStates) ? dto.supportedStates.join(', ') : (dto.supportedStates || ''),
        supportedCountries: Array.isArray(dto.supportedCountries) ? dto.supportedCountries.join(', ') : (dto.supportedCountries || 'India'),
        maxWeight: Number(dto.maxWeight || 0),
        codAvailable: dto.codAvailable !== false,
        trackingAvailable: dto.trackingAvailable !== false,
        status: dto.status || 'Active',
      },
    });

    return {
      ...created,
      _id: created.id,
      courierName: created.name,
      courierCode: created.code.toUpperCase(),
    };
  }

  async updateCourier(id: string, dto: any) {
    const courier = await this.prisma.courierMaster.findFirst({ where: { id, isDeleted: false } });
    if (!courier) throw new NotFoundException(`Courier with ID '${id}' not found`);

    const updated = await this.prisma.courierMaster.update({
      where: { id },
      data: {
        ...(dto.courierName || dto.name ? { name: dto.courierName || dto.name } : {}),
        ...(dto.courierCode || dto.code ? { code: (dto.courierCode || dto.code).trim().toLowerCase() } : {}),
        ...(dto.logo !== undefined && { logo: dto.logo }),
        ...(dto.website !== undefined && { website: dto.website }),
        ...(dto.trackingUrlTemplate !== undefined && { trackingUrlTemplate: dto.trackingUrlTemplate }),
        ...(dto.maxWeight !== undefined && { maxWeight: Number(dto.maxWeight || 0) }),
        ...(dto.codAvailable !== undefined && { codAvailable: Boolean(dto.codAvailable) }),
        ...(dto.trackingAvailable !== undefined && { trackingAvailable: Boolean(dto.trackingAvailable) }),
        ...(dto.status && { status: dto.status }),
      },
    });

    return {
      ...updated,
      _id: updated.id,
      courierName: updated.name,
      courierCode: updated.code.toUpperCase(),
    };
  }

  async deleteCourier(id: string, adminUserId?: string) {
    const courier = await this.prisma.courierMaster.findFirst({ where: { id, isDeleted: false } });
    if (!courier) throw new NotFoundException(`Courier with ID '${id}' not found`);

    const newCode = courier.code.includes('_DELETED_')
      ? courier.code
      : `${courier.code}_DELETED_${Date.now()}`;

    await this.prisma.courierMaster.update({
      where: { id },
      data: {
        isDeleted: true,
        status: 'Deleted',
        deletedAt: new Date(),
        deletedBy: adminUserId || 'admin',
        code: newCode,
      },
    });
    return { message: `Courier '${courier.name}' deleted successfully`, id };
  }

  // =========================================================================
  // 6. PACKAGING RULES CRUD
  // =========================================================================
  async getPackagingRules() {
    const rules = await this.prisma.packagingRule.findMany({
      where: { isDeleted: false },
      orderBy: { createdAt: 'desc' },
    });
    return rules.map((r) => {
      const base = Number(r.charge || 0);
      const gst = Number(r.gstRate ?? 18);
      const gstAmount = base * (gst / 100);
      const totalWithGst = base + gstAmount;
      return {
        ...r,
        _id: r.id,
        baseAmount: base,
        gstRate: gst,
        gstAmount,
        charge: totalWithGst,
        price: totalWithGst,
        additionalCharge: totalWithGst,
        totalPrice: totalWithGst,
        description: r.description || r.boxSize || '',
      };
    });
  }

  async createPackagingRule(dto: any) {
    const baseVal = Number(dto.baseAmount ?? dto.charge ?? 0);
    const gstVal = Number(dto.gstRate ?? 18);
    const created = await this.prisma.packagingRule.create({
      data: {
        id: generateObjectId(),
        name: dto.name,
        description: dto.description || dto.boxSize || '',
        boxSize: dto.boxSize || dto.description || '',
        charge: baseVal,
        gstRate: gstVal,
        status: dto.status || 'Active',
      },
    });
    return {
      ...created,
      _id: created.id,
      baseAmount: Number(created.charge),
      charge: Number(created.charge),
      price: Number(created.charge),
      gstRate: Number(created.gstRate),
      description: created.description,
    };
  }

  async updatePackagingRule(id: string, dto: any) {
    const pkg = await this.prisma.packagingRule.findFirst({ where: { id, isDeleted: false } });
    if (!pkg) throw new NotFoundException(`Packaging Rule with ID '${id}' not found`);

    const baseVal = dto.baseAmount !== undefined ? Number(dto.baseAmount) : (dto.charge !== undefined ? Number(dto.charge) : undefined);

    const updated = await this.prisma.packagingRule.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.boxSize !== undefined && { boxSize: dto.boxSize }),
        ...(baseVal !== undefined && { charge: baseVal }),
        ...(dto.gstRate !== undefined && { gstRate: Number(dto.gstRate) }),
        ...(dto.status && { status: dto.status }),
      },
    });
    return {
      ...updated,
      _id: updated.id,
      baseAmount: Number(updated.charge),
      charge: Number(updated.charge),
      price: Number(updated.charge),
      gstRate: Number(updated.gstRate),
      description: updated.description,
    };
  }

  async deletePackagingRule(id: string, adminUserId?: string) {
    const pkg = await this.prisma.packagingRule.findFirst({ where: { id, isDeleted: false } });
    if (!pkg) throw new NotFoundException(`Packaging Rule with ID '${id}' not found`);

    await this.prisma.packagingRule.update({
      where: { id },
      data: {
        isDeleted: true,
        status: 'Deleted',
        deletedAt: new Date(),
        deletedBy: adminUserId || 'admin',
      },
    });
    return { message: `Packaging rule '${pkg.name}' deleted successfully`, id };
  }
}

