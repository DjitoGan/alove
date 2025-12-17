import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@Controller('health')
export class HealthController {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  @Get()
  async ping() {
    const checks = {
      ok: true,
      service: 'api',
      ts: new Date().toISOString(),
      database: 'unknown',
      redis: 'unknown',
    };

    // Check database
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = 'ok';
    } catch (error) {
      checks.database = 'error';
    }

    // Check Redis
    try {
      await this.redis.set('health:check', 'ok', 10);
      const result = await this.redis.get('health:check');
      checks.redis = result === 'ok' ? 'ok' : 'error';
    } catch (error) {
      checks.redis = 'error';
    }

    return checks;
  }
}
