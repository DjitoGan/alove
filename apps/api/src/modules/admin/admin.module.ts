/**
 * [1] ADMIN MODULE
 *     User management module
 *     Features:
 *       - CRUD operations on users
 *       - Role assignment and management
 *       - User activation/deactivation
 *       - Statistics and dashboard data
 */

import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  // [2] IMPORTS
  //     - PrismaModule: Database access via ORM
  //     - RedisModule: Caching for user data and stats
  imports: [PrismaModule, RedisModule],

  // [3] CONTROLLERS
  //     - AdminController: HTTP endpoints at /v1/admin
  controllers: [AdminController],

  // [4] PROVIDERS
  //     - AdminService: Business logic for user management
  providers: [AdminService],

  // [5] EXPORTS
  //     Export AdminService so other modules can use it
  //     (e.g., auth.service for user lookup, orders.service for customer info)
  exports: [AdminService],
})
export class AdminModule {}
