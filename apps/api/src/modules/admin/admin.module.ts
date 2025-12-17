import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminAuditController } from './audit.controller';
import { AdminService } from './admin.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  // [2] IMPORTS
  //     - PrismaModule: Database access via ORM
  //     - RedisModule: Caching for user data and stats
  //     - AuthModule: For AuditLoggingService
  imports: [PrismaModule, RedisModule, AuthModule],

  // [3] CONTROLLERS
  //     - AdminController: User management at /v1/admin
  //     - AdminAuditController: Audit logs at /v1/admin/audit-logs
  controllers: [AdminController, AdminAuditController],

  // [4] PROVIDERS
  //     - AdminService: Business logic for user management
  providers: [AdminService],

  // [5] EXPORTS
  //     Export AdminService so other modules can use it
  //     (e.g., auth.service for user lookup, orders.service for customer info)
  exports: [AdminService],
})
export class AdminModule {}
