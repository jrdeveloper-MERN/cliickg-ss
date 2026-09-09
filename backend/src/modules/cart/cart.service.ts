import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RedisService, REDIS_KEYS, REDIS_TTLS } from '../../redis/redis.service';
import { generateObjectId } from '../../common/utils/object-id.util';
import { SyncCartDto, SyncCartItemDto } from './dto/sync-cart.dto';

@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  // ================= REDIS CACHE HELPERS =================
  private async getCartFromCache(userId: string): Promise<any | null> {
    try {
      const cacheKey = REDIS_KEYS.CART_CACHE(userId);
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (err) {
      this.logger.warn(`Redis cart cache read error for user ${userId}: ${err.message}. Falling back to PostgreSQL.`);
    }
    return null;
  }

  private async setCartToCache(userId: string, data: any): Promise<void> {
    try {
      const cacheKey = REDIS_KEYS.CART_CACHE(userId);
      await this.redisService.set(cacheKey, JSON.stringify(data), REDIS_TTLS.CART_CACHE);
    } catch (err) {
      this.logger.warn(`Redis cart cache write error for user ${userId}: ${err.message}`);
    }
  }

  private async invalidateCartCache(userId: string): Promise<void> {
    try {
      const cacheKey = REDIS_KEYS.CART_CACHE(userId);
      await this.redisService.delete(cacheKey);
    } catch (err) {
      this.logger.warn(`Redis cart cache invalidation error for user ${userId}: ${err.message}`);
    }
  }

  // ================= GET CART =================
  async getCart(userId: string) {
    // 1. Try Redis cache first
    const cachedCart = await this.getCartFromCache(userId);
    if (cachedCart) {
      return cachedCart;
    }

    // 2. Redis miss or offline: fetch from PostgreSQL persistent source of truth
    let cart = await this.prisma.cart.findFirst({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                mainCategory: { select: { id: true, name: true } },
                category: { select: { id: true, name: true } },
                subCategory: { select: { id: true, name: true } },
                variants: true,
              },
            },
          },
        },
      },
    });

    if (!cart) {
      const cartId = generateObjectId();
      cart = await this.prisma.cart.create({
        data: {
          id: cartId,
          userId,
        },
        include: {
          items: {
            include: {
              product: {
                include: {
                  mainCategory: { select: { id: true, name: true } },
                  category: { select: { id: true, name: true } },
                  subCategory: { select: { id: true, name: true } },
                  variants: true,
                },
              },
            },
          },
        },
      });
    }

    const formattedItems = cart.items
      .map((item: any) => {
        if (item.product) {
          const prod = item.product;
          const matchedVariant = item.variantId
            ? prod.variants?.find((v: any) => v.id === item.variantId)
            : (prod.variants && prod.variants.length > 0 ? prod.variants[0] : null);

          const variantStock = matchedVariant ? Number(matchedVariant.stock) : Number(prod.stock || 0);

          return {
            ...prod,
            _id: prod.id,
            productId: prod.id,
            id: prod.id,
            name: matchedVariant?.purity ? `${prod.name} (${matchedVariant.purity})` : prod.name,
            variantId: item.variantId || matchedVariant?.id || null,
            variantKey: item.variantId || matchedVariant?.id || matchedVariant?.purity || null,
            variant: matchedVariant ? { ...matchedVariant, stock: variantStock } : null,
            purity: matchedVariant?.purity || item.selectedAttributes?.purity || prod.purity || null,
            metalType: matchedVariant?.metalType || item.selectedAttributes?.metalType || prod.metalType || null,
            stock: variantStock,
            stockQuantity: variantStock,
            quantity: variantStock > 0 ? Math.min(item.quantity, variantStock) : item.quantity,
            selectedSize: item.selectedSize || item.selectedAttributes?.selectedSize || '',
            serverCalculatedPrice: Number(item.price),
            price: Number(matchedVariant?.price || item.price || prod.price),
            sellingPrice: Number(matchedVariant?.price || item.price || prod.price),
          };
        }
        return null;
      })
      .filter(Boolean);

    // Refresh Redis cache asynchronously
    await this.setCartToCache(userId, formattedItems);

    return formattedItems;
  }

  // ================= SYNC CART =================
  async syncCart(userId: string, dto: SyncCartDto) {
    const rawItems = Array.isArray(dto.items) ? dto.items : [];

    // 1. Validate product existence, status, and server-side pricing from PostgreSQL
    const validatedCartItemsData: Array<{
      id: string;
      productId: string;
      productVariantId: string | null;
      quantity: number;
      price: number;
      selectedSize: string;
    }> = [];

    for (const item of rawItems) {
      const prodId = item._id || item.productId;
      if (!prodId) continue;

      const rawQty = item.quantity;
      if (
        rawQty === undefined ||
        rawQty === null ||
        typeof rawQty !== 'number' ||
        !Number.isInteger(rawQty) ||
        rawQty <= 0
      ) {
        throw new BadRequestException({
          message: 'Cart item quantity must be a positive integer greater than 0.',
          errors: ['INVALID_QUANTITY'],
        });
      }
      if (rawQty > 9999) {
        throw new BadRequestException({
          message: 'Cart item quantity cannot exceed 9999.',
          errors: ['QUANTITY_EXCEEDS_LIMIT'],
        });
      }
      const quantity = rawQty;

      // Load Product & ProductVariant directly from PostgreSQL persistent source of truth
      const product = await this.prisma.product.findUnique({
        where: { id: prodId },
        include: { variants: true },
      });

      if (!product) {
        throw new NotFoundException({ message: `Product '${prodId}' not found in catalog.` });
      }

      if (product.status !== 'Active') {
        throw new BadRequestException({ message: `Product '${product.name}' is inactive and cannot be added to cart.` });
      }

      let selectedVariant = null;
      const targetVarId = item.variantId || item.variantKey || item.variant?._id || item.variant?.id;
      if (targetVarId) {
        selectedVariant = product.variants.find(
          (v) => v.id === targetVarId || v.sku === targetVarId || (v as any).purity === targetVarId
        );
      }
      if (!selectedVariant && item.purity) {
        selectedVariant = product.variants.find((v) => (v as any).purity === item.purity);
      }
      if (!selectedVariant && product.variants.length > 0) {
        selectedVariant = product.variants[0];
      }

      // Stock validation (prevent out-of-stock and excessive quantity)
      const availableStock = selectedVariant
        ? Number(selectedVariant.stock ?? 0)
        : Number(product.stock ?? 0);

      if (availableStock <= 0) {
        throw new BadRequestException({
          message: `Product '${product.name}' is currently out of stock and cannot be added to cart.`,
          errors: ['OUT_OF_STOCK'],
        });
      }

      if (quantity > availableStock) {
        throw new BadRequestException({
          message: `Requested quantity (${quantity}) exceeds available stock (${availableStock}) for '${product.name}'.`,
          errors: ['INSUFFICIENT_STOCK'],
        });
      }

      // Determine server-side price (NEVER TRUST CLIENT PRICES!)
      let serverUnitPrice = Number(product.price);
      if (selectedVariant && Number(selectedVariant.price) > 0) {
        serverUnitPrice = Number(selectedVariant.price);
      }

      if (serverUnitPrice <= 0) {
        throw new BadRequestException({
          message: `Product '${product.name}' lacks valid pricing configuration. Please contact support before adding to cart.`,
          errors: ['MISSING_PRICE_CONFIGURATION'],
        });
      }

      validatedCartItemsData.push({
        id: generateObjectId(),
        productId: product.id,
        productVariantId: selectedVariant ? selectedVariant.id : null,
        quantity,
        price: serverUnitPrice,
        selectedSize: item.selectedSize || '',
      });
    }

    // 2. Perform transactional update in PostgreSQL
    let cart = await this.prisma.cart.findFirst({ where: { userId } });
    if (!cart) {
      const cartId = generateObjectId();
      cart = await this.prisma.cart.create({
        data: { id: cartId, userId },
      });
    }

    await this.prisma.$transaction([
      this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } }),
      ...(validatedCartItemsData.length > 0
        ? [
            this.prisma.cartItem.createMany({
              data: validatedCartItemsData.map((d) => ({
                id: d.id,
                cartId: cart.id,
                productId: d.productId,
                variantId: d.productVariantId,
                quantity: d.quantity,
                price: d.price,
                selectedAttributes: d.selectedSize ? { selectedSize: d.selectedSize } : undefined,
              })),
            }),
          ]
        : []),
    ]);

    // 3. Invalidate & Refresh Redis cache
    await this.invalidateCartCache(userId);

    // 4. Return formatted cart items matching legacy contract
    return this.getCart(userId);
  }
}
