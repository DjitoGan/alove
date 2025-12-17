/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                        IMPORT SERVICE — CSV Parsing & Part Creation (US-CAT-303)                   ║
 * ║  Features: Background job processing, validation, idempotent updates, error reporting             ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 *
 * [1] CSV FORMAT EXPECTED
 *     title,description,price,stock,condition,oemRefs,make,model,year,engine,city,country
 *     "Filtre huile","Filtre universel",8500,100,NEW,"OEM1;OEM2",Toyota,Corolla,2018,1.8L,Lomé,TG
 *
 * [2] PROCESSING FLOW
 *     [2a] Upload CSV → Create ImportJob (PENDING)
 *     [2b] Background: Set PROCESSING, parse rows
 *     [2c] For each row: validate, find/create YMM, create Part
 *     [2d] Log errors to ImportRowError
 *     [2e] Set COMPLETED or FAILED
 *
 * [3] IDEMPOTENCY
 *     If Part with same vendorId + oemRefs exists, UPDATE instead of INSERT
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SearchSyncService } from '../meilisearch/search-sync.service';
import { ImportJobStatus, PartCondition, PartStatus } from '@prisma/client';
import * as csv from 'csv-parse/sync';

/**
 * Row structure from CSV
 */
interface CsvRow {
  title: string;
  description?: string;
  price: string;
  stock: string;
  condition: string;
  oemRefs: string; // OEM1;OEM2;OEM3
  make: string;
  model: string;
  year: string;
  engine: string;
  city?: string;
  country?: string;
}

/**
 * Validation error structure
 */
interface RowError {
  rowNumber: number;
  field?: string;
  value?: string;
  message: string;
  code: string;
}

@Injectable()
export class ImportService {
  private readonly logger = new Logger(ImportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly searchSync: SearchSyncService,
  ) {
    this.logger.log(
      `ImportService initialized - Prisma: ${!!this.prisma}, SearchSync: ${!!this.searchSync}`,
    );
  }

  /**
   * [4] CREATE IMPORT JOB
   *     Called when CSV is uploaded
   */
  async createJob(vendorId: string, filename: string, userId?: string): Promise<{ id: string }> {
    this.logger.log(`createJob called - prisma: ${typeof this.prisma}, vendorId: ${vendorId}`);
    this.logger.log(
      `prisma keys: ${this.prisma ? Object.keys(this.prisma).slice(0, 5).join(', ') : 'N/A'}`,
    );

    const job = await this.prisma.importJob.create({
      data: {
        filename,
        vendorId,
        userId,
        status: ImportJobStatus.PENDING,
      },
    });

    this.logger.log(`Import job created: ${job.id} for vendor ${vendorId}`);
    return { id: job.id };
  }

  /**
   * [5] GET JOB STATUS
   *     Returns current job status with error summary
   */
  async getJobStatus(jobId: string) {
    const job = await this.prisma.importJob.findUnique({
      where: { id: jobId },
      include: {
        errors: {
          orderBy: { rowNumber: 'asc' },
          take: 100, // Limit errors returned
        },
      },
    });

    if (!job) return null;

    return {
      id: job.id,
      status: job.status,
      filename: job.filename,
      totalRows: job.totalRows,
      processedRows: job.processedRows,
      successRows: job.successRows,
      errorRows: job.errorRows,
      progress: job.totalRows > 0 ? Math.round((job.processedRows / job.totalRows) * 100) : 0,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      duration:
        job.startedAt && job.completedAt
          ? job.completedAt.getTime() - job.startedAt.getTime()
          : null,
      errors: job.errors.map((e) => ({
        row: e.rowNumber,
        field: e.field,
        value: e.value,
        message: e.message,
        code: e.code,
      })),
      hasMoreErrors: job.errorRows > 100,
    };
  }

  /**
   * [6] LIST JOBS FOR VENDOR
   *     Paginated list of import jobs
   */
  async listJobs(vendorId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [jobs, total] = await this.prisma.$transaction([
      this.prisma.importJob.findMany({
        where: { vendorId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          filename: true,
          status: true,
          totalRows: true,
          successRows: true,
          errorRows: true,
          createdAt: true,
          completedAt: true,
        },
      }),
      this.prisma.importJob.count({ where: { vendorId } }),
    ]);

    return {
      items: jobs,
      page,
      limit,
      total,
      hasMore: skip + jobs.length < total,
    };
  }

