/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                        AUTH SERVICE — Core Authentication Logic                                    ║
 * ║  Handles: user registration, login, JWT token generation/refresh, password hashing                ║
 * ║  Uses: bcrypt for password hashing, JWT for token generation, Prisma for database                 ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 *
 * [1] KEY CONCEPTS
 *     [1a] Password hashing: bcrypt with salt rounds=10 (strong, slow = resistant to brute force)
 *     [1b] JWT payload: { sub: userId, email, type: 'access'|'refresh' }
 *     [1c] Access token: Short-lived (15m), used for API requests
 *     [1d] Refresh token: Long-lived (7d), used to get new access token
 *     [1e] WHY two tokens? Security: if access token stolen, damage is limited to 15 minutes
 *
 * [2] SECURITY BEST PRACTICES
 *     [2a] Never log or return plaintext passwords
 *     [2b] Use bcrypt.compare() (slow, constant-time) to prevent timing attacks
 *     [2c] Throw UnauthorizedException for both "user not found" and "wrong password"
 *          (prevents username enumeration: attacker can't tell if email is registered)
 *     [2d] Hash passwords with salt (bcrypt does this automatically)
 *     [2e] Tokens stored in environment variables, never hardcoded
 */

import { Injectable, UnauthorizedException, ConflictException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

// [3] JWT PAYLOAD TYPE
//     Defines shape of data stored inside JWT token
//     [3a] sub: Standard JWT claim for subject (user ID)
//     [3b] email: User email (optional, for convenience)
//     [3c] type: 'access' or 'refresh' (allows using same JWT secret for both token types)
export interface JwtPayload {
  sub: string; // User ID
  email: string; // User email
  type: 'access' | 'refresh';
}

@Injectable()
export class AuthService {
  // [4] LOGGING
  //     Logger.log() → NestJS logs to console with prefix [AuthService]
  //     Used to track user registration, login, and errors for debugging
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService, // Database access (Prisma ORM)
    private jwtService: JwtService, // JWT token generation/verification
    private configService: ConfigService, // Environment variables (.env)
  ) {}

  /**
   * [5] REGISTER NEW USER
   *     [5a] Input: email, password (plain text from DTO)
   *     [5b] Output: { user: { id, email, createdAt }, accessToken, refreshToken }
   *     [5c] Process:
   *         1. Check if email already registered
   *         2. Hash password with bcrypt (10 salt rounds)
   *         3. Create user in database
   *         4. Generate JWT tokens
   *         5. Return user + tokens
   *     [5d] Error cases:
   *         - Email already exists → ConflictException (409)
   *     [5e] WHY hash password? Cannot be reversed; protects data if database compromised
   */
  async register(email: string, password: string) {
    // [5.1] Check if email already registered
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    // [5.2] Hash password with bcrypt
    //       Round 10: takes ~100ms (balances security vs performance)
    //       WHY not round 15? Would take ~500ms, too slow for registration
    const hashedPassword = await bcrypt.hash(password, 10);

    // [5.3] Create user in PostgreSQL
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword, // NEVER store plaintext
      },
      select: {
        id: true,
        email: true,
        createdAt: true,
        // NOTE: password field excluded from response (security)
      },
    });

    // [5.4] Log successful registration (for audit trail)
    this.logger.log(`New user registered: ${email}`);

    // [5.5] Return user + tokens
    return {
      user,
      ...this.generateTokens(user.id, user.email),
    };
  }

  /**
   * [6] LOGIN USER
   *     [6a] Input: email, password (plain text from DTO)
   *     [6b] Output: { user: { id, email }, accessToken, refreshToken }
   *     [6c] Process:
   *         1. Find user by email
   *         2. Compare provided password with hashed password using bcrypt
   *         3. If valid, generate tokens
   *     [6d] Error cases:
   *         - Email not found → UnauthorizedException (401)
   *         - Password wrong → UnauthorizedException (401)
   *         - Same error for both cases → prevents username enumeration
   *     [6e] WHY bcrypt.compare()? Timing-safe: prevents attackers from measuring response time
   */
  async login(email: string, password: string) {
    // [6.1] Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    // [6.2] If user not found, throw 401 (same message as wrong password)
    //       WHY same message? Prevents attacker from enumerating valid usernames
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // [6.3] Compare plaintext password with hashed password
    //       bcrypt.compare() is timing-safe (resistant to timing attacks)
    const isPasswordValid = await bcrypt.compare(password, user.password);

    // [6.4] If password wrong, throw 401 (same message as user not found)
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // [6.5] Log successful login (for audit trail)
    this.logger.log(`User logged in: ${email}`);

    // [6.6] Return user + tokens
    return {
      user: {
        id: user.id,
        email: user.email,
      },
      ...this.generateTokens(user.id, user.email),
    };
  }

  /**
   * [7] REFRESH ACCESS TOKEN
   *     [7a] Input: userId, email (extracted from refresh token by guard)
   *     [7b] Output: { accessToken, refreshToken }
   *     [7c] Process: Simply generate new tokens (refresh token validates user first)
   *     [7d] WHY no database lookup? RefreshGuard already validated user exists
   */
  async refreshToken(userId: string, email: string) {
    return this.generateTokens(userId, email);
  }

  /**
   * [8] VALIDATE USER BY ID
   *     [8a] Input: userId (extracted from access token by guard)
   *     [8b] Output: { id, email, createdAt, ...profile fields }
   *     [8c] Process: Fetch user from database
   *     [8d] Used by GET /auth/me endpoint to restore user session on page reload
   */
  // merged into single implementation below

  /**
   * [9] GENERATE JWT TOKENS (Private Helper)
   *     [9a] Input: userId, email
   *     [9b] Output: { accessToken, refreshToken }
   *     [9c] Access token: 15 minutes (short-lived)
   *     [9d] Refresh token: 7 days (long-lived)
   *     [9e] Both tokens signed with JWT_SECRET from environment
   *     [9f] WHY different TTLs?
   *         - Access token: Short TTL = limited damage if leaked
   *         - Refresh token: Long TTL = fewer login prompts; still secure
   *     [9g] WHY include type field? Allows detection if wrong token type used
   */
  private generateTokens(userId: string, email: string) {
    // [9.1] Base payload (shared by both tokens)
    const payload: Omit<JwtPayload, 'type'> = { sub: userId, email };

    // [9.2] Generate access token (15 minutes)
    const accessToken = this.jwtService.sign(
      { ...payload, type: 'access' },
      {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: '15m', // Token invalid after 15 minutes
      },
    );

    // [9.3] Generate refresh token (7 days)
    // [9.3] Generate refresh token (7 days)
    const refreshToken = this.jwtService.sign(
      { ...payload, type: 'refresh' },
      {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: '7d', // Token invalid after 7 days
      },
    );

    // [9.4] Return both tokens
    return { accessToken, refreshToken };
  }

  /**
   * [10] VALIDATE USER BY ID
   *      [10a] Input: userId (extracted from access token by guard)
   *      [10b] Output: { id, email, createdAt, ...profile fields }
   *      [10c] Process: Fetch user from database
   *      [10d] Used by GET /auth/me endpoint to restore user session on page reload
   */
  async validateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  /**
   * [11] FIND USER BY EMAIL
   *      Used internally for password reset flow
   */
  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: false,
      },
    });
  }

  /**
   * [12] CHANGE PASSWORD
   *      [12a] Input: userId, currentPassword, newPassword
   *      [12b] Process: Verify current password, hash new one, update database
   *      [12c] Security: Revokes all sessions after password change (done by controller)
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
      },
    });

    this.logger.log(`Password changed for user ${userId}`);
  }
}
