/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                        REDIS SERVICE — In-Memory Cache & Session Store                             ║
 * ║  Uses: Redis for OTP storage, session cache, rate limiting, pub/sub (future)                       ║
 * ║  Client: ioredis (popular Redis client for Node.js, auto-reconnect, connection pooling)            ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 *
 * [1] WHY REDIS?
 *     [1a] Speed: In-memory storage (microseconds vs milliseconds for database)
 *     [1b] Temporary data: OTP codes, sessions, rate limit counters (TTL auto-expire)
 *     [1c] Atomic operations: INCR, SETEX (prevents race conditions)
 *     [1d] Scalability: Faster than database for high-traffic features
 *
 * [2] USE CASES IN ALOVE
 *     [2a] OTP storage: otp:registration:user@example.com = "123456" (5m TTL)
 *     [2b] Session cache: user:123 = { name, email, permissions } (optional, for fast lookups)
 *     [2c] Rate limiting: api:user:123:requests = 5 (request count in current minute)
 *     [2d] Future: Pub/Sub for notifications, Job queue for async tasks
 *
 * [3] REDIS VS DATABASE
 *     [3a] Redis: Fast, volatile (lost on restart), for temporary data
 *     [3b] Database: Durable, persistent, for permanent data
 *     [3c] Ideal: Use both! Redis for hot data, database for cold/permanent data
 *
 * [4] CONNECTION DETAILS
 *     [4a] Connection string: redis://localhost:6379 (default) or from REDIS_URL env var
 *     [4b] In Docker: redis://redis:6379 (service name in docker-compose.yml)
 *     [4c] Retry strategy: Exponential backoff (max 2 seconds between attempts)
 *     [4d] maxRetriesPerRequest: 3 (prevent infinite retries on connection loss)
 */

