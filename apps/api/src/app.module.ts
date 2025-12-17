// apps/api/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from './modules/prisma/prisma.module';
import { PartsModule } from './modules/parts/parts.module';
import { AuthModule } from './modules/auth/auth.module';
import { OtpModule } from './modules/otp/otp.module';
import { RedisModule } from './modules/redis/redis.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentModule } from './modules/payments/payments.module';
import { NotificationModule } from './modules/notifications/notification.module';
import { AdminModule } from './modules/admin/admin.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { HealthController } from './modules/health/health.controller';
import { GlobalHttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor'; // garde comme tu l’as

// (Optionnel) si tu veux valider les variables d'env, décommente :
// import * as Joi from 'joi';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Charge .env différent selon l'environnement (optionnel)
      envFilePath: process.env.NODE_ENV === 'production' ? '.env' : '.env.development',

      // (Optionnel) Validation des variables d'env :
      // validationSchema: Joi.object({
      //   DATABASE_URL: Joi.string().uri().required(),
      //   PORT: Joi.number().default(3001),
      // }),
    }),

    PrismaModule,
    RedisModule,
    AuthModule,
    OtpModule,
    PartsModule,
    OrdersModule,
    PaymentModule,
    NotificationModule,
    AdminModule,
    AnalyticsModule,
    CatalogModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalHttpExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
