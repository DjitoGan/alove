/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                        ORDERS MODULE — Order Management Feature Module                             ║
 * ║  Provides: Order creation, listing, details, cancellation                                         ║
 * ║  Dependencies: PrismaModule (database), AuthModule (JWT guards)                                   ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 *
 * [1] MODULE OVERVIEW
 *     [1a] Controllers: OrdersController (HTTP endpoints)
 *     [1b] Providers: OrdersService (business logic)
 *     [1c] Imports: PrismaModule (database access)
 *     [1d] Exports: OrdersService (for use in other modules)
 *
 * [2] WHY THIS STRUCTURE?
 *     [2a] Feature-driven: All order logic in one module
 *     [2b] Reusable: OrdersService can be injected in PaymentModule, NotificationModule
 *     [2c] Testable: Services, controllers loosely coupled
 *     [2d] Scalable: Easy to add features (order history, invoice generation, etc.)
 */

import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule], // Database access
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService], // Available for other modules
})
export class OrdersModule {}
