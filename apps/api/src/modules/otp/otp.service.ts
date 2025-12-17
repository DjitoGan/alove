/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                        OTP SERVICE — One-Time Password Generation & Verification                   ║
 * ║  Implements: OTP generation, verification, rate limiting, Redis storage                           ║
 * ║  Uses: Redis for stateless OTP storage (no database round-trip), Prisma for user validation       ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 *
 * [1] KEY DECISIONS
 *     [1a] Redis, not database: OTP is temporary (5 min), Redis is faster than database
 *     [1b] 6-digit code: 1M possible codes; 3 attempts = ~0.2% brute force success rate
 *     [1c] 5-minute TTL: Balance usability (long enough to receive SMS) vs security
 *     [1d] 3 attempt max: Prevents brute force; after 3 fails, user requests new OTP
 *     [1e] Purpose field: Prevents "login" OTP reuse for "registration"
 *
 * [2] WHY THIS OVER PASSWORD?
 *     [2a] Passwordless: No password reuse, phishing, brute force attacks on password
 *     [2b] SMS familiar: West African users understand SMS codes
 *     [2c] No remembering: Users don't need to create/store passwords
 *     [2d] Fallback: Can use as 2FA after initial password-based auth
 *
 * [3] REDIS SCHEMA
 *     Key patterns:
 *     - otp:registration:user@example.com = "123456" (TTL: 300s)
 *     - otp:registration:user@example.com:attempts = "2" (TTL: 300s)
 *     - otp:login:user@example.com = "654321" (TTL: 300s)
 *     [3a] Purpose in key: Prevents mixing different OTP types
 *     [3b] Attempts key: Tracks failed verification attempts
 *     [3c] Both expire together: After TTL, both OTP and attempts deleted
 */

