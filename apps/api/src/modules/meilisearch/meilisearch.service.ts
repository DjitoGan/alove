/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                        MEILISEARCH SERVICE — Search Engine Integration                             ║
 * ║  Implements US-CAT-302: Typo-tolerant search, YMM filters, zero-results telemetry                 ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 *
 * [1] FEATURES
 *     [1a] Typo tolerance: "batry" finds "battery", "flitre" finds "filtre"
 *     [1b] Instant search: Results in <50ms (vs ~800ms Postgres LIKE)
 *     [1c] Faceted filters: Filter by make, model, year, condition, price range
 *     [1d] Relevance ranking: Best matches first
 *
 * [2] INDEX STRUCTURE
 *     parts index contains:
 *     - id, title, description (searchable text)
 *     - oemRefs (searchable array)
 *     - price, stock, condition, status (filterable)
 *     - vendorId, vendorName, city, country (filterable)
 *     - makes, models, years, engines (filterable arrays from fitments)
 *
 * [3] SYNC STRATEGY
 *     [3a] Initial: Bulk index all published parts on startup
 *     [3b] Incremental: Update index when part created/updated/deleted
 *     [3c] Eventual consistency: ~100ms delay acceptable for search
 */

import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { MeiliSearch, Index, SearchParams, SearchResponse } from 'meilisearch';

/**
 * Document structure for parts index
 */
export interface PartDocument {
  id: string;
  title: string;
  description: string | null;
  oemRefs: string[];
  price: number;
  currency: string;
  stock: number;
  condition: string;
  status: string;
  city: string | null;
  country: string;
  vendorId: string;
  vendorName: string;
  // YMM data (denormalized for filtering)
  makes: string[]; // ["Toyota", "Honda"]
  models: string[]; // ["Corolla", "Civic"]
  years: number[]; // [2018, 2019, 2020]
  engines: string[]; // ["1.8L", "2.0 TDI"]
  createdAt: number; // Unix timestamp for sorting
}

/**
 * Search filters for parts
 */
export interface PartSearchFilters {
  make?: string;
  model?: string;
  year?: number;
  engine?: string;
  condition?: string;
  minPrice?: number;
  maxPrice?: number;
  vendorId?: string;
  country?: string;
  city?: string;
}

/**
 * Search result with telemetry
 */
export interface PartSearchResult {
  hits: PartDocument[];
  query: string;
  processingTimeMs: number;
  totalHits: number;
  page: number;
  hitsPerPage: number;
  totalPages: number;
  facets?: Record<string, Record<string, number>>;
  isZeroResults: boolean;
}

@Injectable()
export class MeilisearchService implements OnModuleInit {
  private readonly logger = new Logger(MeilisearchService.name);
  private client: MeiliSearch;
  private partsIndex!: Index<PartDocument>;

  // Index configuration
  private readonly PARTS_INDEX = 'parts';
  private readonly SEARCHABLE_ATTRIBUTES = ['title', 'description', 'oemRefs', 'vendorName'];
  private readonly FILTERABLE_ATTRIBUTES = [
    'makes',
    'models',
    'years',
    'engines',
    'condition',
    'status',
    'price',
    'stock',
    'vendorId',
    'country',
    'city',
    'currency',
  ];
  private readonly SORTABLE_ATTRIBUTES = ['price', 'createdAt', 'stock'];
  private readonly FACETING_ATTRIBUTES = [
    'makes',
    'models',
    'years',
    'engines',
    'condition',
    'country',
    'city',
  ];

  constructor() {
    const host = process.env.MEILISEARCH_HOST || 'http://meilisearch:7700';
    const apiKey =
      process.env.MEILISEARCH_API_KEY || process.env.MEILI_MASTER_KEY || 'dev-master-key';

    this.client = new MeiliSearch({
      host,
      apiKey,
    });
  }

  /**
   * Initialize index on module startup
   */
  async onModuleInit(): Promise<void> {
    try {
      // Create or get index
      await this.client.createIndex(this.PARTS_INDEX, { primaryKey: 'id' });
      this.partsIndex = this.client.index(this.PARTS_INDEX);

      // Configure index settings
      await this.partsIndex.updateSettings({
        searchableAttributes: this.SEARCHABLE_ATTRIBUTES,
        filterableAttributes: this.FILTERABLE_ATTRIBUTES,
        sortableAttributes: this.SORTABLE_ATTRIBUTES,
        // Typo tolerance settings
        typoTolerance: {
          enabled: true,
          minWordSizeForTypos: {
            oneTypo: 4, // Words with 4+ chars allow 1 typo
            twoTypos: 8, // Words with 8+ chars allow 2 typos
          },
        },
        // Pagination
        pagination: {
          maxTotalHits: 10000,
        },
        // Faceting for filters
        faceting: {
          maxValuesPerFacet: 100,
        },
      });

      this.logger.log(`✅ Meilisearch index "${this.PARTS_INDEX}" configured`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Failed to initialize Meilisearch: ${message}`);
      // Don't throw - app should still work without search
    }
  }

  /**
   * [4] INDEX A SINGLE PART
   *     Called when part is created or updated
   */
  async indexPart(part: PartDocument): Promise<void> {
    try {
      await this.partsIndex.addDocuments([part]);
      this.logger.debug(`Indexed part: ${part.id}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to index part ${part.id}: ${message}`);
    }
  }

  /**
   * [5] BULK INDEX PARTS
   *     Called for initial sync or re-indexing
   */
  async indexParts(parts: PartDocument[]): Promise<void> {
    if (parts.length === 0) return;

    try {
      // Meilisearch handles batching internally
      const task = await this.partsIndex.addDocuments(parts);
      this.logger.log(`Queued ${parts.length} parts for indexing (task: ${task.taskUid})`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to bulk index parts: ${message}`);
    }
  }

