/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                        SEARCH SYNC SERVICE — Meilisearch ↔ Prisma Synchronization                  ║
 * ║  Keeps search index in sync with database: initial load + incremental updates                     ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 *
 * [1] SYNC MODES
 *     [1a] Full sync: Re-index all published parts (on startup or manual trigger)
 *     [1b] Incremental: Update single part on create/update/delete
 *
 * [2] DATA TRANSFORMATION
 *     Converts Prisma Part entity with relations to denormalized PartDocument
 *     for efficient filtering in Meilisearch
 */

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MeilisearchService, PartDocument } from '../meilisearch/meilisearch.service';

/**
 * Part with all relations needed for indexing
 */
type PartWithRelations = {
  id: string;
  title: string;
  description?: string | null;
  // Prix (Prisma Decimal) — typé unknown pour éviter any
  price: unknown;
  currency: string;
  stock: number;
  condition: string;
  status: string;
  oemRefs: string[];
  city?: string | null;
  country: string;
  vendor: { id: string; name: string };
  fitments: Array<{
    engine: {
      code: string;
      year: {
        year: number;
        model: {
          name: string;
          make: { name: string };
        };
      };
    };
  }>;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class SearchSyncService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SearchSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly meilisearch: MeilisearchService,
  ) {}

  /**
   * [3] FULL SYNC ON STARTUP
   *     Index all published parts when the application starts
   */
  async onApplicationBootstrap(): Promise<void> {
    this.logger.log('Starting initial search index sync...');
    await this.fullSync();
  }

  /**
   * [4] FULL SYNC
   *     Re-index all published parts
   */
  async fullSync(): Promise<{ indexed: number; duration: number }> {
    const startTime = Date.now();

    try {
      // Clear existing index
      await this.meilisearch.clearIndex();

      // Fetch all published parts with relations
      const args = {
        include: {
          vendor: { select: { id: true, name: true } },
          fitments: {
            include: {
              engine: {
                include: {
                  year: {
                    include: {
                      model: {
                        include: {
                          make: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      } as unknown;

      const parts = (await this.prisma.part.findMany(
        args as Parameters<typeof this.prisma.part.findMany>[0],
      )) as unknown as PartWithRelations[];

      // Only keep published parts
      const publishedParts = parts.filter((p) => p.status === 'PUBLISHED');

      // Transform to documents
      const documents = publishedParts.map((part) => this.transformToDocument(part));

      // Index in batches
      await this.meilisearch.indexParts(documents);

      const duration = Date.now() - startTime;
      this.logger.log(`✅ Full sync complete: ${documents.length} parts indexed in ${duration}ms`);

      return { indexed: documents.length, duration };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Full sync failed: ${message}`);
      throw error;
    }
  }

  /**
   * [5] INDEX SINGLE PART
   *     Called when a part is created or updated
   */
  async indexPart(partId: string): Promise<void> {
    const args = {
      where: { id: partId },
      include: {
        vendor: { select: { id: true, name: true } },
        fitments: {
          include: {
            engine: {
              include: {
                year: {
                  include: {
                    model: {
                      include: {
                        make: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    } as unknown;

    const part = (await this.prisma.part.findUnique(
      args as Parameters<typeof this.prisma.part.findUnique>[0],
    )) as unknown as PartWithRelations | null;

    if (!part) {
      this.logger.warn(`Part not found for indexing: ${partId}`);
      return;
    }

    // Only index published parts
    if (part.status !== 'PUBLISHED') {
      // Remove from index if exists
      await this.meilisearch.removePart(partId);
      return;
    }

    const document = this.transformToDocument(part as PartWithRelations);
    await this.meilisearch.indexPart(document);
  }

  /**
   * [6] REMOVE PART FROM INDEX
   *     Called when a part is deleted or unpublished
   */
  async removePart(partId: string): Promise<void> {
    await this.meilisearch.removePart(partId);
  }

  /**
   * [7] TRANSFORM PRISMA PART TO MEILISEARCH DOCUMENT
   *     Denormalizes YMM data for efficient filtering
   */
  private transformToDocument(part: PartWithRelations): PartDocument {
    // Extract unique YMM values from fitments
    const makes = new Set<string>();
    const models = new Set<string>();
    const years = new Set<number>();
    const engines = new Set<string>();

    for (const fitment of part.fitments) {
      const engine = fitment.engine;
      const year = engine.year;
      const model = year.model;
      const make = model.make;

      makes.add(make.name);
      models.add(model.name);
      years.add(year.year);
      engines.add(engine.code);
    }

    return {
      id: part.id,
      title: part.title,
      description: part.description ?? null,
      oemRefs: part.oemRefs,
      price: Number(part.price as unknown as number),
      currency: part.currency,
      stock: part.stock,
      condition: part.condition,
      status: part.status,
      city: part.city ?? null,
      country: part.country,
      vendorId: part.vendor.id,
      vendorName: part.vendor.name,
      makes: Array.from(makes),
      models: Array.from(models),
      years: Array.from(years),
      engines: Array.from(engines),
      createdAt: part.createdAt.getTime(),
    };
  }

  /**
   * [8] GET SYNC STATUS
   *     For monitoring
   */
  async getStatus(): Promise<{
    indexedParts: number;
    publishedParts: number;
    isIndexing: boolean;
    inSync: boolean;
  }> {
    const [indexStats, parts] = await Promise.all([
      this.meilisearch.getStats(),
      this.prisma.part.findMany(),
    ]);

    const publishedCount = (parts as unknown as Array<{ status?: string }>).filter(
      (p) => p.status === 'PUBLISHED',
    ).length;

    return {
      indexedParts: indexStats.numberOfDocuments,
      publishedParts: publishedCount,
      isIndexing: indexStats.isIndexing,
      inSync: indexStats.numberOfDocuments === publishedCount,
    };
  }
}
