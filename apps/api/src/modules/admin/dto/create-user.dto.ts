/**
 * [1] CREATE USER DTO
 *     Used when admin creates a new user account
 */

import { IsEmail, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';

export enum UserRole {
  ADMIN = 'ADMIN',
  MERCHANT = 'MERCHANT',
  CUSTOMER = 'CUSTOMER',
  SUPPORT = 'SUPPORT',
}

export class CreateUserDto {
  // [2] EMAIL
  //     Unique email address for the user
  @IsEmail()
  email!: string;

  // [3] PASSWORD
  //     Minimum 8 characters
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password!: string;

  // [4] FULL NAME
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  name!: string;

  // [5] PHONE NUMBER (OPTIONAL)
  //     West African format: +228XXXXXXXX
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  // [6] ROLE
  //     Default to CUSTOMER if not specified
  @IsEnum(UserRole)
  role?: UserRole = UserRole.CUSTOMER;

  // [7] IS ACTIVE
  //     Whether user can login immediately
  @IsOptional()
  isActive?: boolean = true;
}
