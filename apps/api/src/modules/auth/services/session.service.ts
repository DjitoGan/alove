import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

export interface CreateSessionDto {
  userId: string;
  refreshTokenHash: string;
  ipAddress: string;
  userAgent?: string;
  deviceInfo?: string;
}

/**
 * Session Service
 * Manages user sessions, refresh tokens, and device tracking
 *
 * Features:
 * - Track active sessions per user
 * - Invalidate specific sessions
 * - Logout all devices
 * - Track IP address and device info for security
 */
@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create new session (called after login)
   */
  async createSession(data: CreateSessionDto): Promise<string> {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const session = await this.prisma.session.create({
      data: {
        userId: data.userId,
        refreshTokenHash: data.refreshTokenHash,
        ipAddress: data.ipAddress,
        deviceInfo: data.deviceInfo,
        expiresAt,
      },
    });

    this.logger.log(`New session created for user ${data.userId} from ${data.ipAddress}`);
    return session.id;
  }

  /**
   * Get all active sessions for user
   */
  async getActiveSessions(userId: string) {
    return this.prisma.session.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      select: {
        id: true,
        ipAddress: true,
        deviceInfo: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Revoke specific session
   */
  async revokeSession(sessionId: string, userId: string): Promise<void> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.userId !== userId) {
      throw new BadRequestException('Session not found');
    }

    await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        revokedAt: new Date(),
      },
    });

    this.logger.log(`Session ${sessionId} revoked for user ${userId}`);
  }

  /**
   * Revoke all sessions for user (logout all devices)
   */
  async revokeAllSessions(userId: string): Promise<number> {
    const result = await this.prisma.session.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    this.logger.log(`All sessions revoked for user ${userId} (${result.count} sessions)`);
    return result.count;
  }

  /**
   * Validate refresh token against session
   */
  async validateRefreshToken(userId: string, refreshToken: string): Promise<string> {
    const sessions = await this.prisma.session.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (sessions.length === 0) {
      throw new BadRequestException('No active session found');
    }

    for (const session of sessions) {
      const isValid = await bcrypt.compare(refreshToken, session.refreshTokenHash);

      if (isValid) {
        return session.id;
      }
    }

    this.logger.warn(`Invalid refresh token attempt for user ${userId}`);
    throw new BadRequestException('Invalid refresh token');
  }

  /**
   * Cleanup expired sessions (run periodically)
   */
  async cleanupExpiredSessions(): Promise<number> {
    const result = await this.prisma.session.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    this.logger.log(`Cleaned up ${result.count} expired sessions`);
    return result.count;
  }
}
