/**
 * [1] ADMIN CONTROLLER
 *     Handles user management endpoints
 *     All endpoints require JWT authentication + ADMIN role
 *     Endpoints:
 *       - POST /v1/admin/users (create user)
 *       - GET /v1/admin/users (list users with filters)
 *       - GET /v1/admin/users/:id (get single user)
 *       - PATCH /v1/admin/users/:id (update user)
 *       - DELETE /v1/admin/users/:id (delete user)
 *       - POST /v1/admin/users/:id/role (assign role)
 *       - GET /v1/admin/stats (admin dashboard stats)
 */

import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ListUsersQueryDto } from './dto/list-users.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
@ApiTags('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /**
   * [2] CREATE USER ENDPOINT
   *     POST /v1/admin/users
   *     Body: CreateUserDto (email, password, name, phoneNumber, role, isActive)
   *     Response: { id, email, name, phoneNumber, role, isActive, createdAt }
   *     Use case: Admin creates new user account manually
   */
  @Post('users')
  @HttpCode(201)
  async createUser(@Body() createUserDto: CreateUserDto) {
    // [3] ADMIN ROLE VERIFIED BY RolesGuard
    const user = await this.adminService.createUser(createUserDto);
    return {
      success: true,
      data: user,
      message: `User ${user.email} created successfully`,
    };
  }

  /**
   * [4] LIST USERS ENDPOINT
   *     GET /v1/admin/users?skip=0&take=20&search=john&role=CUSTOMER&isActive=true&orderBy=createdAt&direction=asc
   *     Query: ListUsersQueryDto (skip, take, search, role, isActive, orderBy, direction)
   *     Response: { data: [...users], pagination: { skip, take, total, totalPages } }
   *     Use case: Admin views list of all users with filtering, sorting, pagination
   */
  @Get('users')
  async listUsers(@Query() query: ListUsersQueryDto) {
    // [5] ADMIN ROLE VERIFIED BY RolesGuard
    const result = await this.adminService.listUsers(query);
    return {
      success: true,
      ...result,
      message: `Retrieved ${result.data.length} users`,
    };
  }

  /**
   * [6] GET SINGLE USER ENDPOINT
   *     GET /v1/admin/users/:id
   *     Params: userId
   *     Response: { id, email, name, phoneNumber, role, isActive, createdAt, updatedAt }
   *     Use case: Admin views single user's full details
   */
  @Get('users/:id')
  async getUser(@Param('id') userId: string) {
    // [7] ADMIN ROLE VERIFIED BY RolesGuard
    const user = await this.adminService.getUserById(userId);
    return {
      success: true,
      data: user,
    };
  }

  /**
   * [8] UPDATE USER ENDPOINT
   *     PATCH /v1/admin/users/:id
   *     Params: userId
   *     Body: UpdateUserDto (email, name, phoneNumber, role, isActive)
   *     Response: { id, email, name, phoneNumber, role, isActive, updatedAt }
   *     Use case: Admin updates user's profile or role
   */
  @Patch('users/:id')
  async updateUser(
    @Param('id') userId: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() currentUser: any,
  ) {
    // [9] ADMIN ROLE VERIFIED BY RolesGuard

    // [10] PREVENT SELF-DEMOTION
    //      If updating the current user, don't allow downgrading own role
    if (userId === currentUser.sub && updateUserDto.role) {
      throw new BadRequestException('Cannot change your own role');
    }

    const user = await this.adminService.updateUser(userId, updateUserDto);
    return {
      success: true,
      data: user,
      message: `User ${userId} updated successfully`,
    };
  }

  /**
   * [11] DELETE USER ENDPOINT
   *      DELETE /v1/admin/users/:id?forceDelete=false
   *      Params: userId
   *      Query: forceDelete (boolean, default false)
   *      Response: { success: true, message }
   *      Use case: Admin deletes (soft or hard) user account
   *
   *      Soft delete (default): Mark user as inactive
   *      Hard delete (forceDelete=true): Permanently remove from database
   */
  @Delete('users/:id')
  async deleteUser(
    @Param('id') userId: string,
    @Query('forceDelete') forceDelete: string,
    @CurrentUser() currentUser: any,
  ) {
    // [12] ADMIN ROLE VERIFIED BY RolesGuard

    // [13] PREVENT SELF-DELETION
    if (userId === currentUser.sub) {
      throw new BadRequestException('Cannot delete your own account');
    }

    // [14] PARSE QUERY PARAM (STRING TO BOOLEAN)
    const shouldForceDelete = forceDelete === 'true';

    const result = await this.adminService.deleteUser(userId, shouldForceDelete);
    return {
      success: true,
      data: result,
    };
  }

  /**
   * [15] ASSIGN ROLE ENDPOINT
   *      POST /v1/admin/users/:id/role
   *      Params: userId
   *      Body: { role: UserRole }
   *      Response: { success: true, data: updatedUser }
   *      Use case: Admin quickly changes user's role (convenience endpoint)
   */
  @Post('users/:id/role')
  async assignRole(
    @Param('id') userId: string,
    @Body('role') role: string,
    @CurrentUser() currentUser: any,
  ) {
    // [16] ADMIN ROLE VERIFIED BY RolesGuard

    // [17] PREVENT SELF-DEMOTION
    if (userId === currentUser.sub) {
      throw new BadRequestException('Cannot change your own role');
    }

    const user = await this.adminService.assignRole(userId, role as any);
    return {
      success: true,
      data: user,
      message: `User ${userId} assigned role: ${role}`,
    };
  }

  /**
   * [18] ADMIN STATISTICS ENDPOINT
   *      GET /v1/admin/stats
   *      Response: {
   *        totalUsers: number,
   *        activeUsers: number,
   *        inactiveUsers: number,
   *        usersByRole: { ADMIN: 2, MERCHANT: 5, CUSTOMER: 100, SUPPORT: 3 }
   *      }
   *      Use case: Admin dashboard displays user statistics
   */
  @Get('stats')
  async getAdminStats() {
    // [19] ADMIN ROLE VERIFIED BY RolesGuard
    const stats = await this.adminService.getAdminStats();
    return {
      success: true,
      data: stats,
    };
  }
}
