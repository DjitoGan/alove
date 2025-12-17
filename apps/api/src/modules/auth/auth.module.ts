/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                        AUTH MODULE — Authentication Feature Module                                 ║
 * ║  Provides: JWT strategy, Passport authentication, Auth service, Auth controller                    ║
 * ║  Exports: AuthService (used by other modules for user validation)                                  ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 *
 * [1] MODULE ARCHITECTURE
 *     [1a] Imports: PrismaModule (database), PassportModule (JWT), JwtModule (token generation)
 *     [1b] Providers: AuthService (business logic), JwtStrategy, JwtRefreshStrategy (guards)
 *     [1c] Controllers: AuthController (HTTP routes)
 *     [1d] Exports: AuthService (other modules can inject & use it)
 *
 * [2] PASSPORT & JWT STRATEGY
 *     [2a] Passport: Popular Node.js authentication middleware
 *     [2b] JwtStrategy: Validates JWT tokens in requests (used by @UseGuards(JwtAuthGuard))
 *     [2c] JwtRefreshStrategy: Validates refresh tokens (separate strategy, longer TTL)
 *     [2d] defaultStrategy: 'jwt' → use JwtStrategy by default (can override with other strategies)
 *
 * [3] JWT CONFIGURATION
 *     [3a] registerAsync: Load JWT_SECRET from ConfigService (.env) instead of hardcoding
 *     [3b] Secret: From environment variable JWT_SECRET (must be strong, random)
 *     [3c] expiresIn: '15m' → access tokens expire after 15 minutes
 *     [3d] WHY registerAsync? Enables dynamic config loading from environment
 *
 * [4] WHY THIS STRUCTURE?
 *     [4a] Strategy pattern: Allows multiple auth methods (JWT, OAuth, API key) in future
 *     [4b] Guard pattern: @UseGuards applies authentication to specific routes
 *     [4c] Module exports: Other modules (Orders, Payments) can use AuthService
 *     [4d] Testability: Services, strategies, controllers loosely coupled
 */

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

// [5] JWT STRATEGIES
//     Validate JWT tokens in requests and extract user info
import { JwtStrategy } from './strategies/jwt.strategy'; // Access token (15m TTL)
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy'; // Refresh token (7d TTL)

// [6] INFRASTRUCTURE MODULES
//     Provide database & config to auth services
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    // [7] DATABASE
    //     Prisma ORM for user lookups (find user by email, check password, etc.)
    PrismaModule,

    // [8] PASSPORT SETUP
    //     [8a] defaultStrategy: 'jwt' → @UseGuards automatically uses JwtStrategy
    //     [8b] Allows adding more strategies (OAuth, Local) without changing decorators
    PassportModule.register({ defaultStrategy: 'jwt' }),

    // [9] JWT TOKEN GENERATION
    //     [9a] registerAsync: Load config from environment (JWT_SECRET)
    //     [9b] Dynamic loading allows different secrets for dev/prod
    //     [9c] Inject ConfigService to access .env variables
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        // [9.1] Secret key for signing/verifying JWT tokens
        //       MUST be kept secret! Used in production for all token verification
        //       If leaked, attacker can forge tokens
        secret: configService.get<string>('JWT_SECRET'),

        // [9.2] Default expiration for access tokens
        //       Can override per token (e.g., refreshToken uses 7d)
        signOptions: {
          expiresIn: '15m', // Access tokens valid for 15 minutes
        },
      }),
    }),
  ],

  // [10] CONTROLLERS
  //      HTTP endpoints: POST /auth/register, /login, /refresh, GET /me
  controllers: [AuthController],

  // [11] PROVIDERS
  //      [11a] AuthService: Core auth logic (register, login, JWT generation)
  //      [11b] JwtStrategy: Validates access tokens (used by @UseGuards(JwtAuthGuard))
  //      [11c] JwtRefreshStrategy: Validates refresh tokens (used by @UseGuards(JwtRefreshGuard))
  providers: [AuthService, JwtStrategy, JwtRefreshStrategy],

  // [12] EXPORTS
  //      [12a] AuthService can be injected in other modules
  //      [12b] Used by: OrderModule, NotificationModule, AdminModule (future)
  //      [12c] For user validation, JWT verification, etc.
  exports: [AuthService],
})
export class AuthModule {}
