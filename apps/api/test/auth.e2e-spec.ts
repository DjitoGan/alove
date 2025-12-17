// apps/api/test/auth.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';

describe('Auth E2E Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const testUser = {
    email: `auth-test-${Date.now()}@example.com`,
    password: 'TestPassword123!',
  };

  let accessToken: string;
  let refreshToken: string;

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
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: testUser.email },
    });
    await app.close();
  });

  describe('POST /v1/auth/register', () => {
    it('should register a new user', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send(testUser)
        .expect(201);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).toHaveProperty('email', testUser.email);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('expiresIn');

      accessToken = response.body.accessToken;
      refreshToken = response.body.refreshToken;
    });

    it('should reject duplicate email', async () => {
      await request(app.getHttpServer()).post('/v1/auth/register').send(testUser).expect(409);
    });

    it('should reject invalid email', async () => {
      await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send({
          email: 'invalid-email',
          password: 'ValidPass123!',
        })
        .expect(400);
    });

    it('should reject short password', async () => {
      await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: 'short',
        })
        .expect(400);
    });
  });

  describe('POST /v1/auth/login', () => {
    it('should login with correct credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send(testUser)
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
    });

    it('should reject wrong password', async () => {
      await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword123!',
        })
        .expect(401);
    });

    it('should reject non-existent user', async () => {
      await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'SomePassword123!',
        })
        .expect(401);
    });
  });

  describe('GET /v1/auth/me', () => {
    it('should get user profile with valid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('email', testUser.email);
    });

    it('should reject request without token', async () => {
      await request(app.getHttpServer()).get('/v1/auth/me').expect(401);
    });

    it('should reject invalid token', async () => {
      await request(app.getHttpServer())
        .get('/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('POST /v1/auth/refresh', () => {
    it('should refresh access token with valid refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/auth/refresh')
        .set('Authorization', `Bearer ${refreshToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('expiresIn');

      // Update tokens
      accessToken = response.body.accessToken;
      refreshToken = response.body.refreshToken;
    });

    it('should reject access token for refresh endpoint', async () => {
      await request(app.getHttpServer())
        .post('/v1/auth/refresh')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);
    });
  });
});
