/**
 * [1] ANALYTICS MODULE
 *     Dashboard metrics and business intelligence
 *     Features:
 *       - Revenue metrics by period, payment method, order status
 *       - Order analytics with status breakdown
 *       - Product performance (top sellers)
 *       - Customer segmentation and lifetime value
 *       - Refund analysis
 */

import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  // [2] IMPORTS
  //     - PrismaModule: Database aggregations
  //     - RedisModule: Caching (1 hour TTL for expensive queries)
  imports: [PrismaModule, RedisModule],

  // [3] CONTROLLERS
  //     - AnalyticsController: HTTP endpoints at /v1/analytics
  controllers: [AnalyticsController],

  // [4] PROVIDERS
  //     - AnalyticsService: Business metrics logic
  providers: [AnalyticsService],

  // [5] EXPORTS
  //     Export AnalyticsService for use by other modules if needed
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
