// apps/api/src/common/sentry/sentry.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

@Injectable()
export class SentryService {
  private readonly logger = new Logger(SentryService.name);
  private initialized = false;

  constructor(private configService: ConfigService) {
    this.init();
  }

  private init() {
    const sentryDsn = this.configService.get<string>('SENTRY_DSN');

    if (!sentryDsn) {
      this.logger.warn('Sentry DSN not configured. Error tracking disabled.');
      return;
    }

    try {
      Sentry.init({
        dsn: sentryDsn,
        environment: this.configService.get<string>('NODE_ENV', 'development'),
        integrations: [nodeProfilingIntegration()],
        tracesSampleRate: this.configService.get<string>('NODE_ENV') === 'production' ? 0.1 : 1.0,
        profilesSampleRate: this.configService.get<string>('NODE_ENV') === 'production' ? 0.1 : 1.0,
      });

      this.initialized = true;
      this.logger.log('Sentry initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Sentry:', error);
    }
  }

  captureException(exception: any, context?: any) {
    if (!this.initialized) return;

    Sentry.captureException(exception, {
      extra: context,
    });
  }

  captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
    if (!this.initialized) return;

    Sentry.captureMessage(message, level);
  }

  setUser(user: { id: string; email: string }) {
    if (!this.initialized) return;

    Sentry.setUser(user);
  }

  clearUser() {
    if (!this.initialized) return;

    Sentry.setUser(null);
  }
}