import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  // [5] REDIS CLIENT INSTANCE
  //     Private: Only accessed through methods (encapsulation)
  //     Type Redis: ioredis client (provides get, set, incr, ttl, etc.)
  private client!: Redis;

  // [6] LOGGER
  //     Used to log connection events and errors
  private readonly logger = new Logger(RedisService.name);

  constructor(private configService: ConfigService) {}

  /**
   * [7] INITIALIZE CONNECTION (ON APP START)
   *     [7a] Called automatically by NestJS during app startup
   *     [7b] Process: Connect to Redis using connection string from .env
   *     [7c] Retry strategy: Exponential backoff (50ms * attempt, max 2000ms)
   *     [7d] Event handlers: Log connection success/failure
   */
  async onModuleInit() {
    // [7.1] GET CONNECTION STRING
    //       From REDIS_URL env var or default to localhost:6379
    const redisUrl = this.configService.get<string>('REDIS_URL', 'redis://localhost:6379');

    // [7.2] CREATE REDIS CLIENT
    //       [7.2a] Connection URL: redis://[host]:[port]/[db]
    //       [7.2b] maxRetriesPerRequest: 3 (give up after 3 retries)
    //       [7.2c] retryStrategy: Exponential backoff (50ms * times, max 2000ms)
    //              Why? Prevent hammering Redis during outage; eventually fail cleanly
    this.client = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000); // 50ms, 100ms, 150ms... capped at 2000ms
        return delay;
      },
    });

    // [7.3] CONNECTION SUCCESS
    //       Log when connection established (useful for debugging)
    this.client.on('connect', () => {
      this.logger.log('Redis connected successfully');
    });

    // [7.4] CONNECTION ERROR
    //       Log errors (connection refused, timeout, etc.)
    //       App continues running (non-critical), but OTP/cache features fail gracefully
    this.client.on('error', (err) => {
      this.logger.error('Redis connection error:', err);
    });
  }

  /**
   * [8] DISCONNECT FROM REDIS (ON APP SHUTDOWN)
   *     [8a] Called automatically by NestJS during shutdown
   *     [8b] Process: Gracefully close all connections
   *     [8c] WHY? Prevent connection leaks and dirty shutdowns
   */
  async onModuleDestroy() {
    await this.client.quit();
    this.logger.log('Redis connection closed');
  }

  /**
   * [9] GET VALUE BY KEY
   *     [9a] Input: key (string, e.g., 'otp:registration:user@example.com')
   *     [9b] Output: value (string) or null (if key not found or expired)
   *     [9c] Use case: Retrieve OTP code, session data, cache values
   *     [9d] Example: const otp = await this.redis.get('otp:registration:user@test.com')
   *     [9e] Performance: O(1) operation (microseconds)
   */
  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  /**
   * [10] SET VALUE WITH OPTIONAL TTL
   *      [10a] Input: key, value, ttlSeconds (optional)
   *      [10b] Output: void (sets in Redis, no return)
   *      [10c] If ttlSeconds provided: Use SETEX (set + expire atomically)
   *      [10d] If no TTL: Use SET (value persists until manually deleted or app restart)
   *      [10e] Use case: Store OTP code (with TTL), cache user data (no TTL)
   *      [10f] Example: await this.redis.set('otp:registration:user@test.com', '123456', 300)
   *      [10g] Example: await this.redis.set('user:123:name', 'Alice')  (no expiration)
   *      [10h] Performance: O(1) operation
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      // [10.1] SETEX: Atomically set value AND expiration
      //        Prevents race condition: if set fails, expire still runs
      await this.client.setex(key, ttlSeconds, value);
    } else {
      // [10.2] SET: Store value indefinitely (until deleted or Redis restart)
      await this.client.set(key, value);
    }
  }

  /**
   * [11] DELETE KEY
   *      [11a] Input: key (string)
   *      [11b] Output: void
   *      [11c] Use case: Clean up OTP after verification, clear session cache
   *      [11d] Example: await this.redis.del('otp:registration:user@test.com')
   *      [11e] Performance: O(N) where N = number of fields (usually 1 for simple keys)
   */
  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  /**
   * [12] CHECK IF KEY EXISTS
   *      [12a] Input: key (string)
   *      [12b] Output: boolean (true if exists, false if not found or expired)
   *      [12c] Use case: Check if OTP still valid without retrieving it
   *      [12d] Example: if (await this.redis.exists('otp:registration:user@test.com')) { ... }
   *      [12e] Performance: O(1)
   */
  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1; // Redis returns 1 (exists) or 0 (not exists)
  }

  /**
   * [13] GET REMAINING TIME-TO-LIVE (TTL)
   *      [13a] Input: key (string)
   *      [13b] Output: number (seconds remaining, -1 if no TTL, -2 if not found)
   *      [13c] Use case: Frontend countdown timer ("OTP expires in 4m 30s")
   *      [13d] Example: const remaining = await this.redis.ttl('otp:...')
   *      [13e] Frontend: if (remaining > 0) { showCountdown(remaining) }
   *      [13f] Performance: O(1)
   */
  async ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  /**
   * [14] INCREMENT VALUE (ATOMIC)
   *      [14a] Input: key (string)
   *      [14b] Output: number (new value after increment)
   *      [14c] Process: Retrieve value, +1, store atomically (no race condition)
   *      [14d] Use case: Increment OTP attempt counter (0 → 1 → 2 → 3 → block)
   *      [14e] Example: const attempts = await this.redis.incr('otp:attempts:user@test.com')
   *      [14f] Atomic: Prevents race condition if multiple requests try to increment simultaneously
   *      [14g] Performance: O(1)
   */
  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  /**
   * [15] SET EXPIRATION ON EXISTING KEY
   *      [15a] Input: key, seconds (TTL)
   *      [15b] Output: boolean (true if TTL set, false if key not found)
   *      [15c] Use case: Extend TTL of existing key (e.g., keep session alive)
   *      [15d] Example: await this.redis.expire('user:123:session', 3600)  (extend by 1 hour)
   *      [15e] Performance: O(1)
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    const result = await this.client.expire(key, seconds);
    return result === 1; // Returns 1 (success) or 0 (key not found)
  }

  /**
   * [16] GET RAW REDIS CLIENT (ADVANCED)
   *      [16a] Use: Direct access to Redis client for complex operations
   *      [16b] Example: Advanced Lua scripts, SCAN operations, Pub/Sub, etc.
   *      [16c] Only use if simple methods above are insufficient
   *      [16d] Return: ioredis client instance
   */
  getClient(): Redis {
    return this.client;
  }
}