  /**
   * [6] REMOVE PART FROM INDEX
   *     Called when part is deleted or unpublished
   */
  async removePart(partId: string): Promise<void> {
    try {
      await this.partsIndex.deleteDocument(partId);
      this.logger.debug(`Removed part from index: ${partId}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to remove part ${partId}: ${message}`);
    }
  }

  /**
   * [7] SEARCH PARTS WITH FILTERS (US-CAT-302)
   *     [7a] Typo-tolerant full-text search on title, description, OEM refs
   *     [7b] YMM filters: make, model, year, engine
   *     [7c] Additional filters: condition, price range, vendor, location
   *     [7d] Pagination with page/hitsPerPage
   *     [7e] Returns facets for filter UI
   */
  async searchParts(
    query: string,
    filters: PartSearchFilters = {},
    page: number = 1,
    hitsPerPage: number = 20,
    sort?: string,
  ): Promise<PartSearchResult> {
    const startTime = Date.now();

    try {
      // Build filter string
      const filterClauses: string[] = [];

      // Always filter by PUBLISHED status
      filterClauses.push('status = "PUBLISHED"');

      // YMM filters
      if (filters.make) {
        filterClauses.push(`makes = "${filters.make}"`);
      }
      if (filters.model) {
        filterClauses.push(`models = "${filters.model}"`);
      }
      if (filters.year) {
        filterClauses.push(`years = ${filters.year}`);
      }
      if (filters.engine) {
        filterClauses.push(`engines = "${filters.engine}"`);
      }

      // Other filters
      if (filters.condition) {
        filterClauses.push(`condition = "${filters.condition}"`);
      }
      if (filters.vendorId) {
        filterClauses.push(`vendorId = "${filters.vendorId}"`);
      }
      if (filters.country) {
        filterClauses.push(`country = "${filters.country}"`);
      }
      if (filters.city) {
        filterClauses.push(`city = "${filters.city}"`);
      }

      // Price range
      if (filters.minPrice !== undefined) {
        filterClauses.push(`price >= ${filters.minPrice}`);
      }
      if (filters.maxPrice !== undefined) {
        filterClauses.push(`price <= ${filters.maxPrice}`);
      }

      // Build search params
      const searchParams: SearchParams = {
        filter: filterClauses.join(' AND '),
        page,
        hitsPerPage,
        facets: this.FACETING_ATTRIBUTES,
        attributesToHighlight: ['title', 'description'],
        highlightPreTag: '<mark>',
        highlightPostTag: '</mark>',
      };

      // Add sorting
      if (sort) {
        switch (sort) {
          case 'price_asc':
            searchParams.sort = ['price:asc'];
            break;
          case 'price_desc':
            searchParams.sort = ['price:desc'];
            break;
          case 'new':
            searchParams.sort = ['createdAt:desc'];
            break;
          case 'stock_desc':
            searchParams.sort = ['stock:desc'];
            break;
        }
      }

      // Execute search
      const response: SearchResponse<PartDocument> = await this.partsIndex.search(
        query,
        searchParams,
      );

      const processingTimeMs = Date.now() - startTime;
      const isZeroResults = response.hits.length === 0 && query.length > 0;

      // Log zero-results for telemetry
      if (isZeroResults) {
        this.logger.warn(`[ZERO_RESULTS] query="${query}" filters=${JSON.stringify(filters)}`);
        // TODO: Send to analytics service
      }

      return {
        hits: response.hits as PartDocument[],
        query,
        processingTimeMs,
        totalHits: response.estimatedTotalHits || 0,
        page,
        hitsPerPage,
        totalPages: Math.ceil((response.estimatedTotalHits || 0) / hitsPerPage),
        facets: response.facetDistribution,
        isZeroResults,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Search failed: ${message}`);
      // Return empty results on error
      return {
        hits: [],
        query,
        processingTimeMs: Date.now() - startTime,
        totalHits: 0,
        page,
        hitsPerPage,
        totalPages: 0,
        isZeroResults: true,
      };
    }
  }

  /**
   * [8] GET INDEX STATS
   *     For monitoring and debugging
   */
  async getStats(): Promise<{ numberOfDocuments: number; isIndexing: boolean }> {
    try {
      const stats = await this.partsIndex.getStats();
      return {
        numberOfDocuments: stats.numberOfDocuments,
        isIndexing: stats.isIndexing,
      };
    } catch {
      return { numberOfDocuments: 0, isIndexing: false };
    }
  }

  /**
   * [9] CLEAR INDEX
   *     For testing or full re-index
   */
  async clearIndex(): Promise<void> {
    try {
      await this.partsIndex.deleteAllDocuments();
      this.logger.log('Cleared all documents from parts index');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to clear index: ${message}`);
    }
  }
}
