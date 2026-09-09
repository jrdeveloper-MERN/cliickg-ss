import { Prisma } from '@prisma/client';

export async function rollbackPromoUsageTx(
  tx: Prisma.TransactionClient | any,
  orderId: string,
  logger?: any,
): Promise<void> {
  if (!orderId) return;

  const usages = await tx.promoUsage.findMany({
    where: { orderId },
  });

  if (!usages || usages.length === 0) return;

  for (const usage of usages) {
    if (usage.promoCodeId) {
      await tx.promoCode.updateMany({
        where: {
          id: usage.promoCodeId,
          usedCount: { gt: 0 },
        },
        data: {
          usedCount: { decrement: 1 },
        },
      });
    }
  }

  await tx.promoUsage.deleteMany({
    where: { orderId },
  });

  if (logger) {
    logger.log(`[PromoRollback] Decremented promo usedCount and deleted PromoUsage records for order '${orderId}'.`);
  }
}
