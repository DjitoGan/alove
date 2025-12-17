/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                        ALOVE API — Application Bootstrap & Startup                                 ║
 * ║  Initializes NestJS app, configures middleware, sets global pipes, and starts server on port 3001 ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 *
 * [1] STARTUP SEQUENCE
 *     [1a] Load .env variables early (dotenv/config)
 *     [1b] Create NestJS app instance with AppModule
 *     [1c] Configure CORS (Cross-Origin Resource Sharing) for frontend
 *     [1d] Apply global middleware: Helmet (security), Validation, etc.
 *     [1e] Set API prefix: /v1 (enables future versioning: /v2, /v3, etc.)
 *     [1f] Enable graceful shutdown hooks
 *     [1g] Start listening on PORT (default 3001)
 *
 * [2] SECURITY LAYERS
 *     [2a] Helmet: Adds HTTP headers to prevent XSS, clickjacking, MIME-type sniffing
 *     [2b] CORS: Only allow requests from trusted origins (frontend domain)
 *     [2c] ValidationPipe: Reject invalid DTO data early (whitelist, forbid extra fields)
 *     [2d] JWT Guard: Protect routes requiring authentication
 *
 * [3] WHY this architecture?
 *     [3a] Early .env loading prevents "undefined" secrets later
 *     [3b] Helmet protects against common web vulnerabilities
 *     [3c] Global validation pipe prevents malformed requests from reaching services
 *     [3d] API versioning (/v1) allows backward compatibility when API changes
 *     [3e] Logger provides startup diagnostics (port, env, database host)
 */

import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { ValidationPipe, Logger } from '@nestjs/common';

async function bootstrap() {
  // [4] INITIALIZE LOGGER
  //     Used to log startup info, warnings, errors during bootstrap
  const logger = new Logger('Bootstrap');

  // [5] CREATE NESTJS APP INSTANCE
  //     [5a] AppModule: root module containing all feature modules & global config
  //     [5b] CORS configuration: allow frontend to call API from different origin
  //     [5c] credentials: true = allow cookies/auth headers in cross-origin requests
  const app = await NestFactory.create(AppModule, {
    cors: {
      // WHY split by comma? Support multiple origins (local dev, staging, production)
      origin: process.env.CORS_ORIGIN?.split(',') || '*',
      credentials: true,
    },
  });

  // [6] SECURITY MIDDLEWARE
  //     Apply Helmet to set secure HTTP headers automatically
  //     Prevents: XSS (cross-site scripting), clickjacking, MIME-type sniffing
  app.use(helmet());

  // [7] API VERSIONING PREFIX
  //     All routes will be prefixed with /v1
  //     Example: POST /auth/login → /v1/auth/login
  //     WHY? Allows future /v2 without breaking existing clients
  app.setGlobalPrefix('v1');

  // [8] GLOBAL VALIDATION PIPE
  //     Applied to all POST/PUT/PATCH requests automatically
  //     [8a] transform: true = convert string to proper types (e.g., "123" → 123)
  //     [8b] whitelist: true = remove unknown fields from DTO
  //     [8c] forbidNonWhitelisted: true = reject request if extra fields present
  //     [8d] enableImplicitConversion: true = convert types implicitly (number, boolean, etc.)
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // [9] GRACEFUL SHUTDOWN
  //     Allows pending requests to complete before process exits
  //     WHY? Prevents data loss when redeploying or scaling down containers
  app.enableShutdownHooks();

  // [10] START SERVER
  //      Listen on PORT (from .env or default 3001)
  const port = process.env.PORT || 3001;
  await app.listen(port);

  // [11] STARTUP DIAGNOSTICS
  //      Log useful info for debugging (port, environment, database)
  logger.log(`🚀 ALOVE API listening on http://localhost:${port}/v1`);
  logger.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.log(`🗄️  Database: ${process.env.DATABASE_URL?.split('@')[1] || 'not configured'}`);

  // [12] WHY these logs?
  //      [12a] Port: confirm API started on expected port
  //      [12b] Environment: distinguish prod/staging/dev behavior
  //      [12c] Database host: verify correct DB connection (especially in Docker)
}

// [13] ERROR HANDLING
//      If bootstrap fails, log error and exit with code 1 (container restart)
bootstrap().catch((err) => {
  console.error('❌ Failed to start application:', err);
  process.exit(1);
});
