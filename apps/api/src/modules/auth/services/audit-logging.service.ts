import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface AuditLogData {
  userId: string;
  action: string; // LOGIN, LOGOUT, PASSWORD_CHANGE, EMAIL_VERIFIED, ROLE_CHANGED, etc.
  status: 'SUCCESS' | 'FAILURE';
  reason?: string;
  ipAddress: string;
  userAgent?: string;
  metadata?: Record<string, string | number | boolean | null>;
}

/**
 * Audit Logging Service
 * Logs all security-related actions for compliance and monitoring
 *
 * Audited Actions:
 * - User login/logout
 * - Password changes
 * - Email verification
 * - Role changes
 * - Session revocation
 * - Permission denials
 */
@Injectable()
export class AuditLoggingService {
  private readonly logger = new Logger(AuditLoggingService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Log audit event
   */
  async log(data: AuditLogData): Promise<string> {
    try {
      const auditLog = await this.prisma.auditLog.create({
        data: {
          userId: data.userId,
          action: data.action,
          status: data.status,
          reason: data.reason,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          metadata: data.metadata || {},
        },
      });

      // Log to application logger
      this.logger.log(
        `[${data.action}] User: ${data.userId}, Status: ${data.status}, IP: ${data.ipAddress}`,
      );

      return auditLog.id;
    } catch (error) {
      this.logger.error(`Failed to create audit log for action ${data.action}:`, error);
      // Don't throw - audit logging should not break application flow
      return '';
    }
  }

  /**
   * Get audit logs for user
   */
  async getUserAuditLogs(userId: string, limit = 50, offset = 0) {
    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: { userId },
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where: { userId } }),
    ]);

    return {
      logs,
      pagination: {
        total,
        limit,
        offset,
      },
    };
  }

  /**
   * Get all audit logs (admin only)
   */
  async getAllAuditLogs(
    filters?: {
      action?: string;
      status?: 'SUCCESS' | 'FAILURE';
      userId?: string;
      startDate?: Date;
      endDate?: Date;
    },
    limit = 100,
    offset = 0,
  ) {
    interface FilterObj {
      action?: string;
      status?: 'SUCCESS' | 'FAILURE';
      userId?: string;
      createdAt?: {
        gte?: Date;
        lte?: Date;
      };
    }

    const where: FilterObj = {};

    if (filters?.action) {
      where.action = filters.action;
    }
    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.userId) {
      where.userId = filters.userId;
    }
    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters?.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters?.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      pagination: {
        total,
        limit,
        offset,
      },
    };
  }

  /**
   * Get action statistics
   */
  async getActionStats(days = 30) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const stats = await this.prisma.auditLog.groupBy({
      by: ['action', 'status'],
      where: {
        createdAt: {
          gte: startDate,
        },
      },
      _count: true,
    });

    return stats;
  }

  /**
   * Get failed login attempts by IP
   */
  async getFailedLoginsByIp(limit = 24) {
    const result = await this.prisma.auditLog.groupBy({
      by: ['ipAddress'],
      where: {
        action: 'LOGIN',
        status: 'FAILURE',
        createdAt: {
          gte: new Date(Date.now() - limit * 60 * 60 * 1000),
        },
      },
      _count: true,
      orderBy: {
        _count: {
          ipAddress: 'desc',
        },
      },
    });

    return result;
  }

  /**
   * Cleanup old audit logs (keep last 90 days)
   */
  async cleanupOldLogs(daysToKeep = 90): Promise<number> {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

    const result = await this.prisma.auditLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    this.logger.log(`Cleaned up ${result.count} old audit logs`);
    return result.count;
  }
}
