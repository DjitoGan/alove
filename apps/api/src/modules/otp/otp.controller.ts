/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                        OTP CONTROLLER — One-Time Password Endpoints                                ║
 * ║  Handles: Generate OTP for email/SMS verification, verify OTP code                                ║
 * ║  Routes: POST /v1/otp/generate, POST /v1/otp/verify                                               ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 *
 * [1] OTP AUTHENTICATION FLOW
 *     [1a] User enters phone/email → POST /otp/generate → receive 6-digit code
 *     [1b] OTP stored in Redis for 5 minutes (configurable OTP_TTL_SECONDS)
 *     [1c] User enters code → POST /otp/verify → verify against Redis
 *     [1d] If valid: delete OTP from Redis; proceed to login/register
 *     [1e] If invalid: increment attempt counter; after 3 fails → block for 5 minutes
 *
 * [2] WHY OTP?
 *     [2a] Phone-based OTP: Common in Africa (SMS more reliable than email)
 *     [2b] Passwordless: Users don't need to remember passwords
 *     [2c] Anti-spam: Rate limiting via attempt counter in Redis
 *     [2d] Stateless: OTP code in Redis, not database (faster, easier scaling)
 *
 * [3] ENDPOINTS
 *     [3a] POST /v1/otp/generate { email, purpose: 'registration'|'login'|'password-reset' }
 *          Returns: { expiresIn: 300, otp?: "123456" (dev only) }
 *     [3b] POST /v1/otp/verify { email, otp: "123456", purpose }
 *          Returns: { valid: true, message: "OTP verified successfully" }
 *
 * [4] SECURITY
 *     [4a] OTP sent via email/SMS (not returned in response in production)
 *     [4b] Redis TTL: Code expires after 5 minutes (guessing 1M codes = max 1 in 300 tries)
 *     [4c] Rate limiting: Max 3 failed attempts per OTP
 *     [4d] Purpose field: Prevents reusing "login" OTP for "registration"
 */

import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { OtpService } from './otp.service';
import { GenerateOtpDto } from './dto/generate-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

@Controller('otp')
export class OtpController {
  constructor(private readonly otpService: OtpService) {}

  /**
   * [5] POST /v1/otp/generate
   *     [5a] Body: { email: string, purpose: 'registration'|'login'|'password-reset' }
   *     [5b] Returns: { message, expiresIn: 300, otp?: "123456" }
   *     [5c] Side effects:
   *         1. Check if email is registered (for login/reset) or unregistered (for registration)
   *         2. Generate random 6-digit code
   *         3. Store in Redis with 5-minute TTL
   *         4. Send via email/SMS (mocked in dev, real SMS/email in prod)
   *     [5d] Errors:
   *         - Email already registered (registration) → BadRequestException 400
   *         - Email not found (login/reset) → BadRequestException 400
   *     [5e] @HttpCode(200): Return 200 OK instead of default 201 Created (idempotent operation)
   *     [5f] WHY otp in dev response? Convenient for testing without email/SMS
   */
  @Post('generate')
  @HttpCode(HttpStatus.OK)
  async generateOtp(@Body() generateOtpDto: GenerateOtpDto) {
    // Delegate to service: check user exists/not, generate code, store in Redis
    const result = await this.otpService.generateOtp(generateOtpDto.email, generateOtpDto.purpose);

    return {
      message: 'OTP sent successfully',
      ...result,
    };
  }

  /**
   * [6] POST /v1/otp/verify
   *     [6a] Body: { email: string, otp: "123456", purpose: 'registration'|'login'|'password-reset' }
   *     [6b] Returns: { valid: true, message: "OTP verified successfully" }
   *     [6c] Process:
   *         1. Check attempt counter (max 3 failed attempts)
   *         2. Retrieve OTP from Redis
   *         3. Compare with provided code (case-sensitive, exact match)
   *         4. If valid: delete OTP + attempts from Redis
   *         5. If invalid: increment attempt counter
   *     [6d] Errors:
   *         - Too many attempts (>= 3) → UnauthorizedException 401
   *         - OTP expired/not found → UnauthorizedException 401
   *         - OTP invalid → UnauthorizedException 401
   *     [6e] @HttpCode(200): Return 200 OK (idempotent: calling multiple times after success = same result)
   *     [6f] WHY increment attempts? Prevent brute force (3 attempts in 5 minutes = ~0.2% chance)
   */
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    // Delegate to service: check attempts, compare code, clean up Redis
    const isValid = await this.otpService.verifyOtp(
      verifyOtpDto.email,
      verifyOtpDto.otp,
      verifyOtpDto.purpose,
    );

    return {
      valid: isValid,
      message: 'OTP verified successfully',
    };
  }
}
