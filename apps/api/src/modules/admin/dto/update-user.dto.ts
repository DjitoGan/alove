/**
 * [1] UPDATE USER DTO
 *     Used when admin updates an existing user's details or role
 */

import { IsEmail, IsString, MinLength, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { UserRole } from './create-user.dto';

export class UpdateUserDto {
  // [2] EMAIL (OPTIONAL)
  //     Update user's email if provided
  @IsOptional()
  @IsEmail()
  email?: string;

  // [3] NAME (OPTIONAL)
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  // [4] PHONE NUMBER (OPTIONAL)
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  // [5] ROLE (OPTIONAL)
  //     Update user's role (ADMIN, MERCHANT, CUSTOMER, SUPPORT)
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  // [6] IS ACTIVE (OPTIONAL)
  //     Activate or deactivate user account
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
