/**
 * [1] LIST USERS QUERY DTO
 *     Filters and pagination for user listing
 */

import { IsOptional, IsNumber, IsString, IsEnum, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { UserRole } from './create-user.dto';

export class ListUsersQueryDto {
  // [2] PAGINATION: SKIP
  //     Number of records to skip (default 0)
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(0)
  skip?: number = 0;

  // [3] PAGINATION: TAKE
  //     Number of records to return (default 20, max 100)
  @IsOptional()
  @Transform(({ value }) => Math.min(parseInt(value, 10), 100))
  @IsNumber()
  @Min(1)
  take?: number = 20;

  // [4] FILTER: SEARCH
  //     Search in name or email
  @IsOptional()
  @IsString()
  search?: string;

  // [5] FILTER: ROLE
  //     Filter by user role
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  // [6] FILTER: IS ACTIVE
  //     Filter by active/inactive users
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  isActive?: boolean;

  // [7] SORT: ORDER BY
  //     Default: createdAt ascending
  @IsOptional()
  @IsString()
  orderBy?: 'createdAt' | 'email' | 'name' = 'createdAt';

  // [8] SORT: DIRECTION
  //     asc or desc
  @IsOptional()
  @IsString()
  @IsEnum(['asc', 'desc'])
  direction?: 'asc' | 'desc' = 'asc';
}
