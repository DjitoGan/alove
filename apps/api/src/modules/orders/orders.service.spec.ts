/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                    ORDERS SERVICE TESTS — Basic Unit Tests                                        ║
 * ║  Tests: Order creation validation, error handling                                                 ║
 * ║  Focus: Input validation and exception throwing                                                   ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notifications/notification.service';

describe('OrdersService - Validation', () => {
  let service: OrdersService;

  beforeEach(async () => {
    const mockPrisma = {
      part: {
        findMany: jest.fn(),
      },
    };

    const mockNotificationService = {
      sendEmail: jest.fn().mockResolvedValue({ success: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  describe('create', () => {
    it('should be defined', () => {
      expect(service.create).toBeDefined();
    });

    it('should throw NotFoundException when parts not found', async () => {
      const mockPrisma = {
        part: {
          findMany: jest.fn().mockResolvedValue([]), // No parts found
        },
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          OrdersService,
          { provide: PrismaService, useValue: mockPrisma },
          {
            provide: NotificationService,
            useValue: { sendEmail: jest.fn() },
          },
        ],
      }).compile();

      const testService = module.get<OrdersService>(OrdersService);

      await expect(
        testService.create('user-1', {
          items: [{ partId: 'invalid-id', quantity: 1 }],
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
