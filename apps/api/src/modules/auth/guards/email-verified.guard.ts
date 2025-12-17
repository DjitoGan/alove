import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Email Verified Guard
 * Requires user's email to be verified for accessing protected operations
 *
 * Used on:
 * - Checkout endpoint
 * - Place order endpoint
 * - Update profile endpoint
 * - Any sensitive user operation
 */
@Injectable()
export class EmailVerifiedGuard implements CanActivate {
  private readonly logger = new Logger(EmailVerifiedGuard.name);

  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // User should be injected by JWT guard (executed first)
    const userPayload = (request as Request & { user?: { sub: string } }).user;

    if (!userPayload || !userPayload.sub) {
      throw new UnauthorizedException('User not authenticated');
    }

    try {
      const dbUser = await this.prisma.user.findUnique({
        where: { id: userPayload.sub },
        select: { isEmailVerified: true },
      });

      if (!dbUser) {
        throw new UnauthorizedException('User not found');
      }

      if (!dbUser.isEmailVerified) {
        throw new UnauthorizedException(
          'Email verification required. Check your inbox for verification code.',
        );
      }

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      this.logger.error('Email verified guard check failed:', error);
      throw new UnauthorizedException('Failed to verify email status');
    }
  }
}
