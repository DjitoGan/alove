/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                        REDIS MODULE — Cache & Session Store Dependency Injection                   ║
 * ║  Provides: RedisService globally to all modules (no re-import needed)                              ║
 * ║  @Global() allows OTP, session, rate limiting features to use Redis                                ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 *
 * [1] WHY A SEPARATE MODULE?
 *     [1a] Initialization: OnModuleInit hook connects to Redis during app startup
 *     [1b] Global availability: All modules can inject RedisService without re-importing
 *     [1c] Lifecycle management: OnModuleDestroy hook gracefully closes connection on shutdown
 *     [1d] Singleton: Only one RedisService instance (one connection pool) across entire app
 *
 * [2] @Global() DECORATOR
 *     [2a] Makes RedisService available globally (like PrismaModule)
 *     [2b] Services just inject: constructor(private redis: RedisService) {}
 *     [2c] No module imports needed: Don't need to import RedisModule in every feature module
 *
 * [3] HOW SERVICES USE REDIS
 *     [3a] OTP Service: Store codes with TTL, track attempt counters
 *     [3b] Auth Service: Cache user sessions (optional optimization)
 *     [3c] Rate limiting: Track API calls per user (future)
 *     [3d] Job queue: Store pending notifications (future)
 *
 * [4] CONNECTION LIFECYCLE
 *     [4a] App startup → onModuleInit() → connect to Redis
 *     [4b] App running → All requests can use Redis
 *     [4c] App shutdown → onModuleDestroy() → gracefully close connection
 *     [4d] WHY graceful? Prevent leaving open connections on server
 */

import { Module, Global } from '@nestjs/common';
import { RedisService } from './redis.service';

/**
 * [5] REDIS MODULE DEFINITION
 *     [5a] @Global(): Available globally (no import needed)
 *     [5b] @Module(): NestJS module decorator for DI
 *     [5c] providers: [RedisService] → Create instance for injection
 *     [5d] exports: [RedisService] → Available to other modules
 */
@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
