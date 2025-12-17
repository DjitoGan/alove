import {
  IsBooleanString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export enum SortOption {
  NEW = 'new',
  PRICE_ASC = 'price_asc',
  PRICE_DESC = 'price_desc',
  STOCK_DESC = 'stock_desc',
}

export class ListPartsDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize = 20;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  vendorId?: string; // si tu utilises cuid pour Vendor.id

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @IsOptional()
  @IsEnum(SortOption)
  sort: SortOption = SortOption.NEW;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  includeVendor = false;
}
