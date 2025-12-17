/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                        SEARCH CONTROLLER — Monitoring & Sync Management                            ║
 * ║  Expose search index status and manual sync triggers for admin/monitoring                          ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 *
 * [1] ENDPOINTS
 *     [1a] GET /search/status - Get current index sync status
 *     [1b] POST /search/sync - Trigger manual full sync (admin only)
 *
 * [2] USE CASES
 *     [2a] Monitoring dashboard: Check if index is in sync with DB
 *     [2b] Manual sync: Force re-index after data corruption or migration
 *     [2c] Health checks: Verify search service is operational
 */

import { Controller, Get, Post, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SearchSyncService } from './search-sync.service';
import { MeilisearchService } from './meilisearch.service';

@ApiTags('search')
@Controller('search')
export class SearchController {
  private readonly logger = new Logger(SearchController.name);

  constructor(
    private readonly searchSync: SearchSyncService,
    private readonly meilisearch: MeilisearchService,
  ) {}

  /**
   * [3] GET /search/status - INDEX SYNC STATUS
   *     Returns current state of search index vs database
   *     Public endpoint (useful for monitoring/health checks)
   */
  @Get('status')
  @ApiOperation({
    summary: 'Get search index sync status',
    description: 'Returns number of indexed parts, published parts in DB, and sync state',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns index statistics',
    schema: {
      type: 'object',
      properties: {
        indexedParts: { type: 'number', description: 'Number of documents in Meilisearch index' },
        publishedParts: { type: 'number', description: 'Number of published parts in database' },
        inSync: { type: 'boolean', description: 'True if index count matches DB count' },
        isIndexing: { type: 'boolean', description: 'True if indexing operation is in progress' },
      },
    },
  })
  async getStatus() {
    const status = await this.searchSync.getStatus();
    this.logger.log(
      `Search status: ${status.indexedParts}/${status.publishedParts} parts indexed (inSync: ${status.inSync})`,
    );
    return status;
  }

  /**
   * [4] POST /search/sync - TRIGGER MANUAL FULL SYNC
   *     Re-indexes all published parts from database
   *     Admin-only endpoint (requires authentication)
   */
  @Post('sync')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Trigger manual full sync of search index',
    description:
      'Re-indexes all published parts. Use after data migration or if index is out of sync.',
  })
  @ApiResponse({
    status: 202,
    description: 'Sync started successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        indexed: { type: 'number', description: 'Number of parts indexed' },
        duration: { type: 'number', description: 'Sync duration in milliseconds' },
      },
    },
  })
  @ApiResponse({ status: 500, description: 'Sync failed' })
  async triggerSync() {
    this.logger.log('Manual full sync triggered');
    const result = await this.searchSync.fullSync();
    return {
      message: 'Full sync completed',
      indexed: result.indexed,
      duration: result.duration,
    };
  }

  /**
   * [5] GET /search/stats - MEILISEARCH INDEX STATISTICS
   *     Returns raw Meilisearch index stats
   *     Useful for detailed monitoring
   */
  @Get('stats')
  @ApiOperation({
    summary: 'Get Meilisearch index statistics',
    description: 'Returns detailed index statistics from Meilisearch',
  })
  @ApiResponse({ status: 200, description: 'Returns index stats' })
  async getStats() {
    return this.meilisearch.getStats();
  }
}
