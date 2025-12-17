/**
 * [1] ANALYTICS CONTROLLER
 *     Dashboard endpoints for business metrics and reports
 *     Endpoints:
 *       - GET /v1/analytics/metrics (revenue, orders, customers, products, refunds)
 *       - GET /v1/analytics/orders (order analytics by status, value)
 *       - GET /v1/analytics/products (top products by revenue/sales)
 *       - GET /v1/analytics/customers (customer segments and lifetime value)
 */

import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminOnlyGuard } from '../admin/guards/admin-only.guard';
import {
  GetMetricsQueryDto,
  GetOrderAnalyticsDto,
  GetProductAnalyticsDto,
  GetCustomerAnalyticsDto,
} from './dto/analytics.dto';

@Controller('analytics')
@UseGuards(JwtAuthGuard, AdminOnlyGuard) // Requires ADMIN role
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * [2] METRICS ENDPOINT
   *     GET /v1/analytics/metrics?timeRange=MONTH&metric=REVENUE&groupBy=paymentMethod
   *     Query: GetMetricsQueryDto
   *     Response: { totalRevenue, byPaymentMethod, byStatus }
   *     Use case: Dashboard main cards (revenue, orders, customers)
   *
   *     Examples:
   *       - GET /v1/analytics/metrics?metric=REVENUE → Total revenue this month
   *       - GET /v1/analytics/metrics?metric=ORDERS → Total orders this month
   *       - GET /v1/analytics/metrics?metric=REVENUE&groupBy=paymentMethod → Revenue by payment type
   *       - GET /v1/analytics/metrics?timeRange=YEAR&metric=REVENUE → Year-to-date revenue
   */
  @Get('metrics')
  async getMetrics(@Query() query: GetMetricsQueryDto, @Request() req: any) {
    // [3] ADMIN ROLE VERIFIED BY AdminOnlyGuard
    const metrics = await this.analyticsService.getMetrics(query);

    return {
      success: true,
      data: metrics,
      generatedAt: new Date(),
    };
  }

  /**
   * [4] ORDER ANALYTICS ENDPOINT
   *     GET /v1/analytics/orders?timeRange=MONTH&status=SHIPPED&minOrderValue=10000
   *     Query: GetOrderAnalyticsDto
   *     Response: { orders: [...], stats: { totalOrders, totalValue, averageValue } }
   *     Use case: Detailed order analysis for operations team
   *
   *     Examples:
   *       - GET /v1/analytics/orders → All orders this month
   *       - GET /v1/analytics/orders?status=DELIVERED → Delivered orders
   *       - GET /v1/analytics/orders?minOrderValue=50000 → Large orders
   *       - GET /v1/analytics/orders?timeRange=WEEK → This week's orders
   */
  @Get('orders')
  async getOrderAnalytics(@Query() query: GetOrderAnalyticsDto, @Request() req: any) {
    // [5] ADMIN ROLE VERIFIED BY AdminOnlyGuard
    const analytics = await this.analyticsService.getOrderAnalytics(query);

    return {
      success: true,
      data: analytics,
      generatedAt: new Date(),
    };
  }

  /**
   * [6] PRODUCT ANALYTICS ENDPOINT
   *     GET /v1/analytics/products?timeRange=MONTH&limit=20&sortBy=revenue
   *     Query: GetProductAnalyticsDto
   *     Response: { topProducts: [{ productId, revenue, quantity, orders }] }
   *     Use case: Top selling products, inventory management
   *
   *     Examples:
   *       - GET /v1/analytics/products → Top 10 products by revenue
   *       - GET /v1/analytics/products?sortBy=sales → Top products by quantity
   *       - GET /v1/analytics/products?limit=50 → Top 50 products
   *       - GET /v1/analytics/products?timeRange=YEAR → Year-long trends
   */
  @Get('products')
  async getProductAnalytics(@Query() query: GetProductAnalyticsDto, @Request() req: any) {
    // [7] ADMIN ROLE VERIFIED BY AdminOnlyGuard
    const analytics = await this.analyticsService.getProductAnalytics(query);

    return {
      success: true,
      data: analytics,
      generatedAt: new Date(),
    };
  }

  /**
   * [8] CUSTOMER ANALYTICS ENDPOINT
   *     GET /v1/analytics/customers?timeRange=MONTH&segment=new&limit=20
   *     Query: GetCustomerAnalyticsDto
   *     Response: { segment, customers: [{ id, email, orderCount, totalSpent, averageOrderValue }] }
   *     Use case: Customer segmentation, lifetime value analysis
   *
   *     Examples:
   *       - GET /v1/analytics/customers?segment=new → New customers this month
   *       - GET /v1/analytics/customers?segment=vip → High-value customers
   *       - GET /v1/analytics/customers?segment=inactive → Dormant customers
   *       - GET /v1/analytics/customers → Top 20 customers by spending
   */
  @Get('customers')
  async getCustomerAnalytics(@Query() query: GetCustomerAnalyticsDto, @Request() req: any) {
    // [9] ADMIN ROLE VERIFIED BY AdminOnlyGuard
    const analytics = await this.analyticsService.getCustomerAnalytics(query);

    return {
      success: true,
      data: analytics,
      generatedAt: new Date(),
    };
  }
}
