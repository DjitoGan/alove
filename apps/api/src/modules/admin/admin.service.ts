/**
 * [1] ADMIN SERVICE
 *     User management: CRUD operations, role assignment, account activation
 *     Database: Prisma ORM
 *     Caching: Redis for user role lookups
 */

import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CreateUserDto, UserRole } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ListUsersQueryDto } from './dto/list-users.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminService {
  private logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * [2] CREATE USER
   *     Admin endpoint to create a new user with specified role
   *     Steps:
   *       1. Check if email already exists
   *       2. Hash password using bcrypt (10 rounds)
   *       3. Create user in Prisma
   *       4. Invalidate user listing cache in Redis
   *       5. Return user (without password)
   */
  async createUser(createUserDto: CreateUserDto): Promise<any> {
    // [3] CHECK IF EMAIL EXISTS
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException(`User with email ${createUserDto.email} already exists`);
    }

    // [4] HASH PASSWORD
    //     Bcrypt with 10 salt rounds (default cost factor)
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    // [5] CREATE USER IN DATABASE
    const user = await this.prisma.user.create({
      data: {
        email: createUserDto.email,
        password: hashedPassword,
        name: createUserDto.name,
        phoneNumber: createUserDto.phoneNumber,
        role: createUserDto.role || UserRole.CUSTOMER,
        isActive: createUserDto.isActive ?? true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        phoneNumber: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    // [6] INVALIDATE CACHE
    //     Clear user listing cache since we added a new user
    await this.redis.del('admin:users:list');
    this.logger.log(`Created user: ${user.email} with role ${user.role}`);

    return user;
  }

  /**
   * [7] GET USER BY ID
   *     Retrieve single user details
   */
  async getUserById(userId: string): Promise<any> {
    // [8] LOOKUP IN CACHE FIRST
    //     Key: admin:user:{userId}
    //     TTL: 5 minutes
    const cacheKey = `admin:user:${userId}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      this.logger.debug(`User cache hit: ${userId}`);
      return JSON.parse(cached);
    }

    // [9] FETCH FROM DATABASE
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phoneNumber: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    // [10] CACHE FOR 5 MINUTES
    await this.redis.set(cacheKey, JSON.stringify(user), 300);

    return user;
  }

  /**
   * [11] LIST USERS WITH FILTERS
   *      Admin endpoint to list users with pagination, search, role filter
   *      Steps:
   *        1. Build Prisma WHERE clause from query filters
   *        2. Count total users
   *        3. Fetch paginated results
   *        4. Return paginated response with total count
   */
  async listUsers(query: ListUsersQueryDto): Promise<any> {
    // [12] BUILD WHERE CLAUSE
    //      Support filtering by: search (email/name), role, isActive
    const where: any = {};

    // [13] SEARCH FILTER
    //      Search in name OR email (case-insensitive)
    if (query.search) {
      where.OR = [
        { email: { contains: query.search, mode: 'insensitive' } },
        { name: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // [14] ROLE FILTER
    if (query.role) {
      where.role = query.role;
    }

    // [15] ACTIVE STATUS FILTER
    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    // [16] COUNT TOTAL MATCHING USERS
    const total = await this.prisma.user.count({ where });

    // [17] FETCH PAGINATED RESULTS
    //      Skip N records, take M records
    const users = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        phoneNumber: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      skip: query.skip || 0,
      take: query.take || 20,
      orderBy: {
        [query.orderBy || 'createdAt']: query.direction || 'asc',
      },
    });

    // [18] RETURN PAGINATED RESPONSE
    return {
      data: users,
      pagination: {
        skip: query.skip || 0,
        take: query.take || 20,
        total,
        totalPages: Math.ceil(total / (query.take || 20)),
      },
    };
  }

  /**
   * [19] UPDATE USER
   *      Admin endpoint to update user details or role
   *      Can update: email, name, phone, role, isActive
   */
  async updateUser(userId: string, updateUserDto: UpdateUserDto): Promise<any> {
    // [20] VERIFY USER EXISTS
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    // [21] CHECK EMAIL UNIQUENESS IF CHANGING EMAIL
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingEmail = await this.prisma.user.findUnique({
        where: { email: updateUserDto.email },
      });

      if (existingEmail) {
        throw new ConflictException(`Email ${updateUserDto.email} already in use`);
      }
    }

    // [22] BUILD UPDATE DATA
    //      Only include fields provided in DTO
    const updateData: any = {};
    if (updateUserDto.email) updateData.email = updateUserDto.email;
    if (updateUserDto.name) updateData.name = updateUserDto.name;
    if (updateUserDto.phoneNumber) updateData.phoneNumber = updateUserDto.phoneNumber;
    if (updateUserDto.role) updateData.role = updateUserDto.role;
    if (updateUserDto.isActive !== undefined) updateData.isActive = updateUserDto.isActive;

    // [23] UPDATE IN DATABASE
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        phoneNumber: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });

    // [24] INVALIDATE CACHES
    //      Clear both specific user cache and listing cache
    await this.redis.del(`admin:user:${userId}`);
    await this.redis.del('admin:users:list');
    this.logger.log(`Updated user: ${userId}`);

    return updatedUser;
  }

  /**
   * [25] DELETE USER
   *      Admin endpoint to soft-delete user (mark as inactive)
   *      Or hard-delete if forceDelete=true
   */
  async deleteUser(userId: string, forceDelete: boolean = false): Promise<any> {
    // [26] VERIFY USER EXISTS
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    // [27] PREVENT DELETING LAST ADMIN
    //      If user is ADMIN, check if there are other admins
    if (user.role === UserRole.ADMIN && forceDelete) {
      const adminCount = await this.prisma.user.count({
        where: { role: UserRole.ADMIN },
      });

      if (adminCount <= 1) {
        throw new BadRequestException('Cannot delete the last admin user');
      }
    }

    // [28] SOFT OR HARD DELETE
    if (forceDelete) {
      // Hard delete: Remove from database completely
      await this.prisma.user.delete({
        where: { id: userId },
      });
      this.logger.log(`Hard deleted user: ${userId}`);
    } else {
      // Soft delete: Mark as inactive
      await this.prisma.user.update({
        where: { id: userId },
        data: { isActive: false },
      });
      this.logger.log(`Soft deleted user: ${userId}`);
    }

    // [29] INVALIDATE CACHES
    await this.redis.del(`admin:user:${userId}`);
    await this.redis.del('admin:users:list');

    return { success: true, message: `User ${userId} deleted` };
  }

  /**
   * [30] ASSIGN ROLE
   *      Convenience method to update user role
   *      Example: assignRole('user123', UserRole.MERCHANT)
   */
  async assignRole(userId: string, role: UserRole): Promise<any> {
    return this.updateUser(userId, { role });
  }

  /**
   * [31] ACTIVATE/DEACTIVATE USER
   *      Toggle user's isActive flag
   */
  async toggleUserStatus(userId: string, isActive: boolean): Promise<any> {
    return this.updateUser(userId, { isActive });
  }

  /**
   * [32] GET ADMIN STATISTICS
   *      Dashboard data for admin panel
   *      Returns: total users, users by role, active vs inactive
   */
  async getAdminStats(): Promise<any> {
    // [33] CACHE KEY FOR STATS
    //      TTL: 10 minutes (600 seconds)
    const cacheKey = 'admin:stats';
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    // [34] FETCH STATS FROM DATABASE
    const totalUsers = await this.prisma.user.count();
    const activeUsers = await this.prisma.user.count({ where: { isActive: true } });
    const inactiveUsers = totalUsers - activeUsers;

    // Count by role
    const usersByRole = await this.prisma.user.groupBy({
      by: ['role'],
      _count: { role: true },
    });

    const stats = {
      totalUsers,
      activeUsers,
      inactiveUsers,
      usersByRole: Object.fromEntries(usersByRole.map((g) => [g.role, g._count.role])),
    };

    // [35] CACHE STATS FOR 10 MINUTES
    await this.redis.set(cacheKey, JSON.stringify(stats), 600);

    return stats;
  }
}
