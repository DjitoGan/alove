import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import Redis from 'ioredis';

/**
 * Rate Limit Guard
 * Prevents brute force attacks with per-action rate limits
 *
 * Limits:
 * - Login: 5 attempts per 15 minutes (per IP + email)
 * - Register: 3 attempts per hour (per IP)
 * - Password Reset: 3 attempts per hour (per IP + email)
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);
  private redisClient: Redis | null = null;

  constructor() {
    // Initialize Redis client lazily
    this.initializeRedis();
  }

  private initializeRedis() {
    try {
      this.redisClient = new Redis({
        host: process.env.REDIS_HOST || 'redis',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
      });

      this.redisClient.on('error', (err: Error) => {
        this.logger.error('Redis client error:', err);
      });
    } catch (error) {
      this.logger.warn('Failed to initialize Redis, rate limiting disabled:', error);
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse();

    // Get rate limit config from route metadata
    const routePath = this.normalizePath(request.path);
    const limits = this.getLimitForRoute(routePath);

    if (!limits) {
      // No rate limit for this route
      return true;
    }

    const { maxAttempts, windowMs, key } = limits;
    const identifier = this.getIdentifier(request, key);

    try {
      const attempts = await this.getAttempts(identifier);

      if (attempts >= maxAttempts) {
        const resetTime = await this.getTtl(identifier);
        response.set('Retry-After', Math.ceil(resetTime / 1000).toString());

        throw new HttpException(
          `Too many attempts. Please try again in ${Math.ceil(resetTime / 1000)} seconds.`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      // Increment attempt counter
      await this.recordAttempt(identifier, windowMs);

      return true;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      // If Redis fails, allow request (fail open)
      this.logger.warn('Rate limit check failed, allowing request:', error);
      return true;
    }
  }

  /**
   * Get rate limit configuration for route
   */
  private getLimitForRoute(
    path: string,
  ): { maxAttempts: number; windowMs: number; key: string } | null {
    interface RateLimitConfig {
      maxAttempts: number;
      windowMs: number;
      key: string;
    }

    const limits: Record<string, RateLimitConfig> = {
      '/auth/login': {
        maxAttempts: 5,
        windowMs: 15 * 60 * 1000, // 15 minutes
        key: 'ip+email', // Rate limit by IP + email combination
      },
      '/auth/register': {
        maxAttempts: 3,
        windowMs: 60 * 60 * 1000, // 1 hour
        key: 'ip',
      },
      '/auth/forgot-password': {
        maxAttempts: 3,
        windowMs: 60 * 60 * 1000, // 1 hour
        key: 'ip+email',
      },
      '/auth/resend-otp': {
        maxAttempts: 5,
        windowMs: 15 * 60 * 1000, // 15 minutes
        key: 'ip+email',
      },
    };

    return limits[path] || null;
  }

  /**
   * Normalize path by removing known prefixes (e.g., /v1, /api)
   */
  private normalizePath(path: string): string {
    const withoutApi = path.replace(/^\/api/, '');
    return withoutApi.replace(/^\/v\d+/, '');
  }

  /**
   * Get identifier for rate limiting
   */
  private getIdentifier(request: Request, key: string): string {
    const ip = this.getClientIp(request);

    if (key === 'ip') {
      return `ratelimit:${ip}`;
    }

    if (key === 'ip+email') {
      const email = request.body?.email || request.query?.email || '';
      return `ratelimit:${ip}:${email}`;
    }

    return `ratelimit:${ip}`;
  }

  /**
   * Get client IP address
   */
  private getClientIp(request: Request): string {
    return (
      (request.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
      request.socket?.remoteAddress ||
      'unknown'
    );
  }

  /**
   * Get current attempt count from Redis
   */
  private async getAttempts(identifier: string): Promise<number> {
    if (!this.redisClient) return 0;

    const value = await this.redisClient.get(identifier);
    return value ? parseInt(value, 10) : 0;
  }

  /**
   * Record new attempt in Redis
   */
  private async recordAttempt(identifier: string, windowMs: number): Promise<void> {
    if (!this.redisClient) return;

    await this.redisClient.incr(identifier);
    await this.redisClient.expire(identifier, Math.ceil(windowMs / 1000));
  }

  /**
   * Get remaining TTL for identifier
   */
  private async getTtl(identifier: string): Promise<number> {
    if (!this.redisClient) return 0;

    const ttl = await this.redisClient.pttl(identifier);
    return Math.max(ttl, 0);
  }

  /**
   * Cleanup: Close Redis connection
   */
  onModuleDestroy() {
    this.redisClient?.disconnect();
  }
}
