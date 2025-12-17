/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                        PRISMA SERVICE — PostgreSQL Database Access                                  ║
 * ║  Provides: Type-safe ORM, automatic migrations, generated types from schema.prisma                 ║
 * ║  Database: PostgreSQL 16 with connection pooling                                                   ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 *
 * [1] WHAT IS PRISMA?
 *     [1a] ORM (Object-Relational Mapping): Maps database rows to TypeScript objects
 *     [1b] Type-safe: TypeScript catches errors at compile time (not runtime)
 *     [1c] Auto-generated client: `npx prisma generate` creates types from schema.prisma
 *     [1d] Migrations: Version control for database schema (never lose history)
 *     [1e] Compare to raw SQL: Prisma prevents SQL injection automatically
 *
 * [2] LIFECYCLE HOOKS
 *     [2a] onModuleInit: Called when NestJS app starts → connect to PostgreSQL
 *     [2b] onModuleDestroy: Called when app shuts down → graceful disconnect
 *     [2c] WHY? Ensures connections established/closed cleanly (prevent connection leaks)
 *
 * [3] DATABASE SCHEMA
 *     [3a] Defined in: apps/api/prisma/schema.prisma
 *     [3b] Models: User, Part, Vendor, Order, Payment, Notification (planned)
 *     [3c] Relationships: One-to-many (Vendor → Parts), Many-to-many (Order → Parts)
 *     [3d] Migrations: apps/api/prisma/migrations/ folder (git version control)
 *
 * [4] CONNECTION POOLING
 *     [4a] PrismaClient manages connection pool (default ~10 connections)
 *     [4b] Reuses connections: Don't open/close connection per request
 *     [4c] Thread-safe: Multiple requests can share connections
 *
 * [5] HOW TO USE
 *     [5a] Inject PrismaService in any service: constructor(private prisma: PrismaService) {}
 *     [5b] Query: this.prisma.user.findUnique({ where: { id: userId } })
 *     [5c] Create: this.prisma.part.create({ data: { title, price, ... } })
 *     [5d] Transaction: this.prisma.$transaction([query1, query2]) (atomic operations)
 */

import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * [6] PRISMA SERVICE CLASS
 *     [6a] Extends PrismaClient: Inherits all generated query methods
 *     [6b] Implements OnModuleInit: Hook to connect when app starts
 *     [6c] Implements OnModuleDestroy: Hook to disconnect when app shuts down
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  /**
   * [7] CONNECT TO DATABASE (ON APP START)
   *     [7a] Called automatically by NestJS during initialization
   *     [7b] Process: Open connection pool to PostgreSQL
   *     [7c] Error handling: If fails, app startup fails (correct behavior)
   *     [7d] WHY? Need database connection before app can serve requests
   */
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  /**
   * [8] DISCONNECT FROM DATABASE (ON APP SHUTDOWN)
   *     [8a] Called automatically by NestJS during shutdown (docker stop, Ctrl+C, etc.)
   *     [8b] Process: Close all connections, flush pending queries
   *     [8c] Graceful: Waits for in-flight requests to complete before closing
   *     [8d] WHY? Prevent connection leaks and incomplete transactions
   */
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
