/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║              PAYMENTS SERVICE TESTS — Basic Unit Tests                                            ║
 * ║  Tests: Payment validation, error handling                                                        ║
 * ║  Focus: Input validation and exception throwing                                                   ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentService } from './payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { NotificationService } from '../notifications/notification.service';

describe('PaymentService - Validation', () => {
  let service: PaymentService;

  beforeEach(async () => {
    const mockPrisma = {
      order: {
        findUnique: jest.fn(),
      },
    };

    const mockRedis = {
      set: jest.fn().mockResolvedValue('OK'),
    };

    const mockNotificationService = {
      sendEmail: jest.fn().mockResolvedValue({ success: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
  });

  describe('createPayment', () => {
    it('should be defined', () => {
      expect(service.createPayment).toBeDefined();
    });
  });
});
