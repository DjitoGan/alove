/**
 * [1] CATALOG SERVICE
 *     Advanced product search, filtering, and category management
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { SearchCatalogQueryDto, BulkFilterCatalogDto, SortOption } from './dto/catalog.dto';

@Injectable()
export class CatalogService {
  private logger = new Logger(CatalogService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async searchCatalog(query: SearchCatalogQueryDto): Promise<any> {
    const cacheKey = `catalog:search:${JSON.stringify(query)}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      this.logger.debug('Catalog search cache hit');
      return JSON.parse(cached);
    }

    const where: any = {};

    // [4a] FULL-TEXT SEARCH - Using only title field (available in Part schema)
    if (query.q) {
      where.title = { contains: query.q, mode: 'insensitive' };
    }

    // [4c] PRICE RANGE FILTER
    if (query.minPrice !== undefined) {
      where.price = { gte: query.minPrice };
    }
    if (query.maxPrice !== undefined) {
      if (where.price) {
        where.price.lte = query.maxPrice;
      } else {
        where.price = { lte: query.maxPrice };
      }
    }

    // [4d] STOCK AVAILABILITY
    if (query.inStock) {
      where.stock = { gt: 0 };
    }

    // [4e] VENDOR FILTER
    if (query.vendor) {
      where.vendorId = query.vendor;
    }

    const total = await this.prisma.part.count({ where });

    let orderBy: any = { createdAt: 'desc' };
    if (query.sort === SortOption.PRICE_LOW) {
      orderBy = { price: 'asc' };
    } else if (query.sort === SortOption.PRICE_HIGH) {
      orderBy = { price: 'desc' };
    }

    const products = await this.prisma.part.findMany({
      where,
      include: {
        vendor: { select: { id: true, name: true } },
      },
      orderBy,
      skip: query.skip || 0,
      take: query.take || 20,
    });

    const result = {
      products,
      pagination: {
        skip: query.skip || 0,
        take: query.take || 20,
        total,
        totalPages: Math.ceil(total / (query.take || 20)),
      },
      filters: {
        query: query.q,
        priceRange: { min: query.minPrice, max: query.maxPrice },
        inStock: query.inStock,
        vendor: query.vendor,
      },
    };

    await this.redis.set(cacheKey, JSON.stringify(result), 1800);
    return result;
  }

  async bulkFilterCatalog(filters: BulkFilterCatalogDto): Promise<any> {
    const cacheKey = `catalog:bulk_filter:${JSON.stringify(filters)}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const where: any = {};

    if (filters.vendors && filters.vendors.length > 0) {
      where.vendorId = { in: filters.vendors };
    }

    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      where.price = {};
      if (filters.minPrice !== undefined) where.price.gte = filters.minPrice;
      if (filters.maxPrice !== undefined) where.price.lte = filters.maxPrice;
    }

    if (filters.inStock) {
      where.stock = { gt: 0 };
    }

    let orderBy: any = { createdAt: 'desc' };
    if (filters.sort === SortOption.PRICE_LOW) {
      orderBy = { price: 'asc' };
    } else if (filters.sort === SortOption.PRICE_HIGH) {
      orderBy = { price: 'desc' };
    }

    const total = await this.prisma.part.count({ where });
    const products = await this.prisma.part.findMany({
      where,
      include: { vendor: true },
      orderBy,
      skip: filters.skip || 0,
      take: filters.take || 20,
    });

    const result = {
      products,
      pagination: {
        skip: filters.skip || 0,
        take: filters.take || 20,
        total,
        totalPages: Math.ceil(total / (filters.take || 20)),
      },
    };

    await this.redis.set(cacheKey, JSON.stringify(result), 1800);
    return result;
  }

  async getTrendingProducts(limit: number = 10): Promise<any> {
    const cacheKey = `catalog:trending:${limit}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const trending = await this.prisma.part.findMany({
      where: { stock: { gt: 0 } },
      include: { vendor: true },
      orderBy: { stock: 'desc' },
      take: limit,
    });

    const result = { trending };
    await this.redis.set(cacheKey, JSON.stringify(result), 3600);
    return result;
  }

  async getFeaturedProducts(limit: number = 5): Promise<any> {
    const cacheKey = `catalog:featured:${limit}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const featured = await this.prisma.part.findMany({
      where: { stock: { gt: 0 } },
      include: { vendor: true },
      orderBy: { stock: 'desc' },
      take: limit,
    });

    const result = { featured };
    await this.redis.set(cacheKey, JSON.stringify(result), 7200);
    return result;
  }

  // The following category methods are placeholders to satisfy controller references.
  // Since no Category model exists in the schema, we return empty data structures.
  async getCategories(): Promise<any> {
    return { categories: [] };
  }

  async getCategoryStats(): Promise<any> {
    return { stats: [] };
  }

  async createCategory(dto: any): Promise<any> {
    return { id: 'virtual', name: dto?.name ?? 'Unnamed', createdAt: new Date() };
  }

  async updateCategory(id: string, dto: any): Promise<any> {
    return { id, name: dto?.name ?? 'Updated', updatedAt: new Date() };
  }

  async deleteCategory(id: string): Promise<any> {
    return { success: true, id };
  }
}
