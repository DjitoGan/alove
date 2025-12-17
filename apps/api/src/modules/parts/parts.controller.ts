/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                        PARTS CONTROLLER — Vehicle Parts Catalog CRUD + Search                      ║
 * ║  Handles: search, filter, sort, create, update, delete automotive parts                           ║
 * ║  Routes: GET /parts (list), GET /parts/:id (detail), POST /parts, PATCH /parts/:id, DELETE        ║
 * ║          GET /parts/search (Meilisearch full-text with YMM filters)                               ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 *
 * [1] ENDPOINTS
 *     [1a] GET /parts?search=battery&vendorId=abc&minPrice=100&maxPrice=500&sort=price_asc&page=1
 *          Returns paginated list of parts matching filters (Prisma - basic)
 *     [1b] GET /parts/search?q=batry&make=Toyota&year=2020 (US-CAT-302)
 *          Full-text search with typo tolerance and YMM filters (Meilisearch)
 *     [1c] GET /parts/:id
 *          Returns full details of single part including vendor info, fitments, images
 *     [1d] POST /parts
 *          Create a new part with OEM refs and YMM fitments (requires auth)
 *     [1e] PATCH /parts/:id
 *          Update an existing part (partial update, requires auth)
 *     [1f] DELETE /parts/:id
 *          Delete a part (requires auth)
 *     [1g] POST /parts/:id/publish
 *          Publish a draft part (validates OEM + fitments, requires auth)
 *
 * [2] AUTHENTICATION
 *     [2a] GET endpoints: Public (catalog is browsable without auth)
 *     [2b] POST/PATCH/DELETE: Requires authentication (vendor or admin)
 *
 * [3] US-CAT-301 IMPLEMENTATION
 *     [3a] Create part with: title, condition, price, stock, images, OEM refs, ≥1 YMM fitment
 *     [3b] Validation: OEM refs required, at least 1 compatible engine required
 *     [3c] Publication: Only if valid (has OEM + fitments)
 *
 * [4] US-CAT-302 IMPLEMENTATION (Meilisearch Search)
 *     [4a] Typo tolerance: "batry" → "battery", "flitre" → "filtre"
 *     [4b] YMM filters: make, model, year, engine
 *     [4c] Price range, condition, location filters
 *     [4d] Facets for filter UI (count per make, model, etc.)
 *     [4e] Zero-results telemetry logging
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  NotFoundException,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PartsService } from './parts.service';
import { ListPartsDto } from './dto/list-parts.dto';
import { CreatePartDto } from './dto/create-part.dto';
import { UpdatePartDto } from './dto/update-part.dto';
import { SearchPartsDto, SearchSort } from './dto/search-parts.dto';
import { IdParam } from './dto/id.param';
import { MeilisearchService } from '../meilisearch/meilisearch.service';
import { SearchSyncService } from '../meilisearch/search-sync.service';

@ApiTags('parts')
@Controller('parts')
export class PartsController {
  constructor(
    private readonly parts: PartsService,
    private readonly meilisearch: MeilisearchService,
    private readonly searchSync: SearchSyncService,
  ) {}

  /**
   * [5] GET /parts (LIST WITH FILTERS & PAGINATION)
   *     Public endpoint - no auth required
   *     Basic Prisma-based filtering (for fallback or simple queries)
   */
  @Get()
  @ApiOperation({ summary: 'List parts with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Returns paginated list of parts' })
  async list(@Query() q: ListPartsDto) {
    return this.parts.list(q);
  }

  /**
   * [6] GET /parts/search (MEILISEARCH FULL-TEXT SEARCH - US-CAT-302)
   *     Public endpoint - no auth required
   *     Features:
   *     - Typo tolerance: "batry" finds "battery"
   *     - YMM filters: make, model, year, engine
   *     - Price range, condition, location filters
   *     - Facets for building filter UI
   *     - Zero-results telemetry
   */
  @Get('search')
  @ApiOperation({
    summary: 'Full-text search with typo tolerance and YMM filters (US-CAT-302)',
    description:
      'Uses Meilisearch for instant, typo-tolerant search. ' +
      'Returns facets for filter counts. Logs zero-result queries for telemetry.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns search results with facets and pagination',
  })
  async search(@Query() dto: SearchPartsDto) {
    const result = await this.meilisearch.searchParts(
      dto.q,
      {
        make: dto.make,
        model: dto.model,
        year: dto.year,
        engine: dto.engine,
        condition: dto.condition,
        minPrice: dto.minPrice,
        maxPrice: dto.maxPrice,
        vendorId: dto.vendorId,
        country: dto.country,
        city: dto.city,
      },
      dto.page,
      dto.limit,
      dto.sort === SearchSort.RELEVANCE ? undefined : dto.sort,
    );

    return {
      data: result.hits,
      meta: {
        query: result.query,
        total: result.totalHits,
        page: result.page,
        limit: result.hitsPerPage,
        totalPages: result.totalPages,
        processingTimeMs: result.processingTimeMs,
        isZeroResults: result.isZeroResults,
      },
      facets: result.facets,
    };
  }

