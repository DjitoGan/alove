// apps/api/test/otp.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { RedisService } from '../src/modules/redis/redis.service';

describe('OTP E2E Tests (Sprint 0)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redis: RedisService;

  const testEmail = `test-${Date.now()}@example.com`;
  let generatedOtp: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.setGlobalPrefix('v1');
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    redis = moduleFixture.get<RedisService>(RedisService);
  });

  afterAll(async () => {
    // Cleanup
    await prisma.user.deleteMany({
      where: { email: testEmail },
    });
    await app.close();
  });

  describe('POST /v1/otp/generate', () => {
    it('should generate OTP for registration', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/otp/generate')
        .send({
          email: testEmail,
          purpose: 'registration',
        })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('expiresIn');

      // In dev mode, OTP is returned
      if (process.env.NODE_ENV !== 'production') {
        expect(response.body).toHaveProperty('otp');
        expect(response.body.otp).toMatch(/^\d{6}$/);
        generatedOtp = response.body.otp;
      }
    });

    it('should reject duplicate registration OTP request', async () => {
      await request(app.getHttpServer())
        .post('/v1/otp/generate')
        .send({
          email: testEmail,
          purpose: 'registration',
        })
        .expect(400);
    });

    it('should reject invalid email', async () => {
      await request(app.getHttpServer())
        .post('/v1/otp/generate')
        .send({
          email: 'invalid-email',
          purpose: 'registration',
        })
        .expect(400);
    });
  });

  describe('POST /v1/otp/verify', () => {
    it('should verify correct OTP', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/otp/verify')
        .send({
          email: testEmail,
          otp: generatedOtp,
          purpose: 'registration',
        })
        .expect(200);

      expect(response.body).toHaveProperty('valid', true);
      expect(response.body).toHaveProperty('message');
    });

    it('should reject wrong OTP', async () => {
      // Generate new OTP for different email
      const newEmail = `test2-${Date.now()}@example.com`;
      await request(app.getHttpServer()).post('/v1/otp/generate').send({
        email: newEmail,
        purpose: 'registration',
      });

      await request(app.getHttpServer())
        .post('/v1/otp/verify')
        .send({
          email: newEmail,
          otp: '000000',
          purpose: 'registration',
        })
        .expect(401);
    });

    it('should reject expired OTP', async () => {
      const expiredEmail = `expired-${Date.now()}@example.com`;

      // Manually set expired OTP in Redis
      await redis.set(`otp:registration:${expiredEmail}`, '123456', 1);
      await new Promise((resolve) => setTimeout(resolve, 1100));

      await request(app.getHttpServer())
        .post('/v1/otp/verify')
        .send({
          email: expiredEmail,
          otp: '123456',
          purpose: 'registration',
        })
        .expect(401);
    });
  });

  describe('OTP Complete Flow', () => {
    it('should complete full OTP verification flow', async () => {
      const flowEmail = `flow-${Date.now()}@example.com`;

      // Step 1: Generate OTP
      const genResponse = await request(app.getHttpServer())
        .post('/v1/otp/generate')
        .send({
          email: flowEmail,
          purpose: 'registration',
        })
        .expect(200);

      const otp = genResponse.body.otp;
      expect(otp).toBeDefined();

      // Step 2: Verify OTP
      await request(app.getHttpServer())
        .post('/v1/otp/verify')
        .send({
          email: flowEmail,
          otp,
          purpose: 'registration',
        })
        .expect(200);

      // Step 3: Try to verify again (should fail - OTP consumed)
      await request(app.getHttpServer())
        .post('/v1/otp/verify')
        .send({
          email: flowEmail,
          otp,
          purpose: 'registration',
        })
        .expect(401);
    });
  });
});
