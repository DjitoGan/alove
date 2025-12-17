/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                        ADMIN AUDIT CONTROLLER — Audit Log Management                              ║
 * ║  Handles: View audit logs, filter, export, analyze security events                                ║
 * ║  Routes: GET /admin/audit-logs, GET /admin/audit-logs/stats, etc.                                 ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 *
 * [1] ENDPOINT OVERVIEW
 *     [1a] GET /audit-logs: Retrieve paginated audit logs (all or filtered)
 *     [1b] GET /audit-logs/stats: Get action statistics (logins, failures, etc.)
 *     [1c] GET /audit-logs/failed-logins: Get failed login attempts by IP (for security)
 *
 * [2] SECURITY
 *     [2a] @UseGuards(JwtAuthGuard, RolesGuard): Only ADMIN can access
 *     [2b] @Roles(UserRole.ADMIN): Enforce role-based access
 *     [2c] All admin actions themselves are audited
 */

import { Controller, Get, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuditLoggingService } from '../auth/services/audit-logging.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('admin/audit-logs')
@ApiTags('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class AdminAuditController {
  constructor(private auditLoggingService: AuditLoggingService) {}

  /**
   * GET /admin/audit-logs
   * Retrieve paginated audit logs with optional filters
   *
   * Query params:
   *   - action?: string (LOGIN, LOGOUT, PASSWORD_CHANGE, etc.)
   *   - status?: 'SUCCESS' | 'FAILURE'
   *   - userId?: string
   *   - startDate?: ISO date string
   *   - endDate?: ISO date string
   *   - limit?: number (default 100, max 500)
   *   - offset?: number (default 0)
   *
   * Example: GET /admin/audit-logs?action=LOGIN&status=FAILURE&limit=50
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async getAuditLogs(
    @Query('action') action?: string,
    @Query('status') status?: 'SUCCESS' | 'FAILURE',
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const filters = {
      action: action || undefined,
      status: status as 'SUCCESS' | 'FAILURE' | undefined,
      userId: userId || undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    };

    const pageLimit = Math.min(parseInt(limit || '100'), 500);
    const pageOffset = parseInt(offset || '0');

    return this.auditLoggingService.getAllAuditLogs(filters, pageLimit, pageOffset);
  }

  /**
   * GET /admin/audit-logs/stats
   * Get action statistics for monitoring
   *
   * Query params:
   *   - days?: number (default 30)
   *
   * Returns:
   *   - Array of { action, status, _count: { total } }
   *
   * Example: GET /admin/audit-logs/stats?days=7
   * Returns: [
   *   { action: 'LOGIN', status: 'SUCCESS', _count: { total: 250 } },
   *   { action: 'LOGIN', status: 'FAILURE', _count: { total: 5 } },
   *   ...
   * ]
   */
  @Get('stats')
  @HttpCode(HttpStatus.OK)
  async getActionStats(@Query('days') days?: string) {
    const daysToCheck = Math.min(parseInt(days || '30'), 365);
    return this.auditLoggingService.getActionStats(daysToCheck);
  }

  /**
   * GET /admin/audit-logs/failed-logins
   * Get failed login attempts by IP address (last 24 hours by default)
   *
   * Query params:
   *   - hours?: number (default 24, max 168)
   *
   * Returns:
   *   - Array of { ipAddress, _count: { total } } sorted by count DESC
   *
   * Use case: Identify brute force attack sources
   *
   * Example: GET /admin/audit-logs/failed-logins?hours=6
   * Returns: [
   *   { ipAddress: '192.168.1.1', _count: { total: 50 } },  // Suspicious!
   *   { ipAddress: '10.0.0.1', _count: { total: 2 } },
   * ]
   */
  @Get('failed-logins')
  @HttpCode(HttpStatus.OK)
  async getFailedLoginsByIp(@Query('hours') hours?: string) {
    const hoursToCheck = Math.min(parseInt(hours || '24'), 168);
    return this.auditLoggingService.getFailedLoginsByIp(hoursToCheck);
  }
}
