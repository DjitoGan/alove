/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                        PARTS SERVICE — Catalog Search & Filtering Logic                            ║
 * ║  Implements: Full-text search, price/vendor filtering, pagination, sorting                        ║
 * ║  Database: PostgreSQL with Prisma ORM; could integrate Meilisearch later for better UX            ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 *
 * [1] KEY FEATURES
 *     [1a] Search: Case-insensitive substring match on part title
 *     [1b] Filters: By vendor, price range (min/max), with AND logic
 *     [1c] Sorting: By creation date (newest), price (asc/desc), stock level
 *     [1d] Pagination: Offset-based (skip/take) with hasMore flag
 *     [1e] Performance: Single database transaction for count + data fetch (atomic)
 *
 * [2] SEARCH IMPLEMENTATION (CURRENT)
 *     [2a] Case-insensitive: Prisma.QueryMode.insensitive (ignores UPPER/lower case)
 *     [2b] Substring match: contains (not exact match)
 *     [2c] Problem: No typo tolerance (searching "batry" won't find "battery")
 *     [2d] Future: Integrate Meilisearch for typo-tolerant search (fast, West Africa friendly)
 *
 * [3] WHY THIS DESIGN?
 *     [3a] Prisma: Type-safe database queries (prevents SQL injection)
 *     [3b] WHERE clause: Builds dynamic filters only if provided
 *     [3c] Transaction: count() + findMany() atomic = prevents race conditions
 *     [3d] Pagination: Prevents loading entire table (memory efficient)
 *     [3e] hasMore flag: Frontend knows if more results exist (infinite scroll support)
 */

import { Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ListPartsDto, SortOption } from './dto/list-parts.dto';

@Injectable()
export class PartsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * [4] LIST PARTS WITH FILTERS, SORTING, PAGINATION
   *     [4a] Input: ListPartsDto { search?, vendorId?, minPrice?, maxPrice?, sort?, page, pageSize, includeVendor? }
   *     [4b] Output: { items: Part[], page, pageSize, total, hasMore }
   *     [4c] Process:
   *         1. Build WHERE clause from filters
   *         2. Select ORDER BY clause from sort option
   *         3. Calculate skip (offset) for pagination
   *         4. Execute count() and findMany() in transaction
   *         5. Return paginated results with metadata
   *     [4d] WHY transaction? Ensures count matches items (prevent race conditions)
   */
  async list(q: ListPartsDto) {
    // [4.1] EXTRACT & DESTRUCTURE QUERY PARAMETERS
    const { page, pageSize, search, vendorId, minPrice, maxPrice, includeVendor, sort } = q;

    // [4.2] BUILD WHERE CLAUSE (FILTERS)
    //       WHY dynamic? Only include filters if provided (avoid unnecessary conditions)
    const where: Prisma.PartWhereInput = {};

    // [4.2a] SEARCH FILTER
    //        Case-insensitive substring search on title
    //        Example: search="battery" matches "Car Battery", "BATTERY PACK", "battey"... no, typos don't match
    if (search) {
      where.title = { contains: search, mode: Prisma.QueryMode.insensitive };
    }

    // [4.2b] VENDOR FILTER
    //        Only show parts from specific seller
    if (vendorId) {
      where.vendorId = vendorId;
    }

    // [4.2c] PRICE RANGE FILTER
    //        minPrice <= price <= maxPrice
    //        Note: Uses Prisma.Decimal for decimal prices (don't use floats in financial data!)
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined)
        (where.price as Prisma.DecimalFilter).gte = new Prisma.Decimal(minPrice);
      if (maxPrice !== undefined)
        (where.price as Prisma.DecimalFilter).lte = new Prisma.Decimal(maxPrice);
    }

    // [4.3] SELECT SORT OPTION
    //       Different sort orders for different UX
    let orderBy: Prisma.PartOrderByWithRelationInput = { createdAt: 'desc' };

    switch (sort) {
      // [4.3a] NEW (default): Most recently added first
      case SortOption.NEW:
        orderBy = { createdAt: 'desc' };
        break;

      // [4.3b] PRICE_ASC: Cheapest first (budget shoppers)
      case SortOption.PRICE_ASC:
        orderBy = { price: 'asc' };
        break;

      // [4.3c] PRICE_DESC: Most expensive first (premium parts)
      case SortOption.PRICE_DESC:
        orderBy = { price: 'desc' };
        break;

      // [4.3d] STOCK_DESC: In-stock items first (avoid out-of-stock)
      case SortOption.STOCK_DESC:
        orderBy = { stock: 'desc' };
        break;
    }

    // [4.4] CALCULATE PAGINATION OFFSETS
    //       Example: page=2, pageSize=20 → skip=20 (results 20-39)
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    // [4.5] FETCH RESULTS (TRANSACTION FOR ATOMICITY)
    //       Execute count() and findMany() together in single transaction
    //       WHY? Prevents race condition: total count = count at query time
    const [items, total] = await this.prisma.$transaction([
      // [4.5a] FETCH ITEMS PAGE
      //        Apply filters, sort, pagination
      this.prisma.part.findMany({
        where,
        orderBy,
        skip,
        take,
        // [4.5a-i] Include vendor details if requested
        //          For catalog list: includeVendor=false (faster, smaller payload)
        //          For detail page: includeVendor=true (show seller info)
        include: includeVendor ? { vendor: true } : undefined,
      }),

      // [4.5b] COUNT TOTAL MATCHING ITEMS
      //        Total items matching filters (used for pagination UI)
      this.prisma.part.count({ where }),
    ]);

    // [4.6] RETURN RESULTS WITH PAGINATION METADATA
    return {
      items, // Array of Part objects
      page, // Current page (1-based)
      pageSize, // Items per page
      total, // Total items matching filters
      hasMore: skip + items.length < total, // True if more pages exist (for infinite scroll)
    };
  }

  /**
   * [5] FETCH SINGLE PART BY ID
   *     [5a] Input: id (UUID)
   *     [5b] Output: Part { id, title, description, price, stock, vendor, ... }
   *     [5c] Returns null if not found (handled by controller)
   *     [5d] Always includes vendor info (caller wants full context)
   */
  async byId(id: string) {
    return this.prisma.part.findUnique({
      where: { id },
      include: { vendor: true }, // Always include vendor for detail page
    });
  }
}
