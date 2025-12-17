/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                        PARTS CONTROLLER — Vehicle Parts Catalog                                    ║
 * ║  Handles: search, filter, sort automotive parts by YMM (Year/Make/Model), price, vendor           ║
 * ║  Routes: GET /v1/parts (list), GET /v1/parts/:id (detail)                                         ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 *
 * [1] ENDPOINTS
 *     [1a] GET /v1/parts?search=battery&vendorId=abc&minPrice=100&maxPrice=500&sort=price_asc&page=1
 *          Returns paginated list of parts matching filters
 *     [1b] GET /v1/parts/:id
 *          Returns full details of single part including vendor info
 *
 * [2] QUERY PARAMETERS (OPTIONAL, all have defaults)
 *     [2a] search: string (case-insensitive substring match on title)
 *     [2b] vendorId: string (filter by seller)
 *     [2c] minPrice, maxPrice: number (price range filter)
 *     [2d] sort: 'new' | 'price_asc' | 'price_desc' | 'stock_desc'
 *     [2e] page: number (default 1; used with pageSize for pagination)
 *     [2f] pageSize: number (default 20; results per page)
 *     [2g] includeVendor: boolean (default true; include vendor details in response)
 *
 * [3] WHY THIS DESIGN?
 *     [3a] Query params (not body) for GET: RESTful standard, cacheable
 *     [3b] Filters in service layer: Business logic separate from HTTP
 *     [3c] Pagination required: Parts table could have 100k+ items
 *     [3d] Sorting options: UX (newest first, cheapest first, etc.)
 *     [3e] No auth required: Catalog is public (anonymous users can browse)
 */

import { Controller, Get, Param, Query, NotFoundException } from '@nestjs/common';
import { PartsService } from './parts.service';
import { ListPartsDto } from './dto/list-parts.dto';
import { IdParam } from './dto/id.param';

@Controller('v1/parts')
export class PartsController {
  constructor(private readonly parts: PartsService) {}

  /**
   * [4] GET /v1/parts (LIST WITH FILTERS & PAGINATION)
   *     [4a] Query params: Validated by ListPartsDto (see DTO for details)
   *     [4b] Returns: { items: Part[], page, pageSize, total, hasMore: boolean }
   *     [4c] NO authentication required: Public catalog
   *     [4d] Example: GET /v1/parts?search=battery&minPrice=10&maxPrice=200&page=1&pageSize=20
   *     [4e] WHY ListPartsDto? Validates page >= 1, pageSize <= 100, etc. prevents abuse
   */
  @Get()
  async list(@Query() q: ListPartsDto) {
    // Delegate to service for filtering, sorting, pagination logic
    return this.parts.list(q);
  }

  /**
   * [5] GET /v1/parts/:id (FETCH SINGLE PART DETAIL)
   *     [5a] Param: id (UUID of part)
   *     [5b] Returns: Part { id, title, description, price, stock, vendor, ... }
   *     [5c] Includes vendor info (name, rating, location)
   *     [5d] NO authentication required: Public catalog
   *     [5e] Error: 404 NotFound if part doesn't exist
   *     [5f] Example: GET /v1/parts/550e8400-e29b-41d4-a716-446655440000
   */
  @Get(':id')
  async byId(@Param() { id }: IdParam) {
    const part = await this.parts.byId(id);

    // [5.1] Throw 404 if not found (NestJS converts to HTTP 404 response)
    if (!part) throw new NotFoundException('Part not found');

    return part;
  }
}
