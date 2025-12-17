/**
 * [1] ANALYTICS DTO - REVENUE METRICS
 *     Revenue breakdown by period, payment method, order status
 */

import { IsOptional, IsEnum, IsDateString, IsNumber, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export enum TimeRange {
  TODAY = 'TODAY',
  WEEK = 'WEEK',
  MONTH = 'MONTH',
  QUARTER = 'QUARTER',
  YEAR = 'YEAR',
}

export enum MetricType {
  REVENUE = 'REVENUE',
  ORDERS = 'ORDERS',
  CUSTOMERS = 'CUSTOMERS',
  PRODUCTS = 'PRODUCTS',
  REFUNDS = 'REFUNDS',
}

export class GetMetricsQueryDto {
  // [2] TIME RANGE (DEFAULT: THIS MONTH)
  @IsOptional()
  @IsEnum(TimeRange)
  timeRange?: TimeRange = TimeRange.MONTH;

  // [3] CUSTOM DATE RANGE (OVERRIDES timeRange)
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  // [4] METRIC TYPE (WHAT TO SHOW)
  @IsOptional()
  @IsEnum(MetricType)
  metric?: MetricType = MetricType.REVENUE;

  // [5] GRANULARITY (DAILY, WEEKLY, MONTHLY)
  @IsOptional()
  @IsEnum(['daily', 'weekly', 'monthly'])
  granularity?: 'daily' | 'weekly' | 'monthly' = 'daily';

  // [6] BREAKDOWN (BY WHAT?)
  @IsOptional()
  @IsEnum(['paymentMethod', 'status', 'category', 'merchant'])
  groupBy?: 'paymentMethod' | 'status' | 'category' | 'merchant';
}

export class GetOrderAnalyticsDto {
  // [7] TIME RANGE
  @IsOptional()
  @IsEnum(TimeRange)
  timeRange?: TimeRange = TimeRange.MONTH;

  // [8] ORDER STATUS FILTER
  @IsOptional()
  @IsEnum(['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'])
  status?: string;

  // [9] MINIMUM ORDER VALUE
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(0)
  minOrderValue?: number;
}

export class GetProductAnalyticsDto {
  // [10] TOP N PRODUCTS
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(1)
  limit?: number = 10;

  // [11] SORT BY
  @IsOptional()
  @IsEnum(['sales', 'revenue', 'views'])
  sortBy?: 'sales' | 'revenue' | 'views' = 'revenue';

  // [12] TIME RANGE
  @IsOptional()
  @IsEnum(TimeRange)
  timeRange?: TimeRange = TimeRange.MONTH;
}

export class GetCustomerAnalyticsDto {
  // [13] SEGMENT
  @IsOptional()
  @IsEnum(['new', 'returning', 'vip', 'inactive'])
  segment?: 'new' | 'returning' | 'vip' | 'inactive';

  // [14] TIME RANGE
  @IsOptional()
  @IsEnum(TimeRange)
  timeRange?: TimeRange = TimeRange.MONTH;

  // [15] LIMIT RESULTS
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(1)
  limit?: number = 20;
}
