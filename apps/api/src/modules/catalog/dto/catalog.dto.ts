/**
 * [1] CATALOG DTOs
 *     Data transfer objects for catalog management
 */

import { IsString, IsOptional, IsNumber, Min, Max, IsEnum, IsArray } from 'class-validator';
import { Transform } from 'class-transformer';

export enum SortOption {
  NEWEST = 'newest',
  PRICE_LOW = 'price_low',
  PRICE_HIGH = 'price_high',
  POPULARITY = 'popularity',
  RATING = 'rating',
}

export class CreateCategoryDto {
  // [2] CATEGORY NAME
  @IsString()
  name: string;

  // [3] DESCRIPTION
  @IsOptional()
  @IsString()
  description?: string;

  // [4] PARENT CATEGORY (FOR SUBCATEGORIES)
  @IsOptional()
  @IsString()
  parentId?: string;

  // [5] ICON URL
  @IsOptional()
  @IsString()
  icon?: string;
}

export class UpdateCategoryDto {
  // [6] NAME (OPTIONAL)
  @IsOptional()
  @IsString()
  name?: string;

  // [7] DESCRIPTION (OPTIONAL)
  @IsOptional()
  @IsString()
  description?: string;

  // [8] ICON (OPTIONAL)
  @IsOptional()
  @IsString()
  icon?: string;
}

export class SearchCatalogQueryDto {
  // [9] SEARCH QUERY
  @IsOptional()
  @IsString()
  q?: string;

  // [10] CATEGORY FILTER
  @IsOptional()
  @IsString()
  category?: string;

  // [11] PRICE RANGE
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  // [12] AVAILABILITY
  @IsOptional()
  inStock?: boolean = true;

  // [13] VENDOR FILTER
  @IsOptional()
  @IsString()
  vendor?: string;

  // [14] SORTING
  @IsOptional()
  @IsEnum(SortOption)
  sort?: SortOption = SortOption.NEWEST;

  // [15] PAGINATION
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(0)
  skip?: number = 0;

  @IsOptional()
  @Transform(({ value }) => Math.min(parseInt(value, 10), 100))
  @IsNumber()
  @Min(1)
  take?: number = 20;

  // [16] RATINGS FILTER
  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  @Min(0)
  @Max(5)
  minRating?: number;
}

export class BulkFilterCatalogDto {
  // [17] MULTIPLE FILTERS IN ONE REQUEST
  @IsOptional()
  @IsArray()
  categories?: string[];

  @IsOptional()
  @IsArray()
  vendors?: string[];

  @IsOptional()
  @IsArray()
  brands?: string[];

  @IsOptional()
  @IsNumber()
  minPrice?: number;

  @IsOptional()
  @IsNumber()
  maxPrice?: number;

  @IsOptional()
  @IsEnum(SortOption)
  sort?: SortOption = SortOption.NEWEST;

  @IsOptional()
  inStock?: boolean;

  @IsOptional()
  @IsNumber()
  skip?: number = 0;

  @IsOptional()
  @IsNumber()
  take?: number = 20;
}
