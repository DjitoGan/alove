/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                        AUTH CONTROLLER — User Authentication Endpoints                             ║
 * ║  Handles: register, login, token refresh, profile retrieval                                       ║
 * ║  Routes: POST /v1/auth/register, POST /v1/auth/login, POST /v1/auth/refresh, GET /v1/auth/me     ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 *
 * [1] ENDPOINT OVERVIEW
 *     [1a] POST /register: Create new user account (no auth required)
 *     [1b] POST /login: Authenticate user, return JWT access + refresh tokens
 *     [1c] POST /refresh: Get new access token using refresh token
 *     [1d] GET /me: Retrieve current user profile (requires JWT access token)
 *
 * [2] SECURITY LAYERS
 *     [2a] LoginDto & RegisterDto validate input (email format, password strength)
 *     [2b] JwtAuthGuard checks JWT token on protected routes (/me)
 *     [2c] JwtRefreshGuard checks refresh token on /refresh endpoint
 *     [2d] Passwords hashed with bcrypt in service layer (never stored plaintext)
 *
 * [3] JWT TOKEN FLOW
 *     [3a] User registers → receive { user, accessToken, refreshToken }
 *     [3b] User stores both tokens in localStorage
 *     [3c] Use accessToken in Authorization header for API calls
 *     [3d] When accessToken expires (15m), use refreshToken to get new one
 *     [3e] If refreshToken expired, user must login again
 */

import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  HttpCode,
  HttpStatus,
  Delete,
  Param,
  Patch,
  BadRequestException,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { CurrentUser } from './decorators/current-user.decorator';
import { EmailVerificationService } from './services/email-verification.service';
import { PasswordResetService } from './services/password-reset.service';
import { SessionService } from './services/session.service';
import { AuditLoggingInterceptor } from './interceptors/audit-logging.interceptor';
import { EmailVerifiedGuard } from './guards/email-verified.guard';
import { RateLimitGuard } from './guards/rate-limit.guard';

