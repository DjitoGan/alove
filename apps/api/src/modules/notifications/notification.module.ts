/**
 * [1] NOTIFICATION MODULE
 *     Handles email and SMS notifications
 *     Exports: NotificationService (used by Orders, Payments, Auth modules)
 */

import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  // [2] IMPORT DEPENDENCIES
  //     - PrismaModule: Database access (audit logs)
  //     - RedisModule: Rate limiting, deduplication
  imports: [PrismaModule, RedisModule],

  // [3] CONTROLLERS
  //     - NotificationController: HTTP endpoints for email/SMS
  controllers: [NotificationController],

  // [4] PROVIDERS
  //     - NotificationService: Business logic
  providers: [NotificationService],

  // [5] EXPORTS
  //     Export NotificationService so other modules can inject it
  //     Examples:
  //       - orders.service.ts: Send order confirmation email
  //       - payments.service.ts: Send payment receipt
  //       - auth.service.ts: Send password reset email
  //       - otp.service.ts: Send OTP via SMS
  exports: [NotificationService],
})
export class NotificationModule {}
