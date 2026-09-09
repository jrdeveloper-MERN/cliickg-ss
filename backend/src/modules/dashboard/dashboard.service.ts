import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async getDashboardStats() {
    const cacheKey = 'dashboard:stats';
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        // Continue to fresh calculation on parse error
      }
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const [
      totalOrders,
      totalReturns,
      totalCancelled,
      totalCustomers,
      totalProducts,
      salesAgg,
      todayOrders,
      todaySalesAgg,
      todayAddedProducts,
      rawRecentOrders,
      rawRecentCustomers,
    ] = await Promise.all([
      this.prisma.order.count({
        where: {
          isDeleted: false,
          orderStatus: { notIn: ['PENDING_PAYMENT', 'PAYMENT_EXPIRED'] },
        },
      }).catch(() => 0),
      this.prisma.order.count({
        where: {
          isDeleted: false,
          orderStatus: 'Returned',
        },
      }).catch(() => 0),
      this.prisma.order.count({
        where: {
          isDeleted: false,
          orderStatus: 'Cancelled',
        },
      }).catch(() => 0),
      this.prisma.customer.count({
        where: {
          isDeleted: false,
        },
      }).catch(() => 0),
      this.prisma.product.count({
        where: {
          isDeleted: false,
        },
      }).catch(() => 0),
      this.prisma.order.aggregate({
        _sum: { total: true },
        where: {
          isDeleted: false,
          paymentStatus: { in: ['Paid', 'Success', 'PAID'] },
          refundStatus: { notIn: ['Refunded', 'FULL'] },
          orderStatus: { notIn: ['Cancelled', 'Returned', 'Refunded', 'PENDING_PAYMENT', 'PAYMENT_EXPIRED'] },
        },
      }).catch(() => ({ _sum: { total: 0 } })),
      this.prisma.order.count({
        where: {
          isDeleted: false,
          createdAt: { gte: startOfToday, lte: endOfToday },
          orderStatus: { notIn: ['PENDING_PAYMENT', 'PAYMENT_EXPIRED'] },
        },
      }).catch(() => 0),
      this.prisma.order.aggregate({
        _sum: { total: true },
        where: {
          isDeleted: false,
          createdAt: { gte: startOfToday, lte: endOfToday },
          paymentStatus: { in: ['Paid', 'Success', 'PAID'] },
          refundStatus: { notIn: ['Refunded', 'FULL'] },
          orderStatus: { notIn: ['Cancelled', 'Returned', 'Refunded', 'PENDING_PAYMENT', 'PAYMENT_EXPIRED'] },
        },
      }).catch(() => ({ _sum: { total: 0 } })),
      this.prisma.product.count({
        where: {
          isDeleted: false,
          createdAt: { gte: startOfToday, lte: endOfToday },
        },
      }).catch(() => 0),
      this.prisma.order.findMany({
        where: {
          isDeleted: false,
        },
        take: 10,
        orderBy: { createdAt: 'desc' },
      }).catch(() => []),
      this.prisma.customer.findMany({
        where: {
          isDeleted: false,
        },
        take: 10,
        orderBy: { createdAt: 'desc' },
      }).catch(() => []),
    ]);

    const totalSales = Number(salesAgg._sum?.total || 0);
    const todaySales = Number(todaySalesAgg._sum?.total || 0);

    // Map recent orders to preserve consistent shape and actual database values
    const recentOrders = rawRecentOrders.map((o) => ({
      _id: o.id,
      id: o.id,
      orderId: o.orderNo || o.orderId || o.id,
      customerName: o.customerName || 'Customer',
      mobile: o.mobile || 'N/A',
      paymentMethod: o.paymentMethod || 'Online',
      orderStatus: o.orderStatus || 'Pending',
      total: Number(o.total || 0),
      orderDate: o.createdAt,
    }));

    // Map recent customers to preserve consistent shape and actual sequential customerId
    const recentCustomers = rawRecentCustomers.map((c) => ({
      _id: c.id,
      id: c.id,
      customerId: c.customerId || c.id.substring(0, 8).toUpperCase(),
      type: c.type || 'Customer',
      name: c.name || 'Customer',
      phone: c.phone || c.mobileNumber || 'N/A',
      email: c.email || 'N/A',
      status: c.status || 'Active',
      joinedDate: c.createdAt,
    }));

    const result = {
      stats: {
        totalOrders,
        totalReturns,
        totalCancelled,
        totalCustomers,
        totalSales,
        totalProducts,
        todayOrders,
        todaySales,
        todayAddedProducts,
      },
      recentOrders,
      recentCustomers,
    };

    await this.redisService.set(cacheKey, JSON.stringify(result), 60).catch(() => {});
    return result;
  }

  async getPaymentDashboardMetrics() {
    const cacheKey = 'payment:metrics';
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        // Continue to fresh calculation
      }
    }

    const [transactions, orders, errors] = await Promise.all([
      this.prisma.paymentTransaction.findMany().catch(() => []),
      this.prisma.order.findMany().catch(() => []),
      this.prisma.paymentError.findMany().catch(() => []),
    ]);

    const totalPaymentsCount = transactions.length;
    const successfulPaymentsCount = transactions.filter((t) => (t.status || '').toUpperCase() === 'SUCCESS').length;
    const failedPaymentsCount = transactions.filter((t) => (t.status || '').toUpperCase() === 'FAILED').length;
    const pendingPaymentsCount = transactions.filter((t) => ['PENDING', 'INITIATED'].includes((t.status || '').toUpperCase())).length;
    const cancelledPaymentsCount = transactions.filter((t) => (t.status || '').toUpperCase() === 'CANCELLED').length;

    const successRate = totalPaymentsCount > 0 ? Number(((successfulPaymentsCount / totalPaymentsCount) * 100).toFixed(1)) : 0;
    const failureRate = totalPaymentsCount > 0 ? Number(((failedPaymentsCount / totalPaymentsCount) * 100).toFixed(1)) : 0;

    const totalRevenue = orders
      .filter((o) => ['Paid', 'Success', 'Confirmed', 'Delivered'].includes(o.paymentStatus || o.orderStatus))
      .reduce((sum, o) => sum + Number(o.total || 0), 0);

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todayTransactions = transactions.filter((t) => new Date(t.createdAt) >= startOfToday);
    const todayRevenue = orders
      .filter((o) => ['Paid', 'Success'].includes(o.paymentStatus) && new Date(o.createdAt) >= startOfToday)
      .reduce((sum, o) => sum + Number(o.total || 0), 0);

    const razorpayTx = transactions.filter((t) => (t.gateway || '').toLowerCase() === 'razorpay');
    const razorpaySuccess = razorpayTx.filter((t) => (t.status || '').toUpperCase() === 'SUCCESS').length;
    const razorpaySuccessRate = razorpayTx.length > 0 ? Number(((razorpaySuccess / razorpayTx.length) * 100).toFixed(1)) : 100;

    const failureReasonCounts: Record<string, number> = {};
    errors.forEach((err) => {
      const code = err.errorCode || err.errorMessage || 'UNKNOWN_ERROR';
      failureReasonCounts[code] = (failureReasonCounts[code] || 0) + 1;
    });

    const topFailureReasons = Object.entries(failureReasonCounts)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const result = {
      success: true,
      data: {
        totalPaymentsCount,
        successfulPaymentsCount,
        failedPaymentsCount,
        pendingPaymentsCount,
        cancelledPaymentsCount,
        successRate,
        failureRate,
        totalRevenue,
        todayTransactionsCount: todayTransactions.length,
        todayRevenue,
        razorpaySuccessRate,
        topFailureReasons,
      },
    };

    await this.redisService.set(cacheKey, JSON.stringify(result), 60).catch(() => {});
    return result;
  }

  async exportPaymentReportCsv(): Promise<string> {
    const transactions = await this.prisma.paymentTransaction.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const headers = ['Transaction ID', 'Order ID', 'Gateway', 'Amount (INR)', 'Status', 'Date'];
    const rows = transactions.map((t) => [
      `"${t.transactionId || t.id}"`,
      `"${t.orderId || 'N/A'}"`,
      `"${t.gateway || 'Generic'}"`,
      Number(t.amount || 0).toFixed(2),
      `"${t.status || 'PENDING'}"`,
      `"${new Date(t.createdAt).toISOString()}"`,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }
}
