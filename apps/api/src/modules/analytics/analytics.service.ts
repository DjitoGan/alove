/**
 * [1] ANALYTICS SERVICE
 *     Business logic for dashboard metrics and reports
 *     Data: Orders, Payments, Products, Users
 *     Aggregation: Prisma groupBy, count, sum
 *     Caching: Redis (1 hour TTL for expensive queries)
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import {
  GetMetricsQueryDto,
  GetOrderAnalyticsDto,
  GetProductAnalyticsDto,
  GetCustomerAnalyticsDto,
  TimeRange,
} from './dto/analytics.dto';

@Injectable()
export class AnalyticsService {
  private logger = new Logger(AnalyticsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * [2] GET METRICS
   *     Revenue, orders, customers, products, refunds
   *     Supports time ranges and custom date ranges
   *     Caches results for 1 hour
   */
  async getMetrics(query: GetMetricsQueryDto): Promise<any> {
    // [3] BUILD CACHE KEY FROM QUERY
    const cacheKey = `analytics:metrics:${JSON.stringify(query)}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      this.logger.debug('Metrics cache hit');
      return JSON.parse(cached);
    }

    // [4] CALCULATE DATE RANGE
    const { startDate, endDate } = this.getDateRange(
      query.timeRange,
      query.startDate,
      query.endDate,
    );

    // [5] FETCH METRICS BASED ON TYPE
    let metrics: any;

    switch (query.metric) {
      case 'REVENUE':
        metrics = await this.getRevenueMetrics(startDate, endDate, query.groupBy);
        break;
      case 'ORDERS':
        metrics = await this.getOrderMetrics(startDate, endDate, query.groupBy);
        break;
      case 'CUSTOMERS':
        metrics = await this.getCustomerMetrics(startDate, endDate);
        break;
      case 'PRODUCTS':
        metrics = await this.getProductMetrics(startDate, endDate);
        break;
      case 'REFUNDS':
        metrics = await this.getRefundMetrics(startDate, endDate);
        break;
      default:
        metrics = await this.getRevenueMetrics(startDate, endDate, query.groupBy);
    }

    // [6] CACHE FOR 1 HOUR
    await this.redis.setex(cacheKey, 3600, JSON.stringify(metrics));

    return metrics;
  }

  /**
   * [7] REVENUE METRICS
   *     Total revenue, by payment method, by order status
   */
  async getRevenueMetrics(startDate: Date, endDate: Date, groupBy?: string): Promise<any> {
    // [8] BASE QUERY: SUM ALL PAYMENT AMOUNTS
    const totalRevenue = await this.prisma.payment.aggregate({
      _sum: { amount: true },
      where: {
        createdAt: { gte: startDate, lte: endDate },
        status: 'COMPLETED',
      },
    });

    // [9] REVENUE BY PAYMENT METHOD
    let byPaymentMethod: any = null;
    if (groupBy === 'paymentMethod') {
      byPaymentMethod = await this.prisma.payment.groupBy({
        by: ['paymentMethod'],
        _sum: { amount: true },
        _count: true,
        where: {
          createdAt: { gte: startDate, lte: endDate },
          status: 'COMPLETED',
        },
      });
    }

    // [10] REVENUE BY ORDER STATUS
    let byStatus: any = null;
    if (groupBy === 'status') {
      byStatus = await this.prisma.order.groupBy({
        by: ['status'],
        _sum: { totalAmount: true },
        _count: true,
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
      });
    }

    return {
      timeRange: { startDate, endDate },
      totalRevenue: totalRevenue._sum.amount || 0,
      byPaymentMethod,
      byStatus,
    };
  }

  /**
   * [11] ORDER METRICS
   *      Total orders, by status, average order value
   */
  async getOrderMetrics(startDate: Date, endDate: Date, groupBy?: string): Promise<any> {
    // [12] TOTAL ORDERS
    const totalOrders = await this.prisma.order.count({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    // [13] ORDERS BY STATUS
    const byStatus = await this.prisma.order.groupBy({
      by: ['status'],
      _count: true,
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    // [14] AVERAGE ORDER VALUE
    const avgOrderValue = await this.prisma.order.aggregate({
      _avg: { totalAmount: true },
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    return {
      timeRange: { startDate, endDate },
      totalOrders,
      byStatus: Object.fromEntries(byStatus.map((g) => [g.status, g._count])),
      averageOrderValue: avgOrderValue._avg.totalAmount || 0,
    };
  }

  /**
   * [15] CUSTOMER METRICS
   *      New customers, returning, total active
   */
  async getCustomerMetrics(startDate: Date, endDate: Date): Promise<any> {
    // [16] NEW CUSTOMERS THIS PERIOD
    const newCustomers = await this.prisma.user.count({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        role: 'CUSTOMER',
      },
    });

    // [17] RETURNING CUSTOMERS (2+ ORDERS)
    const returningCustomers = await this.prisma.user.count({
      where: {
        role: 'CUSTOMER',
        orders: {
          some: {
            createdAt: { gte: startDate, lte: endDate },
          },
        },
      },
    });

    // [18] TOTAL ACTIVE CUSTOMERS
    const totalCustomers = await this.prisma.user.count({
      where: { role: 'CUSTOMER', isActive: true },
    });

    return {
      timeRange: { startDate, endDate },
      newCustomers,
      returningCustomers,
      totalActiveCustomers: totalCustomers,
      churnRate:
        totalCustomers > 0 ? ((totalCustomers - returningCustomers) / totalCustomers) * 100 : 0,
    };
  }

  /**
   * [19] PRODUCT METRICS
   *      Top selling products by revenue and quantity
   */
  async getProductMetrics(startDate: Date, endDate: Date): Promise<any> {
    // [20] TOP PRODUCTS BY REVENUE
    const topProducts = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: {
        total: true,
        quantity: true,
      },
      _count: true,
      where: {
        order: {
          createdAt: { gte: startDate, lte: endDate },
        },
      },
      orderBy: {
        _sum: {
          total: 'desc',
        },
      },
      take: 10,
    });

    return {
      timeRange: { startDate, endDate },
      topProducts: topProducts.map((p) => ({
        productId: p.productId,
        revenue: p._sum.total,
        quantity: p._sum.quantity,
        orders: p._count,
      })),
    };
  }

  /**
   * [21] REFUND METRICS
   *      Total refunds, refund rate, refund reasons
   */
  async getRefundMetrics(startDate: Date, endDate: Date): Promise<any> {
    // [22] TOTAL REFUNDED AMOUNT
    const totalRefunded = await this.prisma.payment.aggregate({
      _sum: { amount: true },
      where: {
        createdAt: { gte: startDate, lte: endDate },
        status: 'REFUNDED',
      },
    });

    // [23] REFUND COUNT
    const refundCount = await this.prisma.payment.count({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        status: 'REFUNDED',
      },
    });

    // [24] TOTAL TRANSACTIONS
    const totalTransactions = await this.prisma.payment.count({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    return {
      timeRange: { startDate, endDate },
      totalRefunded: totalRefunded._sum.amount || 0,
      refundCount,
      refundRate: totalTransactions > 0 ? (refundCount / totalTransactions) * 100 : 0,
    };
  }

  /**
   * [25] GET ORDER ANALYTICS
   *      Order details by status, value range, customer segment
   */
  async getOrderAnalytics(query: GetOrderAnalyticsDto): Promise<any> {
    // [26] CACHE KEY
    const cacheKey = `analytics:orders:${JSON.stringify(query)}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    // [27] BUILD WHERE CLAUSE
    const { startDate, endDate } = this.getDateRange(query.timeRange);
    const where: any = {
      createdAt: { gte: startDate, lte: endDate },
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.minOrderValue) {
      where.totalAmount = { gte: query.minOrderValue };
    }

    // [28] FETCH ORDERS
    const orders = await this.prisma.order.findMany({
      where,
      include: {
        user: { select: { id: true, email: true, name: true } },
        payment: { select: { paymentMethod: true, status: true } },
        items: { select: { productId: true, quantity: true, total: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // [29] AGGREGATE STATS
    const stats = {
      totalOrders: orders.length,
      totalValue: orders.reduce((sum, o) => sum + o.totalAmount, 0),
      averageValue:
        orders.length > 0 ? orders.reduce((sum, o) => sum + o.totalAmount, 0) / orders.length : 0,
    };

    const result = { orders, stats };

    // [30] CACHE FOR 1 HOUR
    await this.redis.setex(cacheKey, 3600, JSON.stringify(result));

    return result;
  }

  /**
   * [31] GET PRODUCT ANALYTICS
   *      Top products, sales trends, category breakdown
   */
  async getProductAnalytics(query: GetProductAnalyticsDto): Promise<any> {
    // [32] CACHE KEY
    const cacheKey = `analytics:products:${JSON.stringify(query)}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    // [33] DATE RANGE
    const { startDate, endDate } = this.getDateRange(query.timeRange);

    // [34] TOP PRODUCTS
    const topProducts = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true, total: true },
      _count: true,
      where: {
        order: { createdAt: { gte: startDate, lte: endDate } },
      },
      orderBy:
        query.sortBy === 'sales' ? { _sum: { quantity: 'desc' } } : { _sum: { total: 'desc' } },
      take: query.limit,
    });

    const result = {
      timeRange: { startDate, endDate },
      topProducts: topProducts.map((p) => ({
        productId: p.productId,
        sales: p._sum.quantity,
        revenue: p._sum.total,
        orders: p._count,
      })),
    };

    // [35] CACHE FOR 1 HOUR
    await this.redis.setex(cacheKey, 3600, JSON.stringify(result));

    return result;
  }

  /**
   * [36] GET CUSTOMER ANALYTICS
   *      Customer segments, lifetime value, churn
   */
  async getCustomerAnalytics(query: GetCustomerAnalyticsDto): Promise<any> {
    // [37] CACHE KEY
    const cacheKey = `analytics:customers:${JSON.stringify(query)}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    // [38] DATE RANGE
    const { startDate, endDate } = this.getDateRange(query.timeRange);

    // [39] BUILD WHERE CLAUSE FOR SEGMENT
    const where: any = { role: 'CUSTOMER' };

    if (query.segment === 'new') {
      where.createdAt = { gte: startDate, lte: endDate };
    } else if (query.segment === 'inactive') {
      where.isActive = false;
    }

    // [40] FETCH CUSTOMERS WITH STATS
    const customers = await this.prisma.user.findMany({
      where,
      include: {
        orders: {
          where: { createdAt: { gte: startDate, lte: endDate } },
          select: { id: true, totalAmount: true },
        },
      },
      take: query.limit,
    });

    // [41] CALCULATE LIFETIME VALUE
    const customersWithStats = customers.map((c) => ({
      id: c.id,
      email: c.email,
      name: c.name,
      orderCount: c.orders.length,
      totalSpent: c.orders.reduce((sum, o) => sum + o.totalAmount, 0),
      averageOrderValue:
        c.orders.length > 0
          ? c.orders.reduce((sum, o) => sum + o.totalAmount, 0) / c.orders.length
          : 0,
    }));

    const result = {
      segment: query.segment || 'all',
      timeRange: { startDate, endDate },
      customers: customersWithStats,
      averageLifetimeValue:
        customersWithStats.length > 0
          ? customersWithStats.reduce((sum, c) => sum + c.totalSpent, 0) / customersWithStats.length
          : 0,
    };

    // [42] CACHE FOR 1 HOUR
    await this.redis.setex(cacheKey, 3600, JSON.stringify(result));

    return result;
  }

  /**
   * [43] HELPER: CALCULATE DATE RANGE
   *      Convert TimeRange enum to actual dates
   */
  private getDateRange(
    timeRange?: string,
    startDate?: string,
    endDate?: string,
  ): { startDate: Date; endDate: Date } {
    // [44] IF CUSTOM DATES PROVIDED, USE THEM
    if (startDate && endDate) {
      return {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      };
    }

    // [45] CALCULATE FROM TIME RANGE
    const now = new Date();
    let start = new Date();

    switch (timeRange) {
      case TimeRange.TODAY:
        start.setHours(0, 0, 0, 0);
        break;
      case TimeRange.WEEK:
        start.setDate(now.getDate() - now.getDay());
        break;
      case TimeRange.MONTH:
        start.setDate(1);
        break;
      case TimeRange.QUARTER:
        const quarter = Math.floor(now.getMonth() / 3);
        start = new Date(now.getFullYear(), quarter * 3, 1);
        break;
      case TimeRange.YEAR:
        start = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        start.setDate(1); // Default to month
    }

    return {
      startDate: start,
      endDate: now,
    };
  }
}