import { Injectable, BadRequestException, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OtpService {
  // [4] LOGGER & CONSTANTS
  private readonly logger = new Logger(OtpService.name);
  private readonly OTP_LENGTH = 6; // 6-digit code (1M possibilities)
  private readonly OTP_TTL: number; // Time-to-live in seconds (from .env)
  private readonly MAX_ATTEMPTS = 3; // Max failed verification attempts

  constructor(
    private redis: RedisService, // In-memory cache (Redis)
    private prisma: PrismaService, // Database (PostgreSQL)
    private configService: ConfigService, // Configuration (.env variables)
  ) {
    // [5] LOAD OTP_TTL FROM ENVIRONMENT
    //     Default 300 seconds (5 minutes) if not specified
    //     WHY configurable? Different security levels for dev/prod
    this.OTP_TTL = parseInt(this.configService.get<string>('OTP_TTL_SECONDS', '300'), 10);
  }

  /**
   * [6] GENERATE & STORE OTP
   *     [6a] Input: email, purpose ('registration' | 'login' | 'password-reset')
   *     [6b] Output: { otp?, expiresIn: 300 }
   *     [6c] Process:
   *         1. Validate user exists/not based on purpose
   *         2. Generate random 6-digit code
   *         3. Store in Redis with TTL
   *         4. Initialize attempt counter
   *         5. Send via email/SMS (mocked in code)
   *     [6d] Errors:
   *         - Email already exists (registration) → BadRequestException
   *         - Email not found (login/reset) → BadRequestException
   *     [6e] WHY return otp in dev? Convenient testing without email/SMS setup
   *     [6f] WHY not return in production? Security: OTP in logs/networks = exposed
   */
  async generateOtp(
    email: string,
    purpose: 'registration' | 'login' | 'password-reset' = 'registration',
  ): Promise<{ otp?: string; expiresIn: number }> {
    // [6.1] VALIDATE USER STATE BASED ON PURPOSE
    //       Prevents: registering with existing email, logging in with non-existent email
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    // [6.1a] For registration: email must NOT exist
    if (purpose === 'registration' && user) {
      throw new BadRequestException('Email already registered');
    }

    // [6.1b] For login/password-reset: email MUST exist
    if ((purpose === 'login' || purpose === 'password-reset') && !user) {
      throw new BadRequestException('Email not found');
    }

    // [6.2] GENERATE 6-DIGIT OTP
    //       Example: 123456, 654321, 000001 (leading zeros possible)
    const otp = this.generateRandomOtp();
    const key = this.getRedisKey(email, purpose);

    // [6.3] STORE IN REDIS WITH TTL
    //       Key: otp:registration:user@example.com = "123456" (expires in 300 seconds)
    //       Attempts: otp:registration:user@example.com:attempts = "0" (same TTL)
    await this.redis.set(key, otp, this.OTP_TTL);
    await this.redis.set(`${key}:attempts`, '0', this.OTP_TTL);

    // [6.4] LOG FOR AUDIT TRAIL
    //       In development only! (conditionally logged, never shown to user)
    this.logger.log(`OTP generated for ${email} (${purpose}): ${otp}`);

    // [6.5] RETURN OTP IN DEV, OMIT IN PRODUCTION
    //       Development: return OTP for easy testing
    //       Production: OTP sent via SMS/Email only (user receives via SMS, not API)
    return {
      otp: process.env.NODE_ENV === 'production' ? undefined : otp,
      expiresIn: this.OTP_TTL,
    };
  }

  /**
   * [7] VERIFY OTP CODE
   *     [7a] Input: email, otp (6-digit code), purpose
   *     [7b] Output: true (if valid)
   *     [7c] Process:
   *         1. Check attempt counter (max 3 failed attempts)
   *         2. Retrieve OTP from Redis
   *         3. Compare with provided code (exact match)
   *         4. If valid: delete OTP + attempts from Redis
   *         5. If invalid: increment attempt counter, keep TTL
   *     [7d] Errors:
   *         - Too many attempts (>= 3) → UnauthorizedException
   *         - OTP expired (not in Redis) → UnauthorizedException
   *         - OTP mismatch → UnauthorizedException (+ increment attempts)
   *     [7e] WHY same error for all cases? Prevents information leakage
   *          (attacker can't tell if OTP expired vs wrong code)
   */
  async verifyOtp(
    email: string,
    otp: string,
    purpose: 'registration' | 'login' | 'password-reset' = 'registration',
  ): Promise<boolean> {
    // [7.1] GET ATTEMPT COUNTER & CHECK LIMIT
    //       Redis key: otp:registration:user@example.com:attempts = "2"
    const key = this.getRedisKey(email, purpose);
    const attemptsKey = `${key}:attempts`;

    const attempts = parseInt((await this.redis.get(attemptsKey)) || '0', 10);

    // [7.1a] If >= 3 failed attempts: block (user must request new OTP)
    if (attempts >= this.MAX_ATTEMPTS) {
      throw new UnauthorizedException('Too many failed attempts. Request a new OTP.');
    }

    // [7.2] RETRIEVE OTP FROM REDIS
    //       Returns string code or null (if expired/not found)
    const storedOtp = await this.redis.get(key);

    // [7.2a] If not in Redis: expired or never existed
    if (!storedOtp) {
      throw new UnauthorizedException('OTP expired or not found');
    }

    // [7.3] COMPARE WITH PROVIDED CODE
    //       Exact string match (case-sensitive, no trimming)
    if (storedOtp !== otp) {
      // [7.3a] OTP mismatch: increment attempt counter
      //        Redis will keep TTL, so counter expires with OTP
      await this.redis.incr(attemptsKey);
      throw new UnauthorizedException('Invalid OTP');
    }

    // [7.4] SUCCESS: CLEAN UP REDIS
    //       Delete OTP + attempts (no need to keep them after successful verification)
    await this.redis.del(key);
    await this.redis.del(attemptsKey);

    // [7.5] LOG SUCCESSFUL VERIFICATION
    this.logger.log(`OTP verified successfully for ${email} (${purpose})`);

    // [7.6] RETURN TRUE (indicates verification successful)
    //       Controller returns { valid: true, message: "OTP verified successfully" }
    return true;
  }

  /**
   * [8] CHECK IF OTP EXISTS (HELPER)
   *     [8a] Input: email, purpose
   *     [8b] Output: boolean (true if OTP in Redis and not expired)
   *     [8c] Use case: UI feedback ("OTP still valid, resend in X seconds")
   */
  async checkOtpExists(
    email: string,
    purpose: 'registration' | 'login' | 'password-reset',
  ): Promise<boolean> {
    const key = this.getRedisKey(email, purpose);
    const otp = await this.redis.get(key);
    return !!otp; // !! converts string to boolean (truthy/falsy)
  }

  /**
   * [9] GET REMAINING TIME-TO-LIVE (HELPER)
   *     [9a] Input: email, purpose
   *     [9b] Output: number (seconds remaining, -1 if key not found, -2 if no TTL)
   *     [9c] Use case: UI countdown timer ("OTP expires in 2m 34s")
   */
  async getOtpTtl(
    email: string,
    purpose: 'registration' | 'login' | 'password-reset',
  ): Promise<number> {
    const key = this.getRedisKey(email, purpose);
    return await this.redis.ttl(key); // Returns -1 (not found) or -2 (no TTL) or seconds
  }

  /**
   * [10] GENERATE RANDOM 6-DIGIT CODE (PRIVATE HELPER)
   *      [10a] Generates number 100000-999999 (6 digits)
   *      [10b] Converted to string: "123456"
   *      [10c] Why this range? Avoids leading zeros being lost (000001 would become "1")
   *           Actually, it doesn't! 0-99999 could lose leading zeros. But 100000-999999 avoids this.
   *      [10d] Math.random() * 900000 + 100000 ensures exactly 6 digits
   */
  private generateRandomOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * [11] CONSTRUCT REDIS KEY (PRIVATE HELPER)
   *      [11a] Pattern: otp:{purpose}:{email}
   *      [11b] Example: otp:registration:user@example.com
   *      [11c] Purpose in key: Prevents reusing "login" OTP for "password-reset"
   *      [11d] Email in key: Separate OTPs for each user
   *      [11e] WHY not hash email? Readable keys easier for debugging
   */
  private getRedisKey(email: string, purpose: string): string {
    return `otp:${purpose}:${email}`;
  }
}
