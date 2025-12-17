/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                        PRISMA MODULE — Database Dependency Injection                                ║
 * ║  Provides: PrismaService globally to all other modules (no need to re-import)                      ║
 * ║  Marked: @Global() → accessible everywhere (only one database provider needed)                     ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 *
 * [1] WHY A SEPARATE MODULE?
 *     [1a] Separation of concerns: Database setup isolated from business logic
 *     [1b] Reusability: All modules can inject PrismaService without re-declaring imports
 *     [1c] Initialization: Ensures connection established before any queries execute
 *     [1d] Singleton: Only one PrismaClient instance across entire app (connection reuse)
 *
 * [2] @Global() DECORATOR
 *     [2a] Makes PrismaService available globally (without importing PrismaModule elsewhere)
 *     [2b] Use sparingly: Only for truly global services (database, config, logging)
 *     [2c] Without @Global(): Every module must import PrismaModule separately
 *
 * [3] DEPENDENCY INJECTION PATTERN
 *     [3a] Providers: Instances available for injection (PrismaService)
 *     [3b] Exports: Makes provider available to other modules
 *     [3c] Example: AuthService injects PrismaService for user lookups
 *
 * [4] HOW TO USE IN OTHER MODULES
 *     [4a] No import needed (because @Global())
 *     [4b] In service: constructor(private prisma: PrismaService) {}
 *     [4c] Then: this.prisma.user.findUnique(...), this.prisma.part.create(...), etc.
 */

import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * [5] PRISMA MODULE DEFINITION
 *     [5a] @Global(): Available globally (no import needed in other modules)
 *     [5b] @Module(): NestJS decorator to define dependency injection context
 *     [5c] providers: [PrismaService] → create instance for injection
 *     [5d] exports: [PrismaService] → make available to other modules (even though @Global)
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
