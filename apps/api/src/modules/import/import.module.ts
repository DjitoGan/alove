/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                        IMPORT MODULE — CSV Bulk Import for Parts (US-CAT-303)                      ║
 * ║  Handles: Upload, parsing, validation, background processing, error reporting                     ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { Module } from '@nestjs/common';
import { ImportService } from './import.service';
import { ImportController } from './import.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { MeilisearchModule } from '../meilisearch/meilisearch.module';

@Module({
  imports: [PrismaModule, MeilisearchModule],
  controllers: [ImportController],
  providers: [ImportService],
  exports: [ImportService],
})
export class ImportModule {}
