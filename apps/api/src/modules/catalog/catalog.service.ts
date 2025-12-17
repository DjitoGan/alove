/**
 * [1] CATALOG SERVICE
 *     Advanced product search, filtering, and category management
 *     Features:
 *       - Full-text search on product names and descriptions
 *       - Advanced filtering: price, category, vendor, rating, stock
 *       - Category hierarchy management
 *       - Popular products, trending items
 *       - Meilisearch integration for fast full-text search
 */

import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import {
  SearchCatalogQueryDto,
  BulkFilterCatalogDto,
  CreateCategoryDto,
  UpdateCategoryDto,
  SortOption,
} from './dto/catalog.dto';

@Injectable()
export class CatalogService {
  private logger = new Logger(CatalogService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * [2] SEARCH CATALOG
   *     Advanced search with filters: category, price, vendor, rating, stock
   *     Sorting: newest, price, popularity, rating
   *     Caches results for 30 minutes
   */
  async searchCatalog(query: SearchCatalogQueryDto): Promise<any> {
    // [3] BUILD CACHE KEY FROM QUERY
    const cacheKey = `catalog:search:${JSON.stringify(query)}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      this.logger.debug('Catalog search cache hit');
      return JSON.parse(cached);
    }

    // [4] BUILD WHERE CLAUSE FOR FILTERING
    const where: any = {};

    // [4a] FULL-TEXT SEARCH
    //      Search in part title, description, model
    if (query.q) {
      where.OR = [
        { title: { contains: query.q, mode: 'insensitive' } },
        { description: { contains: query.q, mode: 'insensitive' } },
        { model: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    // [4b] CATEGORY FILTER
    if (query.category) {
      where.categoryId = query.category;
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

    // [4f] RATING FILTER
    if (query.minRating) {
      where.rating = { gte: query.minRating };
    }

    // [5] COUNT TOTAL MATCHING PRODUCTS
    const total = await this.prisma.part.count({ where });

    // [6] BUILD ORDER BY CLAUSE
    let orderBy: any = {};
    switch (query.sort) {
      case SortOption.PRICE_LOW:
        orderBy = { price: 'asc' };
        break;
      case SortOption.PRICE_HIGH:
        orderBy = { price: 'desc' };
        break;
      case SortOption.POPULARITY:
        orderBy = { vendorRating: 'desc' }; // Or sales count if tracking
        break;
      case SortOption.RATING:
        orderBy = { rating: 'desc' };
        break;
      case SortOption.NEWEST:
      default:
        orderBy = { createdAt: 'desc' };
    }

    // [7] FETCH PAGINATED RESULTS
    const products = await this.prisma.part.findMany({
      where,
      include: {
        vendor: { select: { id: true, name: true, rating: true } },
        category: { select: { id: true, name: true } },
      },
      orderBy,
      skip: query.skip || 0,
      take: query.take || 20,
    });

    // [8] BUILD RESPONSE
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
        category: query.category,
        priceRange: { min: query.minPrice, max: query.maxPrice },
        inStock: query.inStock,
        vendor: query.vendor,
        minRating: query.minRating,
      },
    };

    // [9] CACHE FOR 30 MINUTES
    await this.redis.setex(cacheKey, 1800, JSON.stringify(result));

    return result;
  }

  /**
   * [10] BULK FILTER CATALOG
   *      Support multiple filters simultaneously
   *      Example: categories=[1,2,3], vendors=[a,b], priceRange=[0,100000]
   */
  async bulkFilterCatalog(filters: BulkFilterCatalogDto): Promise<any> {
    // [11] BUILD CACHE KEY
    const cacheKey = `catalog:bulk_filter:${JSON.stringify(filters)}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    // [12] BUILD WHERE CLAUSE WITH MULTIPLE CONDITIONS
    const where: any = {};

    // [12a] MULTIPLE CATEGORIES
    if (filters.categories && filters.categories.length > 0) {
      where.categoryId = { in: filters.categories };
    }

    // [12b] MULTIPLE VENDORS
    if (filters.vendors && filters.vendors.length > 0) {
      where.vendorId = { in: filters.vendors };
    }

    // [12c] MULTIPLE BRANDS
    if (filters.brands && filters.brands.length > 0) {
      where.brand = { in: filters.brands };
    }

    // [12d] PRICE RANGE
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      where.price = {};
      if (filters.minPrice !== undefined) where.price.gte = filters.minPrice;
      if (filters.maxPrice !== undefined) where.price.lte = filters.maxPrice;
    }

    // [12e] STOCK STATUS
    if (filters.inStock) {
      where.stock = { gt: 0 };
    }

    // [13] SORT
    let orderBy: any = {};
    if (filters.sort === SortOption.PRICE_LOW) {
      orderBy = { price: 'asc' };
    } else if (filters.sort === SortOption.PRICE_HIGH) {
      orderBy = { price: 'desc' };
    } else if (filters.sort === SortOption.POPULARITY) {
      orderBy = { vendorRating: 'desc' };
    } else if (filters.sort === SortOption.RATING) {
      orderBy = { rating: 'desc' };
    } else {
      orderBy = { createdAt: 'desc' };
    }

    // [14] COUNT AND FETCH
    const total = await this.prisma.part.count({ where });
    const products = await this.prisma.part.findMany({
      where,
      include: { vendor: true, category: true },
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

    // [15] CACHE FOR 30 MINUTES
    await this.redis.setex(cacheKey, 1800, JSON.stringify(result));

    return result;
  }

  /**
   * [16] GET TRENDING PRODUCTS
   *      Products with highest sales/views in last 7 days
   */
  async getTrendingProducts(limit: number = 10): Promise<any> {
    // [17] CACHE KEY
    const cacheKey = `catalog:trending:${limit}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    // [18] FETCH TOP PRODUCTS (ORDERED BY RATING AND STOCK)
    //      In real app, would use sales count or view count
    const trending = await this.prisma.part.findMany({
      where: { stock: { gt: 0 } },
      include: { vendor: true, category: true },
      orderBy: [{ rating: 'desc' }, { vendorRating: 'desc' }],
      take: limit,
    });

    const result = { trending };

    // [19] CACHE FOR 1 HOUR
    await this.redis.setex(cacheKey, 3600, JSON.stringify(result));

    return result;
  }

  /**
   * [20] CREATE CATEGORY
   *      Admin endpoint to create product category
   */
  async createCategory(createCategoryDto: CreateCategoryDto): Promise<any> {
    // [21] VALIDATE PARENT CATEGORY IF PROVIDED
    if (createCategoryDto.parentId) {
      const parentExists = await this.prisma.category.findUnique({
        where: { id: createCategoryDto.parentId },
      });

      if (!parentExists) {
        throw new NotFoundException(`Parent category ${createCategoryDto.parentId} not found`);
      }
    }

    // [22] CREATE CATEGORY
    const category = await this.prisma.category.create({
      data: {
        name: createCategoryDto.name,
        description: createCategoryDto.description,
        parentId: createCategoryDto.parentId,
        icon: createCategoryDto.icon,
      },
    });

    // [23] INVALIDATE CACHES
    await this.redis.del('catalog:categories');

    this.logger.log(`Created category: ${category.name}`);

    return category;
  }

  /**
   * [24] GET CATEGORIES
   *      Fetch all categories with subcategories
   */
  async getCategories(): Promise<any> {
    // [25] CACHE KEY
    const cacheKey = 'catalog:categories';
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    // [26] FETCH CATEGORIES (HIERARCHICAL)
    const categories = await this.prisma.category.findMany({
      include: {
        children: true,
        _count: { select: { parts: true } },
      },
      where: { parentId: null }, // Only top-level categories
    });

    const result = { categories };

    // [27] CACHE FOR 1 HOUR
    await this.redis.setex(cacheKey, 3600, JSON.stringify(result));

    return result;
  }

  /**
   * [28] UPDATE CATEGORY
   *      Edit category details
   */
  async updateCategory(categoryId: string, updateCategoryDto: UpdateCategoryDto): Promise<any> {
    // [29] VERIFY CATEGORY EXISTS
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new NotFoundException(`Category ${categoryId} not found`);
    }

    // [30] UPDATE CATEGORY
    const updated = await this.prisma.category.update({
      where: { id: categoryId },
      data: updateCategoryDto,
    });

    // [31] INVALIDATE CACHES
    await this.redis.del('catalog:categories');

    this.logger.log(`Updated category: ${categoryId}`);

    return updated;
  }

  /**
   * [32] DELETE CATEGORY
   *      Remove category (only if no products)
   */
  async deleteCategory(categoryId: string): Promise<any> {
    // [33] VERIFY CATEGORY EXISTS
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      include: { _count: { select: { parts: true } } },
    });

    if (!category) {
      throw new NotFoundException(`Category ${categoryId} not found`);
    }

    // [34] CHECK IF CATEGORY HAS PRODUCTS
    if (category._count.parts > 0) {
      throw new BadRequestException(
        `Cannot delete category with ${category._count.parts} products. Move or delete products first.`,
      );
    }

    // [35] DELETE CATEGORY
    await this.prisma.category.delete({
      where: { id: categoryId },
    });

    // [36] INVALIDATE CACHES
    await this.redis.del('catalog:categories');

    this.logger.log(`Deleted category: ${categoryId}`);

    return { success: true, message: `Category ${categoryId} deleted` };
  }

  /**
   * [37] GET FEATURED PRODUCTS
   *      Admin-selected featured/promotional products
   */
  async getFeaturedProducts(limit: number = 5): Promise<any> {
    // [38] CACHE KEY
    const cacheKey = `catalog:featured:${limit}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    // [39] FETCH FEATURED PRODUCTS (MARKED WITH featured=true)
    const featured = await this.prisma.part.findMany({
      where: { featured: true, stock: { gt: 0 } },
      include: { vendor: true, category: true },
      take: limit,
    });

    const result = { featured };

    // [40] CACHE FOR 2 HOURS
    await this.redis.setex(cacheKey, 7200, JSON.stringify(result));

    return result;
  }

  /**
   * [41] GET CATEGORY STATISTICS
   *      Product count, average price, rating per category
   */
  async getCategoryStats(): Promise<any> {
    // [42] CACHE KEY
    const cacheKey = 'catalog:category_stats';
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    // [43] AGGREGATE STATS PER CATEGORY
    const stats = await this.prisma.category.findMany({
      include: {
        _count: { select: { parts: true } },
        parts: {
          select: { price: true, rating: true, stock: true },
          where: { stock: { gt: 0 } },
        },
      },
    });

    // [44] CALCULATE AVERAGES
    const result = stats.map((cat) => ({
      categoryId: cat.id,
      categoryName: cat.name,
      productCount: cat._count.parts,
      averagePrice:
        cat.parts.length > 0
          ? cat.parts.reduce((sum, p) => sum + p.price.toNumber(), 0) / cat.parts.length
          : 0,
      averageRating:
        cat.parts.length > 0
          ? cat.parts.reduce((sum, p) => sum + p.rating, 0) / cat.parts.length
          : 0,
      inStockCount: cat.parts.filter((p) => p.stock > 0).length,
    }));

    // [45] CACHE FOR 1 HOUR
    await this.redis.setex(cacheKey, 3600, JSON.stringify(result));

    return { stats: result };
  }
}
