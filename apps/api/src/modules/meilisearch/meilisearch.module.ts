/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                        MEILISEARCH MODULE — Full-Text Search Engine                                ║
 * ║  Provides: Typo-tolerant search, faceted filtering, instant results for parts catalog             ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { Module, Global } from '@nestjs/common';
import { MeilisearchService } from './meilisearch.service';
import { SearchSyncService } from './search-sync.service';
import { SearchController } from './search.controller';

@Global()
@Module({
  controllers: [SearchController],
  providers: [MeilisearchService, SearchSyncService],
  exports: [MeilisearchService, SearchSyncService],
})
export class MeilisearchModule {}
