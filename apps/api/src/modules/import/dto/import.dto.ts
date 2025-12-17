/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                        IMPORT DTOs — Request/Response types for CSV import                         ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for starting import job (multipart form data)
 */
export class StartImportDto {
  @ApiProperty({
    description: 'Vendor ID to associate parts with',
    example: 'cmj9xzj4u0004d0pmh5jqkfkj',
  })
  @IsString()
  vendorId!: string;

  @ApiPropertyOptional({
    description: 'User ID who initiated the import',
  })
  @IsOptional()
  @IsString()
  userId?: string;
}

/**
 * DTO for listing import jobs
 */
export class ListJobsDto {
  @ApiPropertyOptional({
    description: 'Vendor ID to filter jobs',
    example: 'cmj9xzj4u0004d0pmh5jqkfkj',
  })
  @IsOptional()
  @IsString()
  vendorId?: string;

  @ApiPropertyOptional({
    description: 'Page number (1-indexed)',
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}
