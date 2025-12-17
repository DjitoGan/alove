/**
 * [1] CATALOG MODULE
 *     Advanced product search and category management
 *     Features:
 *       - Full-text search with filters (category, price, vendor, rating, stock)
 *       - Advanced sorting (newest, price, popularity, rating)
 *       - Category hierarchy (parent/child categories)
 *       - Trending and featured products
 *       - Category statistics dashboard
 *       - Redis caching (30 min for searches, 1-2 hours for categories)
 */

import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  // [2] IMPORTS
  //     - PrismaModule: Product, Category, Vendor queries
  //     - RedisModule: Caching search results and category trees
  imports: [PrismaModule, RedisModule],

  // [3] CONTROLLERS
  //     - CatalogController: HTTP endpoints at /v1/catalog
  controllers: [CatalogController],

  // [4] PROVIDERS
  //     - CatalogService: Search, filtering, category management logic
  providers: [CatalogService],

  // [5] EXPORTS
  //     Export CatalogService for use by other modules if needed
  exports: [CatalogService],
})
export class CatalogModule {}