@Controller('auth')
@ApiTags('auth')
@UseInterceptors(AuditLoggingInterceptor)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly emailVerificationService: EmailVerificationService,
    private readonly passwordResetService: PasswordResetService,
    private readonly sessionService: SessionService,
  ) {}

  /**
   * [6] POST /v1/auth/register
   *     [6a] Body: { email: string, password: string }
   *     [6b] Returns: { user, accessToken, refreshToken }
   *     [6c] Side effects: Creates new User in database
   *     [6d] Validation: RegisterDto checks email format, password >= 8 chars
   *     [6e] WHY no @UseGuards? Registration is public (no auth required)
   */
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    // Delegates to service: hash password, create user, generate tokens
    return this.authService.register(registerDto.email, registerDto.password);
  }

  /**
   * [7] POST /v1/auth/login
   *     [7a] Body: { email: string, password: string }
   *     [7b] Returns: { user, accessToken, refreshToken }
   *     [7c] Process: Find user, verify password with bcrypt, issue tokens
   *     [7d] Throws: UnauthorizedException if email not found or password wrong
   *     [7e] @HttpCode(200): Return 200 OK instead of default 201 Created
   *     [7f] WHY 200? Login is idempotent (calling multiple times = same result)
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto.email, loginDto.password);
  }

  /**
   * [8] POST /v1/auth/refresh
   *     [8a] Header: Authorization: Bearer <refreshToken>
   *     [8b] Returns: { accessToken, refreshToken }
   *     [8c] Process: Verify refresh token validity, issue new access token
   *     [8d] @UseGuards(JwtRefreshGuard): Validates refresh token automatically
   *     [8e] user populated by JwtRefreshGuard: { sub: userId, email, type: 'refresh' }
   *     [8f] WHY separate tokens? Refresh tokens have longer TTL (7 days vs 15m access)
   *     [8g] WHY longer TTL? Reduces login prompts; still secure if access token leaked
   */
  @Post('refresh')
  @UseGuards(JwtRefreshGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  async refresh(@CurrentUser() user: any) {
    // Extract user ID & email from refresh token payload
    return this.authService.refreshToken(user.sub, user.email);
  }

  /**
   * [9] GET /v1/auth/me
   *     [9a] Returns: Current user profile { id, email, createdAt, ... }
   *     [9b] @UseGuards(JwtAuthGuard): Validates access token, extracts user from JWT
   *     [9c] user populated by JwtAuthGuard: { sub: userId, email, type: 'access' }
   *     [9d] Throws: UnauthorizedException if token missing or invalid
   *     [9e] WHY this endpoint? Frontend needs to restore session on page reload
   *     [9f] Frontend flow: GET /me → if 401, token expired → refresh token → retry
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getProfile(@CurrentUser() user: any) {
    // Fetch user from DB using ID extracted from JWT
    return this.authService.validateUser(user.sub);
  }

  /**
   * [10] POST /v1/auth/verify-email
   *      [10a] Body: { code: string } (6-digit OTP)
   *      [10b] Returns: { message: 'Email verified successfully' }
   *      [10c] Process: Validate OTP code, mark user as verified
   *      [10d] @UseGuards(JwtAuthGuard): Only authenticated users
   *      [10e] Side effect: Sets user.isEmailVerified = true
   */
  @Post('verify-email')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() body: { code: string }, @CurrentUser() user: any) {
    if (!body.code || body.code.length !== 6) {
      throw new BadRequestException('Invalid verification code format');
    }

    await this.emailVerificationService.verifyOtp(user.sub, body.code);
    return { message: 'Email verified successfully' };
  }

  /**
   * [11] POST /v1/auth/resend-otp
   *      [11a] Returns: { message: 'OTP sent to your email' }
   *      [11b] Process: Generate new OTP, send to user email
   *      [11c] @UseGuards(JwtAuthGuard): Only authenticated users
   *      [11d] Rate limit: 5 attempts per 15 minutes
   */
  @Post('resend-otp')
  @UseGuards(JwtAuthGuard)
  @UseGuards(RateLimitGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  async resendOtp(@CurrentUser() user: any) {
    const dbUser = await this.authService.validateUser(user.sub);
    await this.emailVerificationService.generateAndSendOtp(user.sub, dbUser.email);
    return { message: 'OTP sent to your email' };
  }

  /**
   * [12] POST /v1/auth/forgot-password
   *      [12a] Body: { email: string }
   *      [12b] Returns: { message: 'Password reset link sent to email' }
   *      [12c] Process: Generate reset token, send link to email
   *      [12d] No auth required (public endpoint)
   *      [12e] Rate limit: 3 attempts per hour per IP+email
   */
  @Post('forgot-password')
  @UseGuards(RateLimitGuard)
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() body: { email: string }) {
    if (!body.email) {
      throw new BadRequestException('Email is required');
    }

    const user = await this.authService.findByEmail(body.email);
    if (user) {
      // Always return success (security: don't reveal if email exists)
      await this.passwordResetService.generateAndSendResetToken(user.id, user.email);
    }

    return { message: 'Password reset link sent to your email' };
  }

  /**
   * [13] POST /v1/auth/reset-password
   *      [13a] Body: { token: string, newPassword: string }
   *      [13b] Returns: { message: 'Password reset successfully' }
   *      [13c] Process: Validate token, hash password, update user, revoke sessions
   *      [13d] No auth required (uses token instead)
   */
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() body: { token: string; newPassword: string }) {
    if (!body.token || !body.newPassword) {
      throw new BadRequestException('Token and new password are required');
    }

    if (body.newPassword.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    await this.passwordResetService.resetPassword(body.token, body.newPassword);
    return { message: 'Password reset successfully' };
  }

  /**
   * [14] POST /v1/auth/logout
   *      [14a] Returns: { message: 'Logged out successfully' }
   *      [14b] Process: Revoke current session
   *      [14c] @UseGuards(JwtAuthGuard): Only authenticated users
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  async logout(@CurrentUser() user: any) {
    // Note: Client should delete tokens from localStorage
    // Server-side session management handled by client JWT expiry
    return { message: 'Logged out successfully' };
  }

  /**
   * [15] GET /v1/auth/sessions
   *      [15a] Returns: [ { id, ipAddress, deviceInfo, createdAt, expiresAt } ]
   *      [15b] Process: Fetch all active sessions for current user
   *      [15c] @UseGuards(JwtAuthGuard): Only authenticated users
   */
  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getSessions(@CurrentUser() user: any) {
    return this.sessionService.getActiveSessions(user.sub);
  }

  /**
   * [16] DELETE /v1/auth/sessions/:id
   *      [16a] Param: id (session ID)
   *      [16b] Returns: { message: 'Session revoked successfully' }
   *      [16c] Process: Revoke specific session (logout from one device)
   *      [16d] @UseGuards(JwtAuthGuard): Only authenticated users
   */
  @Delete('sessions/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  async revokeSession(@Param('id') sessionId: string, @CurrentUser() user: any) {
    await this.sessionService.revokeSession(sessionId, user.sub);
    return { message: 'Session revoked successfully' };
  }

  /**
   * [17] POST /v1/auth/logout-all
   *      [17a] Returns: { message: 'All sessions revoked', count: number }
   *      [17b] Process: Revoke all sessions for current user
   *      [17c] @UseGuards(JwtAuthGuard): Only authenticated users
   *      [17d] Side effect: User logged out from all devices
   */
  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  async logoutAllSessions(@CurrentUser() user: any) {
    const count = await this.sessionService.revokeAllSessions(user.sub);
    return {
      message: 'All sessions revoked',
      count,
    };
  }

  /**
   * [18] POST /v1/auth/change-password
   *      [18a] Body: { currentPassword: string, newPassword: string }
   *      [18b] Returns: { message: 'Password changed successfully' }
   *      [18c] Process: Verify current password, hash new one, revoke sessions
   *      [18d] @UseGuards(JwtAuthGuard): Only authenticated users
   *      [18e] Security: Requires email verification
   */
  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @UseGuards(EmailVerifiedGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Body() body: { currentPassword: string; newPassword: string },
    @CurrentUser() user: any,
  ) {
    if (!body.currentPassword || !body.newPassword) {
      throw new BadRequestException('Both passwords are required');
    }

    if (body.newPassword.length < 8) {
      throw new BadRequestException('New password must be at least 8 characters');
    }

    await this.authService.changePassword(user.sub, body.currentPassword, body.newPassword);

    // Revoke all sessions for security
    await this.sessionService.revokeAllSessions(user.sub);

    return { message: 'Password changed successfully. Please login again.' };
  }
}