  /**
   * [7] PROCESS CSV (Main background job)
   *     Parses CSV, validates rows, creates Parts
   */
  async processCsv(jobId: string, csvContent: string): Promise<void> {
    // Mark job as processing
    await this.prisma.importJob.update({
      where: { id: jobId },
      data: {
        status: ImportJobStatus.PROCESSING,
        startedAt: new Date(),
      },
    });

    try {
      // Parse CSV
      const rows = this.parseCsv(csvContent);

      await this.prisma.importJob.update({
        where: { id: jobId },
        data: { totalRows: rows.length },
      });

      this.logger.log(`Processing ${rows.length} rows for job ${jobId}`);

      // Get vendor for this job
      const job = await this.prisma.importJob.findUnique({
        where: { id: jobId },
        select: { vendorId: true },
      });

      if (!job) throw new Error('Job not found');

      let successCount = 0;
      let errorCount = 0;
      const errors: RowError[] = [];

      // Process each row
      for (let i = 0; i < rows.length; i++) {
        const rowNumber = i + 2; // +2 because header is row 1, data starts at row 2
        const row = rows[i];

        try {
          await this.processRow(row, rowNumber, job.vendorId, errors);
          successCount++;
        } catch (error: unknown) {
          errorCount++;
          const message = error instanceof Error ? error.message : String(error);
          errors.push({
            rowNumber,
            message: `Unexpected error: ${message}`,
            code: 'UNEXPECTED_ERROR',
          });
        }

        // Update progress every 10 rows
        if ((i + 1) % 10 === 0 || i === rows.length - 1) {
          await this.prisma.importJob.update({
            where: { id: jobId },
            data: {
              processedRows: i + 1,
              successRows: successCount,
              errorRows: errorCount,
            },
          });
        }
      }

      // Save all errors
      if (errors.length > 0) {
        await this.prisma.importRowError.createMany({
          data: errors.map((e) => ({
            jobId,
            rowNumber: e.rowNumber,
            field: e.field,
            value: e.value,
            message: e.message,
            code: e.code,
          })),
        });
      }

      // Mark job as completed
      await this.prisma.importJob.update({
        where: { id: jobId },
        data: {
          status:
            errorCount > 0 && successCount === 0
              ? ImportJobStatus.FAILED
              : ImportJobStatus.COMPLETED,
          completedAt: new Date(),
          processedRows: rows.length,
          successRows: successCount,
          errorRows: errorCount,
        },
      });

      this.logger.log(`Job ${jobId} completed: ${successCount} success, ${errorCount} errors`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Job ${jobId} failed: ${message}`);

      await this.prisma.importJob.update({
        where: { id: jobId },
        data: {
          status: ImportJobStatus.FAILED,
          completedAt: new Date(),
        },
      });

      // Log global error
      await this.prisma.importRowError.create({
        data: {
          jobId,
          rowNumber: 0,
          message: `Global error: ${message}`,
          code: 'GLOBAL_ERROR',
        },
      });
    }
  }

  /**
   * [8] PARSE CSV CONTENT
   */
  private parseCsv(content: string): CsvRow[] {
    return csv.parse(content, {
      columns: true, // Use first row as headers
      skip_empty_lines: true,
      trim: true,
      relaxColumnCount: true, // Allow missing columns
    }) as CsvRow[];
  }

  /**
   * [9] PROCESS SINGLE ROW
   *     Validates, finds/creates YMM, creates/updates Part
   */
  private async processRow(
    row: CsvRow,
    rowNumber: number,
    vendorId: string,
    errors: RowError[],
  ): Promise<void> {
    // Validate required fields
    if (!row.title?.trim()) {
      errors.push({
        rowNumber,
        field: 'title',
        value: row.title,
        message: 'Title is required',
        code: 'MISSING_TITLE',
      });
      return;
    }

    if (!row.price?.trim() || isNaN(Number(row.price))) {
      errors.push({
        rowNumber,
        field: 'price',
        value: row.price,
        message: 'Price must be a valid number',
        code: 'INVALID_PRICE',
      });
      return;
    }

    if (!row.oemRefs?.trim()) {
      errors.push({
        rowNumber,
        field: 'oemRefs',
        value: row.oemRefs,
        message: 'At least one OEM reference is required',
        code: 'MISSING_OEM',
      });
      return;
    }

    if (!row.make?.trim() || !row.model?.trim() || !row.year?.trim() || !row.engine?.trim()) {
      errors.push({
        rowNumber,
        field: 'ymm',
        message: 'Make, Model, Year, and Engine are all required',
        code: 'MISSING_YMM',
      });
      return;
    }

    // Parse values
    const price = parseFloat(row.price);
    const stock = parseInt(row.stock || '0', 10);
    const year = parseInt(row.year, 10);
    const oemRefs = row.oemRefs
      .split(';')
      .map((r) => r.trim())
      .filter(Boolean);
    const condition = this.parseCondition(row.condition);

    if (isNaN(year) || year < 1900 || year > 2100) {
      errors.push({
        rowNumber,
        field: 'year',
        value: row.year,
        message: 'Year must be between 1900 and 2100',
        code: 'INVALID_YEAR',
      });
      return;
    }

    // Find or create YMM hierarchy
    const engineId = await this.findOrCreateYmm(
      row.make.trim(),
      row.model.trim(),
      year,
      row.engine.trim(),
    );

    // Check for existing part (idempotency by OEM refs)
    const existingPart = await this.prisma.part.findFirst({
      where: {
        vendorId,
        oemRefs: { hasSome: oemRefs },
      },
    });

    if (existingPart) {
      // Update existing part
      const updatedPart = await this.prisma.part.update({
        where: { id: existingPart.id },
        data: {
          title: row.title.trim(),
          description: row.description?.trim(),
          price,
          stock,
          condition,
          oemRefs,
          city: row.city?.trim(),
          country: row.country?.trim() || 'TG',
        },
      });

      // Ensure fitment exists
      await this.prisma.partFitment.upsert({
        where: {
          partId_engineId: {
            partId: existingPart.id,
            engineId,
          },
        },
        create: {
          partId: existingPart.id,
          engineId,
        },
        update: {},
      });

      // Sync to search if published
      if (updatedPart.status === PartStatus.PUBLISHED) {
        await this.searchSync.indexPart(updatedPart.id);
      }

      this.logger.debug(`Row ${rowNumber}: Updated part ${existingPart.id}`);
    } else {
      // Create new part
      const newPart = await this.prisma.part.create({
        data: {
          title: row.title.trim(),
          description: row.description?.trim(),
          price,
          stock,
          condition,
          status: PartStatus.DRAFT, // New imports are drafts
          oemRefs,
          city: row.city?.trim(),
          country: row.country?.trim() || 'TG',
          vendorId,
          fitments: {
            create: [{ engineId }],
          },
        },
      });

      this.logger.debug(`Row ${rowNumber}: Created part ${newPart.id}`);
    }
  }

  /**
   * [10] FIND OR CREATE YMM HIERARCHY
   *      Creates Make → Model → Year → Engine if not exists
   */
  private async findOrCreateYmm(
    makeName: string,
    modelName: string,
    year: number,
    engineCode: string,
  ): Promise<string> {
    // Find or create Make
    let make = await this.prisma.vehicleMake.findUnique({
      where: { name: makeName },
    });
    if (!make) {
      make = await this.prisma.vehicleMake.create({
        data: { name: makeName },
      });
    }

    // Find or create Model
    let model = await this.prisma.vehicleModel.findUnique({
      where: { makeId_name: { makeId: make.id, name: modelName } },
    });
    if (!model) {
      model = await this.prisma.vehicleModel.create({
        data: { makeId: make.id, name: modelName },
      });
    }

    // Find or create Year
    let vehicleYear = await this.prisma.vehicleYear.findUnique({
      where: { modelId_year: { modelId: model.id, year } },
    });
    if (!vehicleYear) {
      vehicleYear = await this.prisma.vehicleYear.create({
        data: { modelId: model.id, year },
      });
    }

    // Find or create Engine
    let engine = await this.prisma.engineSpec.findUnique({
      where: { yearId_code: { yearId: vehicleYear.id, code: engineCode } },
    });
    if (!engine) {
      engine = await this.prisma.engineSpec.create({
        data: { yearId: vehicleYear.id, code: engineCode },
      });
    }

    return engine.id;
  }

  /**
   * [11] PARSE CONDITION STRING TO ENUM
   */
  private parseCondition(value?: string): PartCondition {
    if (!value) return PartCondition.USED_GOOD;

    const normalized = value.toUpperCase().trim();

    switch (normalized) {
      case 'NEW':
      case 'NEUF':
        return PartCondition.NEW;
      case 'USED_LIKE_NEW':
      case 'COMME_NEUF':
        return PartCondition.USED_LIKE_NEW;
      case 'USED_GOOD':
      case 'BON_ETAT':
        return PartCondition.USED_GOOD;
      case 'USED_FAIR':
      case 'ETAT_CORRECT':
        return PartCondition.USED_FAIR;
      case 'REFURBISHED':
      case 'RECONDITIONNE':
        return PartCondition.REFURBISHED;
      default:
        return PartCondition.USED_GOOD;
    }
  }

  /**
   * [12] DOWNLOAD ERROR REPORT AS CSV
   */
  async getErrorReportCsv(jobId: string): Promise<string | null> {
    const job = await this.prisma.importJob.findUnique({
      where: { id: jobId },
      include: {
        errors: { orderBy: { rowNumber: 'asc' } },
      },
    });

    if (!job) return null;

    // Build CSV
    const lines = ['row,field,value,message,code'];
    for (const error of job.errors) {
      const escapedValue = (error.value || '').replace(/"/g, '""');
      const escapedMessage = error.message.replace(/"/g, '""');
      lines.push(
        `${error.rowNumber},"${error.field || ''}","${escapedValue}","${escapedMessage}","${error.code || ''}"`,
      );
    }

    return lines.join('\n');
  }
}
