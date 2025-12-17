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
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';

// [4] GUARDS
//     Guards are middleware that check conditions before route handler executes
import { JwtAuthGuard } from './guards/jwt-auth.guard'; // Validates access token
import { JwtRefreshGuard } from './guards/jwt-refresh.guard'; // Validates refresh token

// [5] DATA TRANSFER OBJECTS (DTOs)
//     DTOs validate and type-hint request body
//     ValidationPipe (from main.ts) checks these automatically
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
   *     [8e] req.user populated by JwtRefreshGuard: { sub: userId, email, type: 'refresh' }
   *     [8f] WHY separate tokens? Refresh tokens have longer TTL (7 days vs 15m access)
   *     [8g] WHY longer TTL? Reduces login prompts; still secure if access token leaked
   */
  @Post('refresh')
  @UseGuards(JwtRefreshGuard)
  @HttpCode(HttpStatus.OK)
  async refresh(@Request() req: any) {
    // Extract user ID & email from refresh token payload
    return this.authService.refreshToken(req.user.sub, req.user.email);
  }

  /**
   * [9] GET /v1/auth/me
   *     [9a] Returns: Current user profile { id, email, createdAt, ... }
   *     [9b] @UseGuards(JwtAuthGuard): Validates access token, extracts user from JWT
   *     [9c] req.user populated by JwtAuthGuard: { sub: userId, email, type: 'access' }
   *     [9d] Throws: UnauthorizedException if token missing or invalid
   *     [9e] WHY this endpoint? Frontend needs to restore session on page reload
   *     [9f] Frontend flow: GET /me → if 401, token expired → refresh token → retry
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req: any) {
    // Fetch user from DB using ID extracted from JWT
    return this.authService.validateUser(req.user.sub);
  }
}
