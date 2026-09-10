import { Logger } from '@nestjs/common';

/**
 * Atomically restores stock quantities for order items inside an existing Prisma transaction.
 * Works uniformly for both ProductVariant (variantId) and standalone Product (productId).
 *
 * @param tx Prisma transaction client
 * @param items Array of items with quantity, variantId, productId
 * @param logger Optional NestJS logger instance
 */
export async function restoreItemsStockTx(
  tx: any,
  items: Array<{ variantId?: string | null; productId?: string | null; quantity: number | string }>,
  logger?: Logger,
): Promise<void> {
  if (!items || !Array.isArray(items) || items.length === 0) {
    return;
  }

  for (const item of items) {
    const qty = Number(item.quantity || 0);
    if (qty <= 0) {
      continue;
    }

    if (item.variantId) {
      const res = await tx.productVariant.updateMany({
        where: { id: item.variantId },
        data: {
          stock: { increment: qty },
        },
      });
      if (logger) {
        logger.log(`[InventoryRestore] Restored variant '${item.variantId}' stock +${qty} (updated rows: ${res.count})`);
      }
    } else if (item.productId) {
      const res = await tx.product.updateMany({
        where: { id: item.productId },
        data: {
          stock: { increment: qty },
        },
      });
      if (logger) {
        logger.log(`[InventoryRestore] Restored product '${item.productId}' stock +${qty} (updated rows: ${res.count})`);
      }
    }
  }
}
