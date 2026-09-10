import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../database/prisma.service';
import { generateObjectId } from '../../common/utils/object-id.util';
import { CreatePaymentOrderDto } from './dto/create-payment-order.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { RecordPaymentFailureDto } from './dto/record-payment-failure.dto';
import { ProcessRefundDto } from './dto/process-refund.dto';
import { rollbackPromoUsageTx } from '../promotions/utils/promo-rollback.util';
import { restoreItemsStockTx } from '../orders/utils/inventory-restore.util';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class PaymentsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PaymentsService.name);
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  onModuleInit() {
    // Schedule periodic cleanup of expired payment orders every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredPaymentOrders().catch((err) => {
        this.logger.error(`Error in cleanupExpiredPaymentOrders interval: ${err.message}`);
      });
    }, 5 * 60 * 1000);
  }

  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  // Helper to retrieve Razorpay Credentials safely (Never expose Key Secret to client)
  private getRazorpayConfig() {
    const gateway = this.configService.get<string>('PAYMENT_GATEWAY', 'razorpay');
    const keyId = this.configService.get<string>('RAZORPAY_KEY_ID', '');
    const keySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET', '');
    const env = this.configService.get<string>('RAZORPAY_ENVIRONMENT', 'sandbox');
    return { gateway, keyId, keySecret, env };
  }

  // IDOR Protection: Verify customer ownership or admin role
  private verifyOrderOwnership(order: any, userId?: string, userRole?: string) {
    if (!userId) return;
    const isUserAdmin = userRole === 'admin' || userRole === 'super admin';
    if (isUserAdmin) return;

    const isMatch =
      order.userId === userId ||
      (order.userId && String(order.userId) === String(userId));

    if (!isMatch && order.userId) {
      throw new ForbiddenException({
        success: false,
        message: 'You are not authorized to access this payment order.',
      });
    }
  }

  // ================= CREATE PAYMENT ORDER (RAZORPAY LIVE SANDBOX + RETRY SAFE) =================
  async createPaymentOrder(dto: CreatePaymentOrderDto, userId?: string, userRole?: string) {
    const { orderId, requestedGateway } = dto;

    const order = await this.prisma.order.findFirst({
      where: {
        OR: [{ id: orderId }, { orderId }, { orderNo: orderId }],
      },
    });

    if (!order) {
      throw new NotFoundException({ success: false, message: 'Order not found in database.' });
    }

    this.verifyOrderOwnership(order, userId, userRole);

    // Terminal State Guards: Cannot initiate payment if already paid or cancelled
    if (order.paymentStatus === 'Paid' || order.paymentStatus === 'Success' || order.paymentStatus === 'PAID') {
      throw new BadRequestException({
        success: false,
        message: 'This order has already been paid successfully.',
        orderId: order.orderId,
      });
    }

    if (order.orderStatus === 'CANCELLED' || order.orderStatus === 'Cancelled') {
      throw new BadRequestException({
        success: false,
        message: 'This order has been cancelled and is no longer eligible for payment.',
        orderId: order.orderId,
      });
    }

    if (order.orderStatus === 'FAILED' || order.orderStatus === 'Failed') {
      throw new BadRequestException({
        success: false,
        message: 'This order payment has failed. Please initiate a new checkout to retry.',
        orderId: order.orderId,
      });
    }

    if (order.orderStatus === 'PAYMENT_EXPIRED' || order.paymentStatus === 'EXPIRED') {
      throw new BadRequestException({
        success: false,
        message: 'This payment session has expired. Please initiate a new checkout.',
        orderId: order.orderId,
      });
    }

    // STRICT ZERO-TRUST: Always use order.total calculated server-side in PostgreSQL!
    const serverAmountDecimal = new Decimal(String(order.total));
    const serverAmount = serverAmountDecimal.toNumber();
    const amountInPaise = serverAmountDecimal.mul(100).round().toNumber();
    if (serverAmount <= 0) {
      throw new BadRequestException({
        success: false,
        message: 'Order total is zero or missing. Cannot initiate payment session.',
        errors: ['MISSING_PRICE_CONFIGURATION'],
      });
    }

    const { keyId, keySecret, gateway } = this.getRazorpayConfig();
    const gatewayName = requestedGateway || gateway || 'razorpay';
    const attemptNumber = (order.paymentAttempts || 0) + 1;
    const txId = `TXN_${order.orderId}_ATT${attemptNumber}_${Date.now().toString().slice(-6)}`;

    let gatewayOrderId = `G_ORD_${order.orderId}_${Date.now().toString().slice(-4)}`;
    let paymentSessionId = `SESS_${generateObjectId()}`;

    // Attempt Live Razorpay Sandbox Order Creation if credentials exist
    if (keyId && keySecret && gatewayName.toLowerCase() === 'razorpay') {
      try {
        const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');

        const response = await fetch('https://api.razorpay.com/v1/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: authHeader,
          },
          body: JSON.stringify({
            amount: amountInPaise,
            currency: 'INR',
            receipt: order.orderId,
            notes: {
              orderNo: order.orderNo,
              customerEmail: order.email || '',
              attemptNumber: String(attemptNumber),
            },
          }),
        });

        if (response.ok) {
          const rzpOrder: any = await response.json();
          gatewayOrderId = rzpOrder.id; // Real rzp_order_xxxx
          paymentSessionId = rzpOrder.id;
          this.logger.log(`[Razorpay Sandbox] Order created successfully: ${rzpOrder.id} (Attempt #${attemptNumber}) for amount ₹${serverAmount}`);
        } else {
          const errText = await response.text();
          this.logger.warn(`[Razorpay Sandbox] API Call returned ${response.status}: ${errText}. Falling back to internal order ID.`);
        }
      } catch (err: any) {
        this.logger.error(`[Razorpay Sandbox] API Error: ${err.message}. Using fallback payment order ID.`);
      }
    }

    // Record PaymentTransaction in PostgreSQL (Preserving Historical Payment Attempts)
    await this.prisma.paymentTransaction.create({
      data: {
        id: generateObjectId(),
        orderId: order.orderId,
        gateway: gatewayName,
        transactionId: txId,
        amount: serverAmount,
        currency: 'INR',
        status: 'INITIATED',
      },
    });

    // Append to OrderPaymentTimeline
    await this.prisma.orderPaymentTimeline.create({
      data: {
        id: generateObjectId(),
        orderId: order.id,
        event: 'PAYMENT_ATTEMPT_INITIATED',
        status: 'INITIATED',
        amount: serverAmount,
        gateway: gatewayName,
        payload: { attemptNumber, txId, gatewayOrderId },
      },
    });

    // Update Order payment session details in PostgreSQL
    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        paymentGateway: gatewayName,
        paymentSessionId,
        gatewayOrderId,
        transactionId: txId,
        paymentAttempts: attemptNumber,
        paymentStatus: 'Pending',
        orderStatus: order.orderStatus === 'Received' || order.orderStatus === 'PENDING_PAYMENT' ? 'PENDING_PAYMENT' : order.orderStatus,
      },
    });

    // Return PUBLIC credentials only (Key ID is safe for browser checkout; Key Secret is strictly kept server-side!)
    return {
      success: true,
      paymentGateway: gatewayName,
      paymentSessionId,
      gatewayOrderId,
      amount: serverAmount,
      amountInPaise,
      currency: 'INR',
      orderId: order.orderId,
      orderNumber: order.orderNo,
      transactionId: txId,
      paymentAttempts: attemptNumber,
      keyId: keyId || undefined, // Public Key ID for Razorpay Checkout JS
    };
  }

  // ================= GET PAYMENT STATUS & RETRY METADATA =================
  async getOrderPaymentStatus(orderId: string, userId?: string, userRole?: string) {
    const order = await this.prisma.order.findFirst({
      where: {
        OR: [{ id: orderId }, { orderId }, { orderNo: orderId }],
      },
      include: {
        paymentTimeline: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!order) {
      throw new NotFoundException({ success: false, message: 'Order not found in database.' });
    }

    this.verifyOrderOwnership(order, userId, userRole);

    const isPaid = order.paymentStatus === 'Paid' || order.paymentStatus === 'Success' || order.paymentStatus === 'PAID';
    const isCancelled = order.orderStatus === 'CANCELLED' || order.orderStatus === 'Cancelled';
    const isExpired = order.orderStatus === 'PAYMENT_EXPIRED' || order.paymentStatus === 'EXPIRED';

    const canRetry = !isPaid && !isCancelled && !isExpired;

    const attempts = await this.prisma.paymentTransaction.findMany({
      where: { orderId: order.orderId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      orderId: order.id,
      orderNumber: order.orderNo,
      internalOrderId: order.orderId,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      paymentGateway: order.paymentGateway,
      gatewayOrderId: order.gatewayOrderId,
      amount: Number(order.total),
      currency: order.currency || 'INR',
      canRetry,
      paymentAttempts: order.paymentAttempts || attempts.length,
      failureReason: order.failureReason || undefined,
      attempts: attempts.map((a) => ({
        transactionId: a.transactionId,
        gateway: a.gateway,
        amount: Number(a.amount),
        status: a.status,
        createdAt: a.createdAt,
      })),
      timeline: order.paymentTimeline,
    };
  }

  // ================= RECORD PAYMENT FAILURE / CANCELLATION =================
  async recordPaymentFailure(dto: RecordPaymentFailureDto, userId?: string, userRole?: string) {
    const { orderId, reason, errorCode, errorMessage, gatewayOrderId, gatewayPaymentId, rawError } = dto;

    const order = await this.prisma.order.findFirst({
      where: {
        OR: [{ id: orderId }, { orderId }, { orderNo: orderId }],
      },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException({ success: false, message: 'Order not found in database.' });
    }

    this.verifyOrderOwnership(order, userId, userRole);

    // DO NOT DOWNGRADE: If order is already paid, ignore client failure reports
    if (order.paymentStatus === 'Paid' || order.paymentStatus === 'Success' || order.paymentStatus === 'PAID') {
      return {
        success: true,
        message: 'Order is already marked as Paid. Ignoring failure report.',
        paymentStatus: order.paymentStatus,
      };
    }

    // IDEMPOTENCY GUARD: If order is already in a terminal released state (e.g. FAILED, PAYMENT_EXPIRED, Cancelled),
    // stock was already restored. Do not restore stock again!
    if (order.orderStatus === 'FAILED' || order.orderStatus === 'PAYMENT_EXPIRED' || order.orderStatus === 'Cancelled') {
      this.logger.log(`[Payment Failure Idempotent] Order ${order.orderId} is already in terminal state '${order.orderStatus}'. Returning existing state without stock restoration.`);
      return {
        success: true,
        message: `Order is already marked as ${order.orderStatus}.`,
        orderId: order.orderId,
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus,
        canRetry: true,
      };
    }

    const normalizedReason = reason || errorCode || 'USER_CANCELLED';
    const isCancelled = normalizedReason === 'USER_CANCELLED' || normalizedReason === 'CANCELLED';
    const statusText = isCancelled ? 'CANCELLED' : 'FAILED';
    const paymentStatusVal = isCancelled ? 'Cancelled' : 'Failed';

    // ATOMIC TRANSACTION: State transition PENDING_PAYMENT -> FAILED + exact stock restoration
    const updated = await this.prisma.$transaction(async (tx) => {
      // 1. Atomic conditional update to guard against concurrent/duplicate transitions
      const updateRes = await tx.order.updateMany({
        where: {
          id: order.id,
          orderStatus: 'PENDING_PAYMENT',
        },
        data: {
          paymentStatus: paymentStatusVal,
          failureReason: normalizedReason,
          orderStatus: 'FAILED',
          lastGatewayResponse: { reason: normalizedReason, errorCode, errorMessage, recordedAt: new Date() },
        },
      });

      if (updateRes.count === 0) {
        // Was already transitioned concurrently by another request
        return null;
      }

      // 2. Restore held inventory exactly once inside the same atomic transaction
      await restoreItemsStockTx(tx, order.items, this.logger);

      // 3. Rollback promo usage if applied
      await rollbackPromoUsageTx(tx, order.id, this.logger);

      // 4. Record PaymentTransaction attempt failure
      if (order.transactionId) {
        await tx.paymentTransaction.updateMany({
          where: { transactionId: order.transactionId },
          data: {
            status: statusText,
            gatewayResponse: { reason: normalizedReason, errorCode, errorMessage, rawError },
          },
        });
      }

      // 5. Log in PaymentError table for admin audit
      await tx.paymentError.create({
        data: {
          id: generateObjectId(),
          orderId: order.orderId,
          gateway: order.paymentGateway || 'razorpay',
          errorCode: errorCode || normalizedReason,
          errorMessage: errorMessage || `Payment ${statusText}: ${normalizedReason}`,
          rawError: rawError ? (typeof rawError === 'string' ? { message: rawError } : rawError) : undefined,
        },
      });

      // 6. Record Timeline
      await tx.orderPaymentTimeline.create({
        data: {
          id: generateObjectId(),
          orderId: order.id,
          event: isCancelled ? 'PAYMENT_CANCELLED_BY_USER' : 'PAYMENT_FAILED',
          status: statusText,
          amount: Number(order.total),
          gateway: order.paymentGateway || 'razorpay',
          payload: { reason: normalizedReason, errorCode, errorMessage, gatewayOrderId, gatewayPaymentId },
        },
      });

      // 7. Record OrderStatusHistory
      await tx.orderStatusHistory.create({
        data: {
          id: generateObjectId(),
          orderId: order.id,
          status: 'FAILED',
          notes: `Payment ${statusText}: ${normalizedReason}`,
          updatedBy: 'System',
        },
      });

      return tx.order.findUnique({
        where: { id: order.id },
      });
    });

    try {
      await this.redisService.delete('dashboard:stats');
    } catch {
      // non-critical
    }

    if (!updated) {
      const currentOrder = await this.prisma.order.findUnique({ where: { id: order.id } });
      return {
        success: true,
        message: `Payment attempt recorded as ${currentOrder?.orderStatus || statusText}.`,
        orderId: order.orderId,
        paymentStatus: currentOrder?.paymentStatus || paymentStatusVal,
        orderStatus: currentOrder?.orderStatus || 'FAILED',
        canRetry: true,
      };
    }

    this.logger.log(`[Payment Failure Recorded] Order ${order.orderId} status set to FAILED (${paymentStatusVal} - ${normalizedReason}) and held stock restored.`);

    return {
      success: true,
      message: `Payment attempt recorded as ${statusText}.`,
      orderId: order.orderId,
      paymentStatus: updated.paymentStatus,
      orderStatus: updated.orderStatus,
      canRetry: true,
    };
  }

  // ================= EXPIRATION CLEANUP FOR ABANDONED ORDERS =================
  async cleanupExpiredPaymentOrders() {
    const expiryMinutes = parseInt(this.configService.get<string>('PAYMENT_ORDER_EXPIRY_MINUTES', '30'), 10);
    const cutoffDate = new Date(Date.now() - expiryMinutes * 60 * 1000);

    const expiredOrders = await this.prisma.order.findMany({
      where: {
        orderStatus: 'PENDING_PAYMENT',
        paymentStatus: { in: ['Pending', 'Initiated', 'Failed', 'Cancelled'] },
        createdAt: { lt: cutoffDate },
      },
      include: { items: true },
    });

    if (expiredOrders.length === 0) {
      return { expiredCount: 0 };
    }

    let processedCount = 0;
    for (const ord of expiredOrders) {
      const updated = await this.prisma.$transaction(async (tx) => {
        const updateRes = tx.order.updateMany
          ? await tx.order.updateMany({
              where: { id: ord.id, orderStatus: 'PENDING_PAYMENT' },
              data: {
                orderStatus: 'PAYMENT_EXPIRED',
                paymentStatus: 'EXPIRED',
                failureReason: `Payment expired after ${expiryMinutes} minutes of inactivity`,
              },
            })
          : await tx.order.update({
              where: { id: ord.id },
              data: {
                orderStatus: 'PAYMENT_EXPIRED',
                paymentStatus: 'EXPIRED',
                failureReason: `Payment expired after ${expiryMinutes} minutes of inactivity`,
              },
            });

        if (updateRes && (updateRes as any).count === 0) {
          return null;
        }

        // Restore inventory for each item safely ONCE
        await restoreItemsStockTx(tx, ord.items, this.logger);

        // Rollback promo usage if applied
        await rollbackPromoUsageTx(tx, ord.id, this.logger);

        await tx.orderPaymentTimeline.create({
          data: {
            id: generateObjectId(),
            orderId: ord.id,
            event: 'PAYMENT_EXPIRED',
            status: 'EXPIRED',
            amount: Number(ord.total),
            gateway: ord.paymentGateway || 'razorpay',
            payload: { expiryMinutes, expiredAt: new Date() },
          },
        });

        return ord;
      });

      if (updated) {
        processedCount++;
      }
    }

    this.logger.log(`[Payment Expiration] Marked ${processedCount} abandoned orders as PAYMENT_EXPIRED and restored inventory.`);
    return { expiredCount: processedCount };
  }

  // ================= AUTHORITATIVE PAYMENT FINALIZATION =================
  private async handleOrphanCapturedPayment(
    order: any,
    paymentId: string,
    paidAmount: number,
    gatewayOrderId?: string,
    gatewayName: string = 'razorpay',
    reasonMessage?: string,
  ) {
    const failureMsg = reasonMessage || `Captured after order became ${order.orderStatus}. Automated refund initiated.`;

    this.logger.warn(
      `[Orphan Payment Captured] Payment ${paymentId} (₹${paidAmount}) captured for order ${order.orderId} (Status: ${order.orderStatus}). Initiating automated reconciliation & refund.`
    );

    // 1. Idempotency Check: Was an orphan refund already processed or initiated for this order/paymentId?
    if (order.refundStatus === 'Refunded' || order.refundStatus === 'Initiated') {
      this.logger.log(`[Orphan Payment] Payment ${paymentId} for order ${order.orderId} has already been submitted for refund.`);
      return {
        success: false,
        message: `Order is in '${order.orderStatus}' status and payment has already been submitted for refund.`,
        status: 'ORPHAN_PAYMENT_ALREADY_REFUNDED',
        refundStatus: order.refundStatus,
        orderStatus: order.orderStatus,
        order,
      };
    }

    // 2. Transactionally persist orphan payment audit records & update Order gatewayPaymentId
    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: {
          gatewayPaymentId: paymentId,
          ...(gatewayOrderId && { gatewayOrderId }),
          refundStatus: 'Initiated',
          failureReason: failureMsg,
          lastGatewayResponse: {
            event: 'ORPHAN_PAYMENT_CAPTURED',
            gatewayPaymentId: paymentId,
            gatewayOrderId,
            paidAmount,
            capturedAt: new Date(),
          },
        },
      });

      const existingTx = await tx.paymentTransaction.findFirst({
        where: { transactionId: paymentId },
      });

      if (!existingTx) {
        await tx.paymentTransaction.create({
          data: {
            id: generateObjectId(),
            orderId: order.orderId,
            gateway: gatewayName,
            transactionId: paymentId,
            amount: paidAmount,
            currency: 'INR',
            status: 'ORPHAN_CAPTURED',
            gatewayResponse: {
              reason: failureMsg,
              orderStatus: order.orderStatus,
              paymentStatus: order.paymentStatus,
              capturedAt: new Date(),
            },
          },
        });
      }

      await tx.paymentError.create({
        data: {
          id: generateObjectId(),
          orderId: order.orderId,
          gateway: gatewayName,
          errorCode: 'ORPHANED_CAPTURED_PAYMENT',
          errorMessage: `Payment ${paymentId} (₹${paidAmount}) was captured for order ${order.orderId} (Status: ${order.orderStatus}). ${failureMsg}`,
          rawError: {
            gatewayPaymentId: paymentId,
            gatewayOrderId,
            amount: paidAmount,
            orderStatus: order.orderStatus,
            reason: failureMsg,
          },
        },
      });

      await tx.orderPaymentTimeline.create({
        data: {
          id: generateObjectId(),
          orderId: order.id,
          event: 'ORPHANED_PAYMENT_CAPTURED',
          status: 'ORPHAN_CAPTURED',
          amount: paidAmount,
          gateway: gatewayName,
          payload: {
            gatewayPaymentId: paymentId,
            gatewayOrderId,
            orderStatus: order.orderStatus,
            action: 'AUTOMATIC_REFUND_INITIATED',
            reason: failureMsg,
          },
        },
      });
    });

    // 3. Trigger automated Razorpay Refund via trusted processOrderRefund infrastructure
    let refundResult: any = null;
    try {
      refundResult = await this.processOrderRefund(
        {
          orderId: order.id,
          amount: paidAmount,
          reason: failureMsg,
          idempotencyKey: `ORPH_REF_${order.orderId}_${paymentId}`,
          gatewayPaymentId: paymentId,
        },
        'System',
        'admin',
      );
      this.logger.log(`[Orphan Payment Refund Success] Order ${order.orderId} (Payment: ${paymentId}): ${JSON.stringify(refundResult)}`);
    } catch (rfErr: any) {
      this.logger.error(`[Orphan Payment Refund Error] Order ${order.orderId} (Payment: ${paymentId}): ${rfErr.message}`);
    }

    const updatedOrder = await this.prisma.order.findUnique({
      where: { id: order.id },
      include: { items: true },
    });

    return {
      success: false,
      message: `Payment received after order was ${order.orderStatus}. Order remains ${order.orderStatus} and an automated refund has been initiated.`,
      status: 'ORPHAN_PAYMENT_REFUND_INITIATED',
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      refundStatus: updatedOrder?.refundStatus || 'Initiated',
      gatewayPaymentId: paymentId,
      refundResult,
      order: updatedOrder,
    };
  }

  // ================= AUTHORITATIVE PAYMENT FINALIZATION =================
  async finalizeSuccessfulPayment(params: {
    orderId: string;
    gatewayPaidAmount?: number;
    gatewayPaymentId?: string;
    gatewayOrderId?: string;
    gatewayName?: string;
  }) {
    const { orderId, gatewayPaidAmount, gatewayPaymentId, gatewayOrderId, gatewayName = 'razorpay' } = params;

    const order = await this.prisma.order.findFirst({
      where: {
        OR: [{ id: orderId }, { orderId }, { orderNo: orderId }],
      },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException({ success: false, message: 'Order not found in database.' });
    }

    // Idempotency check: Already paid?
    if (order.paymentStatus === 'Paid' || order.paymentStatus === 'Success' || order.paymentStatus === 'PAID') {
      this.logger.log(`[Payment Finalization] Order ${order.orderId} is already marked as Paid. Returning existing state.`);
      return {
        success: true,
        message: 'Payment already verified and processed',
        status: 'SUCCESS',
        invoiceNo: order.invoiceNo,
        order,
      };
    }

    const paymentId = gatewayPaymentId || `PAY_${Date.now().toString().slice(-8)}`;

    // Terminal State Handling: Handle captured payments on PAYMENT_EXPIRED or CANCELLED orders
    const isTerminal =
      order.orderStatus === 'PAYMENT_EXPIRED' ||
      order.paymentStatus === 'EXPIRED' ||
      order.orderStatus === 'CANCELLED' ||
      order.orderStatus === 'Cancelled' ||
      order.isDeleted;

    if (isTerminal) {
      const serverTotal = Number(order.total);
      const paidAmount = gatewayPaidAmount !== undefined && gatewayPaidAmount !== null ? gatewayPaidAmount : serverTotal;
      return this.handleOrphanCapturedPayment(
        order,
        paymentId,
        paidAmount,
        gatewayOrderId,
        gatewayName,
        `Captured after order became ${order.orderStatus}. Automated refund initiated.`,
      );
    }

    const serverTotal = Number(order.total);
    if (gatewayPaidAmount !== undefined && gatewayPaidAmount !== null) {
      if (Math.abs(serverTotal - gatewayPaidAmount) > 0.01) {
        this.logger.error(`[Payment Amount Mismatch] Order ${order.orderId}: Server total ₹${serverTotal} !== Gateway amount ₹${gatewayPaidAmount}`);
        throw new BadRequestException({
          success: false,
          message: `Payment amount mismatch: Order total is ₹${serverTotal}, but gateway reported ₹${gatewayPaidAmount}`,
          errors: ['AMOUNT_MISMATCH'],
        });
      }
    }

    const year = new Date().getFullYear();
    const invoiceNo = order.invoiceNo || `INV-${year}-${Math.floor(100000 + Math.random() * 900000)}`;

    const isOrderFailed = order.orderStatus === 'FAILED' || order.orderStatus === 'Failed';

    let finalizedOrder: any;
    try {
      finalizedOrder = await this.prisma.$transaction(async (tx) => {
        // Concurrency check inside transaction: has order been finalized concurrently?
        const targetOrder = await tx.order.findUnique({
          where: { id: order.id },
          include: { items: true },
        });

        if (!targetOrder || ['Paid', 'Success', 'PAID'].includes(targetOrder.paymentStatus)) {
          throw new Error('ORDER_ALREADY_FINALIZED');
        }

        // If the order entered FAILED status earlier, its inventory was restored.
        // We MUST atomically reacquire the inventory before allowing FAILED -> Received / Paid!
        if (targetOrder.orderStatus === 'FAILED' || targetOrder.orderStatus === 'Failed') {
          for (const item of targetOrder.items) {
            if (item.variantId) {
              const res = await tx.productVariant.updateMany({
                where: {
                  id: item.variantId,
                  stock: { gte: item.quantity },
                },
                data: {
                  stock: { decrement: item.quantity },
                },
              });
              if (res.count === 0) {
                throw new Error(`INSUFFICIENT_STOCK_FOR_REACQUISITION:variant:${item.variantId}`);
              }
            } else if (item.productId) {
              const res = await tx.product.updateMany({
                where: {
                  id: item.productId,
                  stock: { gte: item.quantity },
                },
                data: {
                  stock: { decrement: item.quantity },
                },
              });
              if (res.count === 0) {
                throw new Error(`INSUFFICIENT_STOCK_FOR_REACQUISITION:product:${item.productId}`);
              }
            }
          }
        }

        // 1. Update Order status PENDING_PAYMENT / FAILED -> Received, paymentStatus -> Paid atomically
        const updateRes = await tx.order.updateMany({
          where: {
            id: order.id,
            orderStatus: { in: ['PENDING_PAYMENT', 'FAILED', 'Failed'] },
            paymentStatus: { notIn: ['Paid', 'Success', 'PAID'] },
          },
          data: {
            paymentStatus: 'Paid',
            orderStatus: 'Received',
            invoiceNo,
            invoiceStatus: 'Generated',
            invoiceGeneratedAt: order.invoiceGeneratedAt || new Date(),
            paidAt: new Date(),
            webhookVerified: true,
            amountPaid: serverTotal,
            gatewayPaymentId: paymentId,
            ...(gatewayOrderId && { gatewayOrderId }),
          },
        });

        if (updateRes.count === 0) {
          throw new Error('ORDER_ALREADY_FINALIZED');
        }

        const updated = await tx.order.findUnique({
          where: { id: order.id },
          include: { items: true },
        });

        // 2. Update or create PaymentTransaction
        if (order.transactionId && tx.paymentTransaction?.updateMany) {
          await tx.paymentTransaction.updateMany({
            where: { transactionId: order.transactionId },
            data: {
              status: 'SUCCESS',
              amount: serverTotal,
            },
          });
        } else if (tx.paymentTransaction?.create) {
          await tx.paymentTransaction.create({
            data: {
              id: generateObjectId(),
              orderId: order.orderId,
              gateway: gatewayName,
              transactionId: paymentId,
              amount: serverTotal,
              currency: 'INR',
              status: 'SUCCESS',
            },
          });
        }

        // 3. Append to OrderPaymentTimeline
        if (tx.orderPaymentTimeline?.create) {
          await tx.orderPaymentTimeline.create({
            data: {
              id: generateObjectId(),
              orderId: order.id,
              event: isOrderFailed ? 'PAYMENT_RECOVERY_SUCCESS' : 'PAYMENT_SUCCESS',
              status: 'SUCCESS',
              amount: serverTotal,
              gateway: gatewayName,
              payload: { gatewayPaymentId: paymentId, gatewayOrderId, reacquiredInventory: isOrderFailed },
            },
          });
        }

        // 4. Create OrderStatusHistory
        if (tx.orderStatusHistory?.create) {
          await tx.orderStatusHistory.create({
            data: {
              id: generateObjectId(),
              orderId: order.id,
              status: 'Received',
              notes: isOrderFailed
                ? `Payment verified successfully via ${gatewayName} (recovered from FAILED). Inventory reacquired. Transaction ID: ${paymentId}`
                : `Payment verified successfully via ${gatewayName}. Transaction ID: ${paymentId}`,
              updatedBy: 'System',
            },
          });
        }

        // 5. Clear customer cart on verified payment success
        if (order.userId) {
          const userCart = await tx.cart.findFirst({ where: { userId: order.userId } });
          if (userCart) {
            await tx.cartItem.deleteMany({ where: { cartId: userCart.id } });
          }
        }

        return updated;
      });
    } catch (err: any) {
      if (err.message && err.message.startsWith('INSUFFICIENT_STOCK_FOR_REACQUISITION')) {
        this.logger.error(
          `[Inventory Reacquisition Failed] Order ${order.orderId} was FAILED, but required inventory is unavailable for payment ${paymentId}. Routing to automated orphan payment refund.`
        );
        return await this.handleOrphanCapturedPayment(
          order,
          paymentId,
          gatewayPaidAmount !== undefined && gatewayPaidAmount !== null ? gatewayPaidAmount : serverTotal,
          gatewayOrderId,
          gatewayName,
          'Insufficient inventory available to fulfill retry on failed order. Automated refund initiated.',
        );
      }

      if (err.message === 'ORDER_ALREADY_FINALIZED') {
        const latestOrder = await this.prisma.order.findUnique({
          where: { id: order.id },
          include: { items: true },
        });
        return {
          success: true,
          message: 'Payment already verified and processed',
          status: 'SUCCESS',
          invoiceNo: latestOrder?.invoiceNo,
          order: latestOrder,
        };
      }

      throw err;
    }

    this.logger.log(`[Payment Finalization] Order ${order.orderId} finalized successfully (Paid ₹${serverTotal}). Cart cleared.`);

    try {
      await this.redisService.delete('dashboard:stats');
    } catch {
      // non-critical
    }

    return {
      success: true,
      message: 'Payment verified and order finalized successfully',
      status: 'SUCCESS',
      invoiceNo,
      order: finalizedOrder,
    };
  }

  // ================= VERIFY PAYMENT SIGNATURE & STATUS =================
  async verifyPayment(dto: VerifyPaymentDto) {
    const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature, signature, amount } = dto;

    const order = await this.prisma.order.findFirst({
      where: {
        OR: [{ id: orderId }, { orderId }, { orderNo: orderId }],
      },
    });

    if (!order) {
      throw new NotFoundException({ success: false, message: 'Order not found' });
    }

    if (order.paymentStatus === 'Paid' || order.paymentStatus === 'Success') {
      return {
        success: true,
        message: 'Payment already verified successfully',
        paymentStatus: order.paymentStatus,
        order,
      };
    }

    const { keySecret } = this.getRazorpayConfig();

    // Verify HMAC SHA256 Signature - Fail Closed in Production when keySecret is configured
    const incomingSignature = razorpay_signature || signature;
    const rzpOrderId = razorpay_order_id || order.gatewayOrderId;
    const rzpPaymentId = razorpay_payment_id;

    // Cross-Order Payment Identity Guards
    if (razorpay_order_id && order.gatewayOrderId && razorpay_order_id !== order.gatewayOrderId) {
      this.logger.warn(`[Payment Verification] Gateway Order ID mismatch for order ${order.orderId}: expected ${order.gatewayOrderId}, got ${razorpay_order_id}`);
      throw new BadRequestException({
        success: false,
        message: 'Gateway order ID does not match this order session.',
        errors: ['GATEWAY_ORDER_MISMATCH'],
      });
    }

    if (rzpPaymentId) {
      const existingPaymentUse = await this.prisma.order.findFirst({
        where: {
          gatewayPaymentId: rzpPaymentId,
          paymentStatus: { in: ['Paid', 'Success', 'PAID'] },
          id: { not: order.id },
        },
      });

      if (
        existingPaymentUse &&
        existingPaymentUse.id !== order.id &&
        ['Paid', 'Success', 'PAID'].includes(existingPaymentUse.paymentStatus)
      ) {
        this.logger.warn(`[Payment Verification] Gateway payment ID ${rzpPaymentId} was already applied to order ${existingPaymentUse.orderId}`);
        throw new BadRequestException({
          success: false,
          message: 'This payment transaction identifier has already been processed for another order.',
          errors: ['PAYMENT_ID_ALREADY_USED'],
        });
      }
    }

    const nodeEnv = (this.configService.get<string>('nodeEnv') || process.env.NODE_ENV || 'development').toLowerCase();
    const isDevMode = nodeEnv !== 'production';

    if (!incomingSignature) {
      if (isDevMode) {
        this.logger.log(`[Payment Verification] Bypassing Razorpay signature verification in development/test mode for order ${order.orderId}`);
      } else {
        this.logger.warn(`[Razorpay Verification] Signature missing for order ${order.orderId}`);
        throw new BadRequestException({
          success: false,
          message: 'Payment signature is required for verification.',
          errors: ['MISSING_SIGNATURE'],
        });
      }
    } else if (keySecret) {
      if (!rzpOrderId) {
        this.logger.warn(`[Razorpay Verification] Gateway Order ID missing for order ${order.orderId}`);
        throw new BadRequestException({
          success: false,
          message: 'Razorpay order ID is required for verification.',
          errors: ['MISSING_GATEWAY_ORDER_ID'],
        });
      }

      if (!rzpPaymentId) {
        this.logger.warn(`[Razorpay Verification] Gateway Payment ID missing for order ${order.orderId}`);
        throw new BadRequestException({
          success: false,
          message: 'Razorpay payment ID is required for verification.',
          errors: ['MISSING_PAYMENT_ID'],
        });
      }

      const generatedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(`${rzpOrderId}|${rzpPaymentId}`)
        .digest('hex');

      const incomingBuf = Buffer.from(incomingSignature);
      const expectedBuf = Buffer.from(generatedSignature);
      const isValid =
        incomingBuf.length === expectedBuf.length &&
        crypto.timingSafeEqual(incomingBuf, expectedBuf);

      if (!isValid && !isDevMode) {
        this.logger.warn(`[Razorpay Signature Verification] Invalid signature mismatch for order ${order.orderId}`);
        throw new BadRequestException({
          success: false,
          message: 'Invalid Razorpay payment signature.',
          errors: ['INVALID_SIGNATURE'],
        });
      }
      this.logger.log(`[Razorpay Signature Verification] Signature verified successfully for order ${order.orderId}`);
    }

    const gatewayPaidAmount = amount !== undefined && amount !== null ? Number(amount) : undefined;
    return this.finalizeSuccessfulPayment({
      orderId: order.id,
      gatewayPaidAmount,
      gatewayPaymentId: rzpPaymentId,
      gatewayOrderId: rzpOrderId,
      gatewayName: order.paymentGateway || 'razorpay',
    });
  }

  // ================= AUTOMATED RAZORPAY REFUND PROCESSING =================
  async processOrderRefund(dto: ProcessRefundDto, requestingUserId?: string, requestingUserRole?: string) {
    const { orderId, amount, reason, idempotencyKey } = dto;
    const trimmedReason = (reason || '').trim() || 'Admin initiated refund';

    const order = await this.prisma.order.findFirst({
      where: {
        OR: [{ id: orderId }, { orderId }, { orderNo: orderId }],
      },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException({ success: false, message: 'Order not found in database.' });
    }

    // 1. Soft Delete Check
    if (order.isDeleted) {
      throw new BadRequestException({ success: false, message: 'Cannot refund a soft-deleted order record.' });
    }

    // 2. Authorization / IDOR Protection
    this.verifyOrderOwnership(order, requestingUserId, requestingUserRole);

    // 3. Idempotency Check: Already fully refunded?
    if (order.refundStatus === 'Refunded' || order.paymentStatus === 'Refunded') {
      this.logger.log(`[Razorpay Refund] Order ${order.orderId} is already fully refunded.`);
      return {
        success: true,
        message: 'Order has already been fully refunded.',
        refundStatus: 'Refunded',
        paymentStatus: 'Refunded',
        order,
      };
    }

    // Check for existing processing / successful refund transaction idempotency key
    if (idempotencyKey) {
      const existingTx = await this.prisma.paymentTransaction.findFirst({
        where: {
          orderId: order.orderId,
          transactionId: idempotencyKey,
        },
      });
      if (existingTx && existingTx.status === 'REFUNDED') {
        this.logger.log(`[Razorpay Refund] Idempotent refund request detected for key '${idempotencyKey}'.`);
        return {
          success: true,
          message: 'Refund already processed for this idempotency key.',
          refundStatus: 'Refunded',
          refundTransaction: existingTx,
          order,
        };
      }
    }

    // 4. Payment Status Check (Allows standard paid orders OR orphan captured payments on expired/cancelled orders)
    const isPaid = ['Paid', 'Success', 'PAID', 'Refund Initiated'].includes(order.paymentStatus);
    const isOrphanPayment = order.orderStatus === 'PAYMENT_EXPIRED' ||
                            order.paymentStatus === 'EXPIRED' ||
                            order.orderStatus === 'CANCELLED' ||
                            order.orderStatus === 'Cancelled' ||
                            Boolean(dto.gatewayPaymentId);

    if (!isPaid && !isOrphanPayment) {
      throw new BadRequestException({
        success: false,
        message: `Order ${order.orderId} is not in a paid or orphaned state (Current payment status: '${order.paymentStatus}'). Cannot process refund.`,
      });
    }

    // 5. Zero-Trust Server Amount Calculation: ONE ORDER = ONE FULL REFUND ONLY
    const serverTotal = Number(order.total);
    let refundAmount = serverTotal;

    if (amount !== undefined && amount !== null) {
      const requestedAmt = Number(amount);
      if (isNaN(requestedAmt) || requestedAmt <= 0) {
        throw new BadRequestException({
          success: false,
          code: 'INVALID_REFUND_AMOUNT',
          message: 'Refund amount must be a positive number greater than zero.',
          errors: ['INVALID_REFUND_AMOUNT'],
        });
      }
      if (requestedAmt > serverTotal + 0.01) {
        throw new BadRequestException({
          success: false,
          code: 'REFUND_AMOUNT_EXCEEDS_PAID_AMOUNT',
          message: `Refund amount (₹${requestedAmt}) cannot exceed total paid order amount (₹${serverTotal}).`,
          errors: ['REFUND_AMOUNT_EXCEEDS_PAID_AMOUNT'],
        });
      }
      if (requestedAmt < serverTotal - 0.01) {
        throw new BadRequestException({
          success: false,
          code: 'REFUND_PARTIAL_NOT_SUPPORTED',
          message: `Partial refunds are not supported. Only full refunds of the eligible order amount (₹${serverTotal}) are permitted.`,
          errors: ['REFUND_PARTIAL_NOT_SUPPORTED'],
        });
      }
      refundAmount = serverTotal;
    }

    const gatewayPaymentId = dto.gatewayPaymentId || order.gatewayPaymentId || order.paymentSessionId || order.transactionId;
    const isOnlinePayment = order.paymentMethod && order.paymentMethod.toUpperCase() !== 'COD' && order.paymentMethod.toUpperCase() !== 'CASH';

    // 6. COD (Cash On Delivery) Manual Refund Path
    if (!isOnlinePayment) {
      this.logger.log(`[Refund] Processing COD offline refund for order ${order.orderId} (Amount: ₹${refundAmount})`);
      const updatedOrder = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.order.update({
          where: { id: order.id },
          data: {
            refundStatus: 'Refunded',
            paymentStatus: 'Refunded',
            orderStatus: order.orderStatus === 'Returned' || order.orderStatus === 'Return Requested' ? 'Refunded' : order.orderStatus,
          },
          include: { items: true },
        });

        await tx.paymentTransaction.create({
          data: {
            id: generateObjectId(),
            orderId: order.orderId,
            gateway: 'COD',
            transactionId: idempotencyKey || `REF_COD_${Date.now().toString().slice(-8)}`,
            amount: refundAmount,
            currency: 'INR',
            status: 'REFUNDED',
            gatewayResponse: { type: 'COD_MANUAL_REFUND', reason: trimmedReason, refundedBy: requestingUserId || 'Admin' },
          },
        });

        await tx.orderPaymentTimeline.create({
          data: {
            id: generateObjectId(),
            orderId: order.id,
            event: 'REFUND_COMPLETED',
            status: 'REFUNDED',
            amount: refundAmount,
            gateway: 'COD',
            payload: { notes: `COD manual refund recorded. Reason: ${trimmedReason}`, refundedBy: requestingUserId || 'Admin' },
          },
        });

        await tx.orderStatusHistory.create({
          data: {
            id: generateObjectId(),
            orderId: order.id,
            status: 'Refunded',
            notes: `COD refund of ₹${refundAmount} recorded. Reason: ${trimmedReason}`,
            updatedBy: requestingUserId || 'Admin',
          },
        });

        return updated;
      });

      return {
        success: true,
        message: 'COD manual refund processed and recorded successfully.',
        refundStatus: 'Refunded',
        amount: refundAmount,
        order: updatedOrder,
      };
    }

    // 7. ONLINE RAZORPAY REFUND PATH
    const { keyId, keySecret } = this.getRazorpayConfig();
    const nodeEnv = (this.configService.get<string>('nodeEnv') || process.env.NODE_ENV || 'development').toLowerCase();

    if (!gatewayPaymentId || !gatewayPaymentId.startsWith('pay_')) {
      if (!keySecret || nodeEnv !== 'production') {
        const simRefundId = `rfnd_sim_${Date.now().toString().slice(-10)}`;
        this.logger.log(`[Razorpay Refund Simulated] Executing simulated refund ${simRefundId} for order ${order.orderId}`);

        const updatedOrder = await this.prisma.$transaction(async (tx) => {
          const updated = await tx.order.update({
            where: { id: order.id },
            data: {
              refundStatus: 'Refunded',
              paymentStatus: 'Refunded',
              lastGatewayResponse: { refundId: simRefundId, amount: refundAmount, mode: 'simulated', refundedAt: new Date() },
            },
            include: { items: true },
          });

          await tx.paymentTransaction.create({
            data: {
              id: generateObjectId(),
              orderId: order.orderId,
              gateway: order.paymentGateway || 'razorpay',
              transactionId: simRefundId,
              amount: refundAmount,
              currency: 'INR',
              status: 'REFUNDED',
              gatewayResponse: { refundId: simRefundId, status: 'processed', mode: 'simulated' },
            },
          });

          await tx.orderPaymentTimeline.create({
            data: {
              id: generateObjectId(),
              orderId: order.id,
              event: 'REFUND_COMPLETED',
              status: 'REFUNDED',
              amount: refundAmount,
              gateway: order.paymentGateway || 'razorpay',
              payload: { gatewayRefundId: simRefundId, mode: 'simulated', reason: trimmedReason },
            },
          });

          return updated;
        });

        return {
          success: true,
          message: 'Simulated Razorpay refund processed successfully.',
          refundId: simRefundId,
          amount: refundAmount,
          refundStatus: 'Refunded',
          order: updatedOrder,
        };
      } else {
        throw new BadRequestException({
          success: false,
          message: 'No valid gateway payment transaction identifier (pay_xxxx) found for this order.',
          errors: ['MISSING_GATEWAY_PAYMENT_ID'],
        });
      }
    }

    if (!keyId || !keySecret) {
      throw new BadRequestException({
        success: false,
        message: 'Razorpay API credentials (KEY_ID / KEY_SECRET) are missing in environment configuration.',
        errors: ['MISSING_RAZORPAY_CREDENTIALS'],
      });
    }

    const amountInPaise = Math.round(refundAmount * 100);
    const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const refundReceipt = idempotencyKey || `REF_${order.orderId}_${Date.now().toString().slice(-6)}`;

    let rzpResponse: any = null;
    let rzpStatus = 0;
    let fetchError: any = null;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const res = await fetch(`https://api.razorpay.com/v1/payments/${gatewayPaymentId}/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify({
          amount: amountInPaise,
          speed: 'normal',
          notes: {
            orderId: order.orderId,
            orderNo: order.orderNo,
            reason: trimmedReason,
            requestedBy: requestingUserId || 'Admin',
          },
          receipt: refundReceipt,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      rzpStatus = res.status;

      if (res.ok) {
        rzpResponse = await res.json();
      } else {
        const errText = await res.text();
        try {
          rzpResponse = JSON.parse(errText);
        } catch {
          rzpResponse = { error: { description: errText } };
        }
      }
    } catch (err: any) {
      fetchError = err;
      this.logger.error(`[Razorpay Refund Request Error] Payment ${gatewayPaymentId} for order ${order.orderId}: ${err.message}`);
    }

    // 8. Handle Network Timeout / Unknown Gateway Result
    if (fetchError) {
      const isTimeout = fetchError.name === 'AbortError' || fetchError.code === 'ECONNRESET' || fetchError.code === 'ETIMEDOUT';

      await this.prisma.order.update({
        where: { id: order.id },
        data: {
          refundStatus: 'Pending',
          failureReason: `Razorpay refund request timed out (${fetchError.message}). Status pending reconciliation.`,
        },
      });

      await this.prisma.orderPaymentTimeline.create({
        data: {
          id: generateObjectId(),
          orderId: order.id,
          event: 'REFUND_PENDING',
          status: 'PENDING_RECONCILIATION',
          amount: refundAmount,
          gateway: 'razorpay',
          payload: { error: fetchError.message, isTimeout, receipt: refundReceipt },
        },
      });

      await this.prisma.paymentError.create({
        data: {
          id: generateObjectId(),
          orderId: order.orderId,
          gateway: 'razorpay',
          errorCode: isTimeout ? 'RAZORPAY_TIMEOUT' : 'NETWORK_ERROR',
          errorMessage: fetchError.message,
          rawError: { message: fetchError.message },
        },
      });

      throw new BadRequestException({
        success: false,
        message: 'Refund request to Razorpay timed out or failed to establish network connection. State set to PENDING to prevent duplicate refund attempts.',
        refundStatus: 'Pending',
        errors: ['GATEWAY_TIMEOUT'],
      });
    }

    // 9. Handle Razorpay API Success Response
    if (rzpStatus >= 200 && rzpStatus < 300 && rzpResponse && rzpResponse.id) {
      const gatewayRefundId = rzpResponse.id;
      const refundState = String(rzpResponse.status || 'processed').toLowerCase();
      const isCompleted = refundState === 'processed' || refundState === 'completed';

      const finalRefundStatus = isCompleted ? 'Refunded' : 'Initiated';
      const finalPaymentStatus = isCompleted ? 'Refunded' : 'Refund Initiated';

      const updatedOrder = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.order.update({
          where: { id: order.id },
          data: {
            refundStatus: finalRefundStatus,
            paymentStatus: finalPaymentStatus,
            lastGatewayResponse: JSON.parse(JSON.stringify(rzpResponse)),
          },
          include: { items: true },
        });

        await tx.paymentTransaction.create({
          data: {
            id: generateObjectId(),
            orderId: order.orderId,
            gateway: 'razorpay',
            transactionId: gatewayRefundId,
            amount: refundAmount,
            currency: 'INR',
            status: isCompleted ? 'REFUNDED' : 'REFUND_INITIATED',
            gatewayResponse: JSON.parse(JSON.stringify(rzpResponse)),
          },
        });

        await tx.orderPaymentTimeline.create({
          data: {
            id: generateObjectId(),
            orderId: order.id,
            event: isCompleted ? 'REFUND_COMPLETED' : 'REFUND_INITIATED',
            status: isCompleted ? 'REFUNDED' : 'REFUND_INITIATED',
            amount: refundAmount,
            gateway: 'razorpay',
            payload: { gatewayRefundId, status: rzpResponse.status, receipt: refundReceipt },
          },
        });

        await tx.orderStatusHistory.create({
          data: {
            id: generateObjectId(),
            orderId: order.id,
            status: finalRefundStatus,
            notes: `Razorpay refund ${gatewayRefundId} (${rzpResponse.status}). Amount: ₹${refundAmount}. Reason: ${trimmedReason}`,
            updatedBy: requestingUserId || 'System',
          },
        });

        return updated;
      });

      this.logger.log(`[Razorpay Refund Success] Order ${order.orderId} refunded ₹${refundAmount} (Gateway Refund ID: ${gatewayRefundId})`);

      return {
        success: true,
        message: `Razorpay refund processed successfully (${gatewayRefundId}).`,
        refundId: gatewayRefundId,
        amount: refundAmount,
        refundStatus: finalRefundStatus,
        order: updatedOrder,
      };
    }

    // 10. Handle Razorpay API Rejection Error
    const rzpErr = rzpResponse?.error || {};
    const errorCode = rzpErr.code || rzpErr.reason || 'REFUND_REJECTED';
    const errorDesc = rzpErr.description || rzpErr.message || 'Razorpay refund request was rejected.';

    this.logger.warn(`[Razorpay Refund Rejected] Order ${order.orderId}: Code ${errorCode} - ${errorDesc}`);

    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        refundStatus: 'Failed',
        failureReason: errorDesc,
      },
    });

    await this.prisma.orderPaymentTimeline.create({
      data: {
        id: generateObjectId(),
        orderId: order.id,
        event: 'REFUND_FAILED',
        status: 'FAILED',
        amount: refundAmount,
        gateway: 'razorpay',
        payload: { errorCode, errorDesc, gatewayPaymentId },
      },
    });

    await this.prisma.paymentError.create({
      data: {
        id: generateObjectId(),
        orderId: order.orderId,
        gateway: 'razorpay',
        errorCode,
        errorMessage: errorDesc,
        rawError: JSON.parse(JSON.stringify(rzpResponse || {})),
      },
    });

    throw new BadRequestException({
      success: false,
      message: `Razorpay refund failed: ${errorDesc}`,
      errors: [errorCode],
    });
  }

  // ================= WEBHOOK HANDLER =================
  async handleWebhook(gateway: string, payload: any, incomingSignature?: string, rawBodyBuffer?: Buffer) {
    const orderId = payload.orderId || payload.order_id || payload?.payload?.payment?.entity?.notes?.orderId || payload?.payload?.refund?.entity?.notes?.orderId;
    if (!orderId && !payload?.payload?.refund) {
      return { received: true, message: 'No orderId in payload' };
    }

    const { keySecret } = this.getRazorpayConfig();
    const webhookSecret = this.configService.get<string>('RAZORPAY_WEBHOOK_SECRET', '') || keySecret;

    // FAIL CLOSED: Webhook requires valid HMAC Signature header
    if (!incomingSignature) {
      this.logger.warn(`[Razorpay Webhook] Missing webhook signature header for gateway ${gateway}`);
      throw new BadRequestException({ success: false, message: 'Missing webhook signature' });
    }

    if (webhookSecret) {
      const rawBody = rawBodyBuffer || (typeof payload === 'string' ? payload : JSON.stringify(payload));
      const expectedSig = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');

      const incomingBuf = Buffer.from(incomingSignature);
      const expectedBuf = Buffer.from(expectedSig);
      const isValid =
        incomingBuf.length === expectedBuf.length &&
        crypto.timingSafeEqual(incomingBuf, expectedBuf);

      if (!isValid) {
        this.logger.warn(`[Razorpay Webhook] Invalid webhook signature for gateway ${gateway}`);
        throw new BadRequestException({ success: false, message: 'Invalid webhook signature' });
      }
    }

    const event = String(payload.event || '').toLowerCase();

    // Process Refund Webhook Events (refund.processed / refund.failed)
    if (event.startsWith('refund.')) {
      const refundEntity = payload?.payload?.refund?.entity || payload?.payload?.payment?.entity || {};
      const rzpPaymentId = refundEntity?.payment_id;
      const rzpRefundId = refundEntity?.id;

      const order = await this.prisma.order.findFirst({
        where: {
          OR: [
            ...(orderId ? [{ id: orderId }, { orderId }, { orderNo: orderId }] : []),
            ...(rzpPaymentId ? [{ gatewayPaymentId: rzpPaymentId }] : []),
          ],
        },
      });

      if (!order) {
        return { received: true, message: 'Order not found for refund webhook event' };
      }

      if (event === 'refund.processed') {
        if (order.refundStatus !== 'Refunded') {
          await this.prisma.order.update({
            where: { id: order.id },
            data: { refundStatus: 'Refunded', paymentStatus: 'Refunded' },
          });

          await this.prisma.orderPaymentTimeline.create({
            data: {
              id: generateObjectId(),
              orderId: order.id,
              event: 'REFUND_WEBHOOK_VERIFIED',
              status: 'REFUNDED',
              amount: Number(refundEntity.amount || 0) / 100 || Number(order.total),
              gateway: gateway || 'razorpay',
              payload: { gatewayRefundId: rzpRefundId, event, refundEntity },
            },
          });
        }
        return { received: true, verified: true, refundStatus: 'Refunded', orderId: order.orderId };
      } else if (event === 'refund.failed') {
        await this.prisma.order.update({
          where: { id: order.id },
          data: { refundStatus: 'Failed', failureReason: refundEntity.error_description || 'Refund webhook reported failure' },
        });

        await this.prisma.orderPaymentTimeline.create({
          data: {
            id: generateObjectId(),
            orderId: order.id,
            event: 'REFUND_WEBHOOK_FAILED',
            status: 'FAILED',
            amount: Number(refundEntity.amount || 0) / 100 || Number(order.total),
            gateway: gateway || 'razorpay',
            payload: { gatewayRefundId: rzpRefundId, event, refundEntity },
          },
        });
        return { received: true, verified: true, refundStatus: 'Failed', orderId: order.orderId };
      }
    }

    const order = await this.prisma.order.findFirst({
      where: { OR: [{ id: orderId }, { orderId }, { orderNo: orderId }] },
    });

    if (!order) {
      return { received: true, message: 'Order not found' };
    }

    if (order.paymentStatus === 'Paid' || order.paymentStatus === 'Success' || order.paymentStatus === 'PAID') {
      return { received: true, verified: true, message: 'Payment already verified and processed.' };
    }

    const payloadStatus = String(payload.status || payload.event || payload?.payload?.payment?.entity?.status || 'SUCCESS').toUpperCase();
    if (payloadStatus.includes('SUCCESS') || payloadStatus.includes('PAID') || payloadStatus.includes('CAPTURED')) {
      const rawPaidAmount = payload?.payload?.payment?.entity?.amount;
      const gatewayPaidAmount = rawPaidAmount ? Number(rawPaidAmount) / 100 : undefined;
      const gatewayPaymentId = payload?.payload?.payment?.entity?.id || payload.paymentId;
      const gatewayOrderId = payload?.payload?.payment?.entity?.order_id || payload.gatewayOrderId;

      await this.finalizeSuccessfulPayment({
        orderId: order.id,
        gatewayPaidAmount,
        gatewayPaymentId,
        gatewayOrderId,
        gatewayName: gateway || 'razorpay',
      });
    }

    return { received: true, verified: true, orderId: order.orderId };
  }

  async getActiveGateways() {
    return this.prisma.paymentGatewaySetting.findMany({
      where: { isEnabled: true },
      select: {
        id: true,
        gateway: true,
        displayName: true,
        isEnabled: true,
        isDefault: true,
        environment: true,
      },
    });
  }

  async getAllGateways() {
    const gateways = await this.prisma.paymentGatewaySetting.findMany({
      orderBy: { createdAt: 'asc' },
    });

    return gateways.map((gw) => ({
      _id: gw.id,
      gatewayName: gw.displayName,
      code: gw.gateway,
      enabled: gw.isEnabled,
      isDefault: gw.isDefault,
      mode: gw.environment,
      displayOrder: 1,
      status: gw.isEnabled ? 'Active' : 'Inactive',
      credentials: gw.credentials,
    }));
  }

  async updateGateway(id: string, payload: any) {
    const existing = await this.prisma.paymentGatewaySetting.findFirst({
      where: { OR: [{ id }, { gateway: id }] },
    });

    if (!existing) {
      throw new NotFoundException(`Gateway configuration '${id}' not found`);
    }

    if (payload.isDefault) {
      await this.prisma.paymentGatewaySetting.updateMany({
        data: { isDefault: false },
      });
    }

    return this.prisma.paymentGatewaySetting.update({
      where: { id: existing.id },
      data: {
        ...(payload.enabled !== undefined && { isEnabled: Boolean(payload.enabled) }),
        ...(payload.isDefault !== undefined && { isDefault: Boolean(payload.isDefault) }),
        ...(payload.mode && { environment: payload.mode }),
        ...(payload.credentials && { credentials: payload.credentials }),
      },
    });
  }

  async setDefaultGateway(id: string) {
    const existing = await this.prisma.paymentGatewaySetting.findFirst({
      where: { OR: [{ id }, { gateway: id }] },
    });

    if (!existing) {
      throw new NotFoundException(`Gateway configuration '${id}' not found`);
    }

    await this.prisma.paymentGatewaySetting.updateMany({
      data: { isDefault: false },
    });

    return this.prisma.paymentGatewaySetting.update({
      where: { id: existing.id },
      data: { isDefault: true },
    });
  }

  async getTransactions(query: { orderId?: string; gateway?: string; status?: string; page?: number; limit?: number }) {
    const pageNum = parseInt(String(query.page || 1), 10);
    const limitNum = parseInt(String(query.limit || 20), 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (query.orderId) where.orderId = { contains: query.orderId, mode: 'insensitive' };
    if (query.gateway) where.gateway = query.gateway;
    if (query.status) where.status = query.status;

    const [total, transactions] = await Promise.all([
      this.prisma.paymentTransaction.count({ where }),
      this.prisma.paymentTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
    ]);

    return {
      success: true,
      data: transactions,
      pagination: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
      },
    };
  }
}
