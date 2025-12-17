/**
 * [1] CATALOG CONTROLLER
 *     Advanced product search and category management endpoints
 *     Endpoints:
 *       - GET /v1/catalog/search (advanced search with filters)
 *       - POST /v1/catalog/filter (bulk filtering)
 *       - GET /v1/catalog/trending (trending products)
 *       - GET /v1/catalog/categories (category tree)
 *       - POST /v1/catalog/categories (create category)
 *       - PATCH /v1/catalog/categories/:id (update category)
 *       - DELETE /v1/catalog/categories/:id (delete category)
 *       - GET /v1/catalog/featured (featured products)
 *       - GET /v1/catalog/stats (category statistics)
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
} from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminOnlyGuard } from '../admin/guards/admin-only.guard';
import {
  SearchCatalogQueryDto,
  BulkFilterCatalogDto,
  CreateCategoryDto,
  UpdateCategoryDto,
} from './dto/catalog.dto';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  /**
   * [2] SEARCH CATALOG ENDPOINT
   *     GET /v1/catalog/search?q=cpu&category=processors&minPrice=0&maxPrice=100000&sort=price_low
   *     Query: SearchCatalogQueryDto
   *     Response: { products, pagination, filters }
   *     Use case: Product listing page with live search
   *     No authentication required
   *
   *     Examples:
   *       - GET /v1/catalog/search?q=ryzen → Search for "ryzen"
   *       - GET /v1/catalog/search?category=memory&sort=price_high → Most expensive RAM
   *       - GET /v1/catalog/search?minPrice=5000&maxPrice=50000 → Price range
   *       - GET /v1/catalog/search?vendor=corsair&sort=rating → Corsair products, best rated
   */
  @Get('search')
  async searchCatalog(
    @Query() query: SearchCatalogQueryDto,
  ) {
    const result = await this.catalogService.searchCatalog(query);

    return {
      success: true,
      data: result,
    };
  }

  /**
   * [3] BULK FILTER ENDPOINT
   *     POST /v1/catalog/filter
   *     Body: { categories: [id1, id2], vendors: [id1, id2], minPrice, maxPrice, sort }
   *     Response: { products, pagination }
   *     Use case: Advanced filters on category/collection pages
   *     No authentication required
   */
  @Post('filter')
  async bulkFilterCatalog(
    @Body() filters: BulkFilterCatalogDto,
  ) {
    const result = await this.catalogService.bulkFilterCatalog(filters);

    return {
      success: true,
      data: result,
    };
  }

  /**
   * [4] TRENDING PRODUCTS ENDPOINT
   *     GET /v1/catalog/trending?limit=10
   *     Response: { trending: [...products] }
   *     Use case: Homepage "trending now" section
   *     No authentication required
   */
  @Get('trending')
  async getTrendingProducts(
    @Query('limit') limit: string = '10',
  ) {
    const result = await this.catalogService.getTrendingProducts(parseInt(limit, 10));

    return {
      success: true,
      data: result,
    };
  }

  /**
   * [5] FEATURED PRODUCTS ENDPOINT
   *     GET /v1/catalog/featured?limit=5
   *     Response: { featured: [...products] }
   *     Use case: Homepage "featured" section (admin-selected)
   *     No authentication required
   */
  @Get('featured')
  async getFeaturedProducts(
    @Query('limit') limit: string = '5',
  ) {
    const result = await this.catalogService.getFeaturedProducts(parseInt(limit, 10));

    return {
      success: true,
      data: result,
    };
  }

  /**
   * [6] GET CATEGORIES ENDPOINT
   *     GET /v1/catalog/categories
   *     Response: { categories: [...with hierarchy and product count] }
   *     Use case: Category sidebar, breadcrumb navigation
   *     No authentication required
   */
  @Get('categories')
  async getCategories() {
    const result = await this.catalogService.getCategories();

    return {
      success: true,
      data: result,
    };
  }

  /**
   * [7] CATEGORY STATISTICS ENDPOINT
   *     GET /v1/catalog/stats
   *     Response: { stats: [{ categoryName, productCount, averagePrice, averageRating }] }
   *     Use case: Admin dashboard, category performance metrics
   *     Requires ADMIN role
   */
  @Get('stats')
  @UseGuards(JwtAuthGuard, AdminOnlyGuard)
  async getCategoryStats(
    @Request() req: any,
  ) {
    // [8] ADMIN ROLE VERIFIED BY AdminOnlyGuard
    const result = await this.catalogService.getCategoryStats();

    return {
      success: true,
      data: result,
    };
  }

  /**
   * [9] CREATE CATEGORY ENDPOINT
   *     POST /v1/catalog/categories
   *     Body: { name, description, parentId?, icon? }
   *     Response: { id, name, parentId, icon, createdAt }
   *     Use case: Admin creates new product category
   *     Requires ADMIN role
   */
  @Post('categories')
  @UseGuards(JwtAuthGuard, AdminOnlyGuard)
  @HttpCode(201)
  async createCategory(
    @Body() createCategoryDto: CreateCategoryDto,
    @Request() req: any,
  ) {
    // [10] ADMIN ROLE VERIFIED BY AdminOnlyGuard
    const category = await this.catalogService.createCategory(createCategoryDto);

    return {
      success: true,
      data: category,
      message: `Category ${category.name} created`,
    };
  }

  /**
   * [11] UPDATE CATEGORY ENDPOINT
   *      PATCH /v1/catalog/categories/:id
   *      Params: categoryId
   *      Body: { name?, description?, icon? }
   *      Response: { id, name, description, icon }
   *      Use case: Admin edits category details
   *      Requires ADMIN role
   */
  @Patch('categories/:id')
  @UseGuards(JwtAuthGuard, AdminOnlyGuard)
  async updateCategory(
    @Param('id') categoryId: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
    @Request() req: any,
  ) {
    // [12] ADMIN ROLE VERIFIED BY AdminOnlyGuard
    const category = await this.catalogService.updateCategory(categoryId, updateCategoryDto);

    return {
      success: true,
      data: category,
      message: `Category ${categoryId} updated`,
    };
  }

  /**
   * [13] DELETE CATEGORY ENDPOINT
   *      DELETE /v1/catalog/categories/:id
   *      Params: categoryId
   *      Response: { success: true, message }
   *      Use case: Admin removes category (only if empty)
   *      Requires ADMIN role
   */
  @Delete('categories/:id')
  @UseGuards(JwtAuthGuard, AdminOnlyGuard)
  async deleteCategory(
    @Param('id') categoryId: string,
    @Request() req: any,
  ) {
    // [14] ADMIN ROLE VERIFIED BY AdminOnlyGuard
    const result = await this.catalogService.deleteCategory(categoryId);

    return {
      success: true,
      data: result,
    };
  }
}
