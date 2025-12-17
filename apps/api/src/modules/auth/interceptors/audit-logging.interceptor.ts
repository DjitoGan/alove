import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request } from 'express';
import { AuditLoggingService } from '../services/audit-logging.service';

/**
 * Audit Logging Interceptor
 * Logs all authentication-related actions to the audit log
 *
 * Logged Actions:
 * - /auth/login → LOGIN
 * - /auth/logout → LOGOUT
 * - /auth/change-password → PASSWORD_CHANGE
 * - /auth/verify-email → EMAIL_VERIFIED
 * - /auth/reset-password → PASSWORD_RESET
 * - /admin/* → ADMIN_ACTION
 */
@Injectable()
export class AuditLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLoggingInterceptor.name);

  constructor(private auditLoggingService: AuditLoggingService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const userPayload = (request as Request & { user?: { sub: string } }).user;

    // Get audit action from route
    const action = this.getActionFromRoute(request.path, request.method);

    if (!action) {
      // Route not audited
      return next.handle();
    }

    const userId = userPayload?.sub || 'ANONYMOUS';
    const ipAddress = this.getClientIp(request);
    const userAgent = request.headers['user-agent'];

    return next.handle().pipe(
      tap(async (_response) => {
        // Log successful action
        await this.auditLoggingService.log({
          userId,
          action,
          status: 'SUCCESS',
          ipAddress,
          userAgent,
          metadata: {
            path: request.path,
            method: request.method,
            statusCode: context.switchToHttp().getResponse().statusCode,
          },
        });
      }),
      catchError(async (error) => {
        // Log failed action
        await this.auditLoggingService.log({
          userId,
          action,
          status: 'FAILURE',
          reason: error.message || 'Unknown error',
          ipAddress,
          userAgent,
          metadata: {
            path: request.path,
            method: request.method,
            error: error.name,
            statusCode: error.status || 500,
          },
        });

        throw error;
      }),
    );
  }

  /**
   * Determine audit action from route
   */
  private getActionFromRoute(path: string, method: string): string | null {
    const auditedRoutes: Record<string, Record<string, string>> = {
      '/v1/auth/login': { POST: 'LOGIN' },
      '/v1/auth/logout': { POST: 'LOGOUT' },
      '/v1/auth/register': { POST: 'REGISTER' },
      '/v1/auth/verify-email': { POST: 'EMAIL_VERIFIED' },
      '/v1/auth/resend-otp': { POST: 'RESEND_OTP' },
      '/v1/auth/forgot-password': { POST: 'PASSWORD_RESET_REQUEST' },
      '/v1/auth/reset-password': { POST: 'PASSWORD_RESET' },
      '/v1/auth/change-password': { POST: 'PASSWORD_CHANGE' },
      '/v1/auth/sessions/logout-all': { POST: 'LOGOUT_ALL_SESSIONS' },
      '/v1/admin/roles': { POST: 'ROLE_ASSIGNED', PATCH: 'ROLE_UPDATED' },
      '/v1/admin/users': { GET: 'ADMIN_VIEW_USERS' },
    };

    // Check exact match
    if (auditedRoutes[path]?.[method]) {
      return auditedRoutes[path][method];
    }

    // Check path patterns
    if (path.startsWith('/v1/admin/')) {
      return `ADMIN_${method.toUpperCase()}`;
    }

    return null;
  }

  /**
   * Get client IP address
   */
  private getClientIp(request: Request): string {
    return (
      (request.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
      request.socket?.remoteAddress ||
      'unknown'
    );
  }
}