  /**
   * [5] GET /parts/:id (FETCH SINGLE PART DETAIL)
   *     Public endpoint - no auth required
   *     Returns full part with vendor, images, and YMM fitments
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get part details by ID' })
  @ApiResponse({ status: 200, description: 'Returns part details with vendor and fitments' })
  @ApiResponse({ status: 404, description: 'Part not found' })
  async byId(@Param() { id }: IdParam) {
    const part = await this.parts.byId(id);
    if (!part) throw new NotFoundException('Part not found');
    return part;
  }

  /**
   * [7] POST /parts (CREATE NEW PART)
   *     Requires authentication (vendor/admin)
   *     Validates OEM refs and engine fitments
   *     ➜ Syncs to Meilisearch if published
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new part (US-CAT-301)' })
  @ApiResponse({ status: 201, description: 'Part created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error or invalid vendor/engine IDs' })
  async create(@Body() dto: CreatePartDto) {
    try {
      const part = await this.parts.create({
        title: dto.title,
        description: dto.description,
        price: dto.price,
        currency: dto.currency,
        stock: dto.stock,
        condition: dto.condition,
        status: dto.status,
        oemRefs: dto.oemRefs,
        engineIds: dto.engineIds,
        city: dto.city,
        country: dto.country,
        vendorId: dto.vendorId,
      });

      // Sync to Meilisearch (index if published)
      await this.searchSync.indexPart(part.id);

      return part;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new BadRequestException(message);
    }
  }

  /**
   * [8] PATCH /parts/:id (UPDATE EXISTING PART)
   *     Partial update - only provided fields are updated
   *     If engineIds provided, replaces all fitments
   *     ➜ Syncs to Meilisearch (re-index if published, remove if unpublished)
   */
  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an existing part' })
  @ApiResponse({ status: 200, description: 'Part updated successfully' })
  @ApiResponse({ status: 404, description: 'Part not found' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async update(@Param() { id }: IdParam, @Body() dto: UpdatePartDto) {
    try {
      const part = await this.parts.update(id, {
        title: dto.title,
        description: dto.description,
        price: dto.price,
        currency: dto.currency,
        stock: dto.stock,
        condition: dto.condition,
        status: dto.status,
        oemRefs: dto.oemRefs,
        engineIds: dto.engineIds,
        city: dto.city,
        country: dto.country,
      });

      if (!part) throw new NotFoundException('Part not found');

      // Sync to Meilisearch (re-index if published, remove if not)
      await this.searchSync.indexPart(part.id);

      return part;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) throw error;
      const message = error instanceof Error ? error.message : String(error);
      throw new BadRequestException(message);
    }
  }

  /**
   * [9] DELETE /parts/:id (DELETE A PART)
   *     Hard delete (cascades to fitments, images)
   *     ➜ Removes from Meilisearch index
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a part' })
  @ApiResponse({ status: 204, description: 'Part deleted successfully' })
  @ApiResponse({ status: 404, description: 'Part not found' })
  async delete(@Param() { id }: IdParam) {
    const deleted = await this.parts.delete(id);
    if (!deleted) throw new NotFoundException('Part not found');

    // Remove from Meilisearch index
    await this.searchSync.removePart(id);
  }

  /**
   * [10] POST /parts/:id/publish (PUBLISH A DRAFT PART)
   *      Validates part has OEM refs and at least 1 fitment
   *      ➜ Adds to Meilisearch index when published
   */
  @Post(':id/publish')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Publish a draft part (validates OEM + fitments)' })
  @ApiResponse({ status: 200, description: 'Part published successfully' })
  @ApiResponse({ status: 404, description: 'Part not found' })
  @ApiResponse({ status: 400, description: 'Cannot publish: missing OEM refs or fitments' })
  async publish(@Param() { id }: IdParam) {
    try {
      const part = await this.parts.publish(id);
      if (!part) throw new NotFoundException('Part not found');

      // Sync to Meilisearch (add to index now that it's published)
      await this.searchSync.indexPart(part.id);

      return part;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) throw error;
      const message = error instanceof Error ? error.message : String(error);
      throw new BadRequestException(message);
    }
  }
}
