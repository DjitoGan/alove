/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                        PAYMENT MODULE — Payment Processing Feature                                 ║
 * ║  Provides: Payment controller, service, database integration                                      ║
 * ║  Exports: PaymentService (used by OrderModule for order completion)                                ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 *
 * [1] MODULE STRUCTURE
 *     [1a] Imports: PrismaModule (DB), RedisModule (cache)
 *     [1b] Providers: PaymentService (business logic)
 *     [1c] Controllers: PaymentController (HTTP endpoints)
 *     [1d] Exports: PaymentService (for OrderModule dependency)
 *
 * [2] DEPENDENCIES
 *     [2a] PrismaService: Access Payment table in database
 *     [2b] RedisService: Cache payment objects for fast lookup
 *     [2c] (Future) Payment provider SDKs: Stripe, MTN, Airtel
 *
 * [3] ENDPOINTS PROVIDED
 *     [3a] POST /v1/payments → Create payment
 *     [3b] POST /v1/payments/:id/verify → Update status from webhook
 *     [3c] GET /v1/payments/:id → Fetch payment details
 *     [3d] POST /v1/payments/:id/refund → Request refund
 */

import { Module } from '@nestjs/common';
import { PaymentController } from './payments.controller';
import { PaymentService } from './payments.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { NotificationModule } from '../notifications/notification.module';

@Module({
  imports: [PrismaModule, RedisModule, NotificationModule],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService], // OrderModule can inject PaymentService
})
export class PaymentModule {}
