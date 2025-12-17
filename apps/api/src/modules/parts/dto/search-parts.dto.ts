/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                        SEARCH PARTS DTO — Query parameters for catalog search                      ║
 * ║  US-CAT-302: Full-text search with YMM filters, pagination, sorting                               ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, Max, IsEnum, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export enum SearchSort {
  RELEVANCE = 'relevance',
  PRICE_ASC = 'price_asc',
  PRICE_DESC = 'price_desc',
  NEWEST = 'new',
  STOCK = 'stock_desc',
}

export class SearchPartsDto {
  @ApiProperty({
    description: 'Search query (title, description, OEM refs)',
    example: 'filtre huile',
  })
  @IsString()
  q!: string;

  // YMM FILTERS
  @ApiPropertyOptional({
    description: 'Filter by vehicle make name',
    example: 'Toyota',
  })
  @IsOptional()
  @IsString()
  make?: string;

  @ApiPropertyOptional({
    description: 'Filter by vehicle model name',
    example: 'Corolla',
  })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({
    description: 'Filter by vehicle year',
    example: 2020,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @Max(2100)
  year?: number;

  @ApiPropertyOptional({
    description: 'Filter by engine code',
    example: '1.8L',
  })
  @IsOptional()
  @IsString()
  engine?: string;

  // OTHER FILTERS
  @ApiPropertyOptional({
    description: 'Filter by condition',
    enum: ['NEW', 'REFURBISHED', 'USED'],
  })
  @IsOptional()
  @IsString()
  condition?: string;

  @ApiPropertyOptional({
    description: 'Minimum price filter',
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({
    description: 'Maximum price filter',
    example: 500,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({
    description: 'Filter by country code',
    example: 'TG',
  })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({
    description: 'Filter by city',
    example: 'Lomé',
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({
    description: 'Filter by vendor ID',
    example: 'uuid-here',
  })
  @IsOptional()
  @IsString()
  vendorId?: string;

  // PAGINATION & SORTING
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
    description: 'Number of results per page',
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: SearchSort,
    default: SearchSort.RELEVANCE,
  })
  @IsOptional()
  @IsEnum(SearchSort)
  sort?: SearchSort = SearchSort.RELEVANCE;
}
