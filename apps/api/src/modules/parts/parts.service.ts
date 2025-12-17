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
   *     [5b] Output: Part { id, title, description, price, stock, vendor, fitments, images, ... }
   *     [5c] Returns null if not found (handled by controller)
   *     [5d] Always includes vendor info, images, and YMM fitments
   */
  async byId(id: string) {
    return this.prisma.part.findUnique({
      where: { id },
      include: {
        vendor: true,
        images: { orderBy: { sortOrder: 'asc' } },
        fitments: {
          include: {
            engine: {
              include: {
                year: {
                  include: {
                    model: {
                      include: { make: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  /**
   * [6] CREATE A NEW PART (US-CAT-301)
   *     [6a] Validates: vendor exists, all engineIds exist
   *     [6b] Creates part with OEM refs and fitments in single transaction
   *     [6c] Returns created part with all relations
   */
  async create(data: {
    title: string;
    description?: string;
    price: number;
    currency?: string;
    stock: number;
    condition: string;
    status?: string;
    oemRefs: string[];
    engineIds: string[];
    city?: string;
    country?: string;
    vendorId: string;
  }) {
    // [6.1] Verify vendor exists
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: data.vendorId },
    });
    if (!vendor) {
      throw new Error(`Vendor not found: ${data.vendorId}`);
    }

    // [6.2] Verify all engineIds exist
    const engines = await this.prisma.engineSpec.findMany({
      where: { id: { in: data.engineIds } },
    });
    if (engines.length !== data.engineIds.length) {
      const foundIds = engines.map((e) => e.id);
      const missingIds = data.engineIds.filter((id) => !foundIds.includes(id));
      throw new Error(`Engine specs not found: ${missingIds.join(', ')}`);
    }

    // [6.3] Create part with fitments in transaction
    const part = await this.prisma.part.create({
      data: {
        title: data.title,
        description: data.description,
        price: data.price,
        currency: data.currency || 'XOF',
        stock: data.stock,
        condition: data.condition as any, // Cast to enum
        status: (data.status as any) || 'DRAFT',
        oemRefs: data.oemRefs,
        city: data.city,
        country: data.country || 'TG',
        vendorId: data.vendorId,
        // Create fitments for each engine
        fitments: {
          create: data.engineIds.map((engineId) => ({
            engineId,
          })),
        },
      },
      include: {
        vendor: true,
        images: true,
        fitments: {
          include: {
            engine: {
              include: {
                year: {
                  include: {
                    model: { include: { make: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    return part;
  }

  /**
   * [7] UPDATE AN EXISTING PART
   *     [7a] Partial update (only provided fields)
   *     [7b] If engineIds provided, replaces all fitments
   *     [7c] Returns updated part with all relations
   */
  async update(
    id: string,
    data: {
      title?: string;
      description?: string;
      price?: number;
      currency?: string;
      stock?: number;
      condition?: string;
      status?: string;
      oemRefs?: string[];
      engineIds?: string[];
      city?: string;
      country?: string;
    },
  ) {
    // [7.1] Verify part exists
    const existingPart = await this.prisma.part.findUnique({ where: { id } });
    if (!existingPart) {
      return null;
    }

    // [7.2] If engineIds provided, verify they exist
    if (data.engineIds && data.engineIds.length > 0) {
      const engines = await this.prisma.engineSpec.findMany({
        where: { id: { in: data.engineIds } },
      });
      if (engines.length !== data.engineIds.length) {
        const foundIds = engines.map((e) => e.id);
        const missingIds = data.engineIds.filter((eId) => !foundIds.includes(eId));
        throw new Error(`Engine specs not found: ${missingIds.join(', ')}`);
      }
    }

    // [7.3] Update part (and fitments if engineIds provided)
    const part = await this.prisma.$transaction(async (tx) => {
      // Delete existing fitments if replacing
      if (data.engineIds && data.engineIds.length > 0) {
        await tx.partFitment.deleteMany({ where: { partId: id } });
      }

      // Update part
      return tx.part.update({
        where: { id },
        data: {
          ...(data.title && { title: data.title }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.price !== undefined && { price: data.price }),
          ...(data.currency && { currency: data.currency }),
          ...(data.stock !== undefined && { stock: data.stock }),
          ...(data.condition && { condition: data.condition as any }),
          ...(data.status && { status: data.status as any }),
          ...(data.oemRefs && { oemRefs: data.oemRefs }),
          ...(data.city !== undefined && { city: data.city }),
          ...(data.country && { country: data.country }),
          // Create new fitments if engineIds provided
          ...(data.engineIds &&
            data.engineIds.length > 0 && {
              fitments: {
                create: data.engineIds.map((engineId) => ({ engineId })),
              },
            }),
        },
        include: {
          vendor: true,
          images: true,
          fitments: {
            include: {
              engine: {
                include: {
                  year: {
                    include: {
                      model: { include: { make: true } },
                    },
                  },
                },
              },
            },
          },
        },
      });
    });

    return part;
  }

  /**
   * [8] DELETE A PART
   *     [8a] Soft delete would be better for production (set status=ARCHIVED)
   *     [8b] Currently hard deletes (cascade deletes fitments, images)
   *     [8c] Returns deleted part or null if not found
   */
  async delete(id: string) {
    const existingPart = await this.prisma.part.findUnique({ where: { id } });
    if (!existingPart) {
      return null;
    }

    return this.prisma.part.delete({
      where: { id },
      include: { vendor: true },
    });
  }

  /**
   * [9] PUBLISH A PART (shortcut to set status=PUBLISHED)
   *     [9a] Validates part has required data before publishing
   *     [9b] Returns updated part or null if not found
   */
  async publish(id: string) {
    const part = await this.prisma.part.findUnique({
      where: { id },
      include: { fitments: true },
    });

    if (!part) {
      return null;
    }

    // Validate: must have OEM refs and fitments to publish
    if (part.oemRefs.length === 0) {
      throw new Error('Cannot publish: at least 1 OEM reference is required');
    }
    if (part.fitments.length === 0) {
      throw new Error('Cannot publish: at least 1 compatible engine is required');
    }

    return this.prisma.part.update({
      where: { id },
      data: { status: 'PUBLISHED' },
      include: {
        vendor: true,
        fitments: {
          include: {
            engine: {
              include: {
                year: {
                  include: {
                    model: { include: { make: true } },
                  },
                },
              },
            },
          },
        },
      },
    });
  }
}
