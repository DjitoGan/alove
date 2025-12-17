/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                        IMPORT CONTROLLER — CSV Upload & Job Management (US-CAT-303)                ║
 * ║  Endpoints: POST /import, GET /import/:id, GET /import, GET /import/:id/errors                    ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 *
 * [1] ENDPOINTS
 *     [1a] POST /catalog/import - Upload CSV file and start import job
 *     [1b] GET /catalog/import - List import jobs for vendor
 *     [1c] GET /catalog/import/:id - Get job status and progress
 *     [1d] GET /catalog/import/:id/errors - Download error report as CSV
 *
 * [2] CSV FORMAT
 *     title,description,price,stock,condition,oemRefs,make,model,year,engine,city,country
 *     "Filtre huile","Description",8500,100,NEW,"OEM1;OEM2",Toyota,Corolla,2018,1.8L,Lomé,TG
 */

import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  Body,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  NotFoundException,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Response } from 'express';
import { ImportService } from './import.service';
import { StartImportDto, ListJobsDto } from './dto/import.dto';

@ApiTags('catalog')
@Controller('catalog/import')
@ApiBearerAuth()
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  /**
   * [3] POST /catalog/import - UPLOAD CSV & START IMPORT
   *     Accepts multipart/form-data with CSV file
   */
  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload CSV and start import job (US-CAT-303)',
    description: 'Accepts a CSV file with parts data. Processing happens in background.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'CSV file to import',
        },
        vendorId: {
          type: 'string',
          description: 'Vendor ID to associate parts with',
        },
      },
      required: ['file', 'vendorId'],
    },
  })
  @ApiResponse({ status: 202, description: 'Import job created, processing started' })
  @ApiResponse({ status: 400, description: 'Invalid file or missing vendor ID' })
  async startImport(@UploadedFile() file: Express.Multer.File, @Body() dto: StartImportDto) {
    // Validate file
    if (!file) {
      throw new BadRequestException('CSV file is required');
    }

    if (!file.mimetype.includes('csv') && !file.originalname.endsWith('.csv')) {
      throw new BadRequestException('File must be a CSV');
    }

    if (!dto.vendorId) {
      throw new BadRequestException('vendorId is required');
    }

    // Create job
    const job = await this.importService.createJob(dto.vendorId, file.originalname, dto.userId);

    // Start processing in background (fire and forget)
    const csvContent = file.buffer.toString('utf-8');
    this.importService.processCsv(job.id, csvContent).catch((err) => {
      console.error(`Import job ${job.id} failed:`, err);
    });

    return {
      message: 'Import started',
      jobId: job.id,
      filename: file.originalname,
      statusUrl: `/v1/catalog/import/${job.id}`,
    };
  }

  /**
   * [4] GET /catalog/import - LIST IMPORT JOBS
   *     Returns paginated list of jobs for a vendor
   */
  @Get()
  @ApiOperation({ summary: 'List import jobs for vendor' })
  @ApiResponse({ status: 200, description: 'Returns paginated list of import jobs' })
  async listJobs(@Query('vendorId') vendorId: string, @Query() dto: ListJobsDto) {
    if (!vendorId) {
      throw new BadRequestException('vendorId query parameter is required');
    }

    return this.importService.listJobs(vendorId, dto.page || 1, dto.limit || 10);
  }

  /**
   * [5] GET /catalog/import/:id - GET JOB STATUS
   *     Returns current status, progress, and errors summary
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get import job status and progress' })
  @ApiResponse({ status: 200, description: 'Returns job status with errors' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async getJobStatus(@Param('id') id: string) {
    const job = await this.importService.getJobStatus(id);

    if (!job) {
      throw new NotFoundException('Import job not found');
    }

    return job;
  }

  /**
   * [6] GET /catalog/import/:id/errors - DOWNLOAD ERROR REPORT
   *     Returns CSV file with all row errors
   */
  @Get(':id/errors')
  @ApiOperation({ summary: 'Download error report as CSV' })
  @ApiResponse({ status: 200, description: 'Returns CSV file with errors' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async downloadErrorReport(@Param('id') id: string, @Res() res: Response) {
    const csv = await this.importService.getErrorReportCsv(id);

    if (csv === null) {
      throw new NotFoundException('Import job not found');
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="import-errors-${id}.csv"`);
    res.send(csv);
  }
}
