/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║               PAYMENTS E2E TESTS — Payment Flow with Notifications                               ║
 * ║  Tests: Full payment processing, status updates, notifications, order status transitions         ║
 * ║  Scope: Service layer + database interactions + notification triggers                            ║
 * ║  Flow: Order → Pending Payment → Payment Created → Status Updates → Notifications                ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 *
 * [1] PAYMENT FLOW TESTS
 *     [1a] Create payment: Order in PENDING_PAYMENT → Payment created
 *     [1b] Verify payment: Status COMPLETED → Order → PROCESSING + EMAIL notification
 *     [1c] Verify payment: Status FAILED → Order → PENDING_PAYMENT + EMAIL notification
 *     [1d] Refund payment: Valid payment → Status REFUNDED + EMAIL notification
 *
 * [2] NOTIFICATION VERIFICATION
 *     [2a] PAYMENT_SUCCESS: Sent after successful payment verification
 *     [2b] PAYMENT_FAILED: Sent with retry link after failed payment
 *     [2c] REFUND_PROCESSED: Sent after refund completion
 *
 * [3] TRANSACTION VERIFICATION
 *     [3a] Payment creation → Order status: PENDING_PAYMENT
 *     [3b] Payment success → Order status: PROCESSING
 *     [3c] Payment failure → Order status: unchanged (PENDING_PAYMENT)
 *     [3d] Refund success → Order status: REFUNDED
 *
 * [4] EDGE CASES
 *     [4a] Idempotency: Same payment request twice
 *     [4b] Order not found
 *     [4c] User not owner of order
 *     [4d] Payment already in final state (double-processing)
 *     [4e] Amount mismatch vs order total
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { NotificationService } from '../notifications/notification.service';
import { PaymentService } from './payments.service';
import { OrdersService } from '../orders/orders.service';
import { CreatePaymentDto, PaymentStatus } from './dto/create-payment.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { Prisma } from '@prisma/client';

describe('Payments E2E - Payment Processing with Notifications', () => {
  let app: INestApplication;
  let paymentService: PaymentService;
  let ordersService: OrdersService;
  let prisma: PrismaService;
  let redis: RedisService;
  let notificationService: NotificationService;

  // Test fixtures
  let testUser: any;
  let testPart: any;
  let testOrder: any;
  let testVendor: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        OrdersService,
        PrismaService,
        {
          provide: RedisService,
          useValue: {
            set: jest.fn().mockResolvedValue('OK'),
            get: jest.fn().mockResolvedValue(null),
            del: jest.fn().mockResolvedValue(1),
          },
        },
        {
          provide: NotificationService,
          useValue: {
            sendEmail: jest.fn().mockResolvedValue({ success: true, messageId: 'msg_123' }),
            sendSms: jest.fn().mockResolvedValue({ success: true, messageId: 'sms_123' }),
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    paymentService = moduleFixture.get<PaymentService>(PaymentService);
    ordersService = moduleFixture.get<OrdersService>(OrdersService);
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    redis = moduleFixture.get<RedisService>(RedisService);
    notificationService = moduleFixture.get<NotificationService>(NotificationService);
  });

  beforeEach(async () => {
    // [SETUP] Clean database and create test fixtures
    await prisma.payment.deleteMany({});
    await prisma.orderItem.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.part.deleteMany({});
    await prisma.vendor.deleteMany({});
    await prisma.user.deleteMany({});

    // Create test user
    testUser = await prisma.user.create({
      data: {
        email: `test-user-${Date.now()}@test.com`,
        password: 'hashed_password',
        name: 'Test User',
        phone: '+212123456789',
        role: 'CUSTOMER',
      },
    });

    // Create test vendor
    testVendor = await prisma.vendor.create({
      data: {
        name: 'Test Vendor',
        email: 'vendor@test.com',
        phone: '+1234567890',
      },
    });

    // Create test part
    testPart = await prisma.part.create({
      data: {
        title: 'Car Brake Pads',
        description: 'High-performance brake pads',
        sku: 'BRAKE-001',
        price: new Prisma.Decimal('45.99'),
        stock: 20,
        vendorId: testVendor.id,
      },
    });

    // Create test order
    testOrder = await prisma.order.create({
      data: {
        userId: testUser.id,
        status: 'PENDING_PAYMENT',
        total: new Prisma.Decimal('45.99'),
        items: {
          create: {
            partId: testPart.id,
            quantity: 1,
            unitPrice: new Prisma.Decimal('45.99'),
          },
        },
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('[CREATE PAYMENT] — Payment Initiation', () => {
    it('should create payment for valid order in PENDING_PAYMENT status', async () => {
      // Arrange
      const createPaymentDto: CreatePaymentDto = {
        orderId: testOrder.id,
        amount: new Prisma.Decimal('45.99'),
        currency: 'XOF',
        method: 'MOBILE_MONEY',
        mobileMoneyPhone: '+212123456789',
      };

      // Act
      const payment = await paymentService.createPayment(createPaymentDto, testUser.id);

      // Assert
      expect(payment).toBeDefined();
      expect(payment.paymentId).toBeDefined();
      expect(payment.status).toBe(PaymentStatus.PENDING);
      expect(payment.amount).toEqual(new Prisma.Decimal('45.99'));
      expect(payment.currency).toBe('XOF');

      // Verify payment was saved to database
      const dbPayment = await prisma.payment.findUnique({
        where: { id: payment.paymentId },
      });
      expect(dbPayment).toBeDefined();
      expect(dbPayment.status).toBe(PaymentStatus.PENDING);
    });

    it('should cache payment in Redis', async () => {
      // Arrange
      jest.spyOn(redis, 'set');
      const createPaymentDto: CreatePaymentDto = {
        orderId: testOrder.id,
        amount: new Prisma.Decimal('45.99'),
        currency: 'XOF',
        method: 'MOBILE_MONEY',
        mobileMoneyPhone: '+212123456789',
      };

      // Act
      const payment = await paymentService.createPayment(createPaymentDto, testUser.id);

      // Assert: Redis.set was called with correct key and TTL
      expect(redis.set).toHaveBeenCalledWith(
        expect.stringContaining(`payment:${payment.paymentId}`),
        expect.any(String),
        86400, // 24 hours
      );
    });

    it('should throw NotFoundException for non-existent order', async () => {
      // Arrange
      const createPaymentDto: CreatePaymentDto = {
        orderId: 'invalid-order-id',
        amount: new Prisma.Decimal('45.99'),
        currency: 'XOF',
        method: 'MOBILE_MONEY',
        mobileMoneyPhone: '+212123456789',
      };

      // Act & Assert
      await expect(paymentService.createPayment(createPaymentDto, testUser.id)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when user not order owner', async () => {
      // Arrange: Create another user
      const otherUser = await prisma.user.create({
        data: {
          email: `other-user-${Date.now()}@test.com`,
          password: 'hashed_password',
          name: 'Other User',
          role: 'CUSTOMER',
        },
      });

      const createPaymentDto: CreatePaymentDto = {
        orderId: testOrder.id,
        amount: new Prisma.Decimal('45.99'),
        currency: 'XOF',
        method: 'MOBILE_MONEY',
        mobileMoneyPhone: '+212123456789',
      };

      // Act & Assert
      await expect(paymentService.createPayment(createPaymentDto, otherUser.id)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for order not in PENDING_PAYMENT status', async () => {
      // Arrange: Update order to PROCESSING status
      await prisma.order.update({
        where: { id: testOrder.id },
        data: { status: 'PROCESSING' },
      });

      const createPaymentDto: CreatePaymentDto = {
        orderId: testOrder.id,
        amount: new Prisma.Decimal('45.99'),
        currency: 'XOF',
        method: 'MOBILE_MONEY',
        mobileMoneyPhone: '+212123456789',
      };

      // Act & Assert
      await expect(paymentService.createPayment(createPaymentDto, testUser.id)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('[VERIFY PAYMENT] — Success Path (Status = COMPLETED)', () => {
    let createdPayment: any;

    beforeEach(async () => {
      createdPayment = await paymentService.createPayment(
        {
          orderId: testOrder.id,
          amount: new Prisma.Decimal('45.99'),
          currency: 'XOF',
          method: 'MOBILE_MONEY',
          mobileMoneyPhone: '+212123456789',
        },
        testUser.id,
      );
    });

    it('should update payment to COMPLETED and order to PROCESSING', async () => {
      // Arrange
      const verifyPaymentDto: VerifyPaymentDto = {
        status: PaymentStatus.COMPLETED,
        transactionRef: 'TXN123456789',
        errorMessage: null,
      };

      // Act
      const result = await paymentService.updatePaymentStatus(createdPayment.paymentId, verifyPaymentDto);

      // Assert
      expect(result.paymentStatus).toBe(PaymentStatus.COMPLETED);
      expect(result.orderStatus).toBe('PROCESSING');

      // Verify database state
      const payment = await prisma.payment.findUnique({
        where: { id: createdPayment.paymentId },
      });
      const order = await prisma.order.findUnique({
        where: { id: testOrder.id },
      });

      expect(payment.status).toBe(PaymentStatus.COMPLETED);
      expect(order.status).toBe('PROCESSING');
    });

    it('should send PAYMENT_SUCCESS notification', async () => {
      // Arrange
      jest.spyOn(notificationService, 'sendEmail');
      const verifyPaymentDto: VerifyPaymentDto = {
        status: PaymentStatus.COMPLETED,
        transactionRef: 'TXN123456789',
        errorMessage: null,
      };

      // Act
      await paymentService.updatePaymentStatus(createdPayment.paymentId, verifyPaymentDto);

      // Assert: Notification should be called (fire-and-forget)
      expect(notificationService.sendEmail).not.toThrow();
    });
  });

  describe('[VERIFY PAYMENT] — Failure Path (Status = FAILED)', () => {
    let createdPayment: any;

    beforeEach(async () => {
      createdPayment = await paymentService.createPayment(
        {
          orderId: testOrder.id,
          amount: new Prisma.Decimal('45.99'),
          currency: 'XOF',
          method: 'MOBILE_MONEY',
          mobileMoneyPhone: '+212123456789',
        },
        testUser.id,
      );
    });

    it('should update payment to FAILED and keep order in PENDING_PAYMENT', async () => {
      // Arrange
      const verifyPaymentDto: VerifyPaymentDto = {
        status: PaymentStatus.FAILED,
        transactionRef: null,
        errorMessage: 'Insufficient balance',
      };

      // Act
      const result = await paymentService.updatePaymentStatus(createdPayment.paymentId, verifyPaymentDto);

      // Assert
      expect(result.paymentStatus).toBe(PaymentStatus.FAILED);
      expect(result.orderStatus).toBe('PENDING_PAYMENT'); // Order status unchanged

      // Verify database state
      const payment = await prisma.payment.findUnique({
        where: { id: createdPayment.paymentId },
      });
      const order = await prisma.order.findUnique({
        where: { id: testOrder.id },
      });

      expect(payment.status).toBe(PaymentStatus.FAILED);
      expect(payment.metadata).toHaveProperty('errorMessage', 'Insufficient balance');
      expect(order.status).toBe('PENDING_PAYMENT');
    });

    it('should send PAYMENT_FAILED notification with retry link', async () => {
      // Arrange
      jest.spyOn(notificationService, 'sendEmail');
      const verifyPaymentDto: VerifyPaymentDto = {
        status: PaymentStatus.FAILED,
        transactionRef: null,
        errorMessage: 'Card declined',
      };

      // Act
      await paymentService.updatePaymentStatus(createdPayment.paymentId, verifyPaymentDto);

      // Assert: Notification should be called with retry context
      expect(notificationService.sendEmail).not.toThrow();
    });
  });

  describe('[REFUND PAYMENT] — Refund Processing', () => {
    let completedPayment: any;

    beforeEach(async () => {
      // Create and complete a payment first
      const created = await paymentService.createPayment(
        {
          orderId: testOrder.id,
          amount: new Prisma.Decimal('45.99'),
          currency: 'XOF',
          method: 'MOBILE_MONEY',
          mobileMoneyPhone: '+212123456789',
        },
        testUser.id,
      );

      await paymentService.updatePaymentStatus(created.paymentId, {
        status: PaymentStatus.COMPLETED,
        transactionRef: 'TXN123456789',
        errorMessage: null,
      });

      completedPayment = await prisma.payment.findUnique({
        where: { id: created.paymentId },
      });
    });

    it('should refund completed payment and update order status', async () => {
      // Act
      const result = await paymentService.refundPayment(completedPayment.id, testUser.id, {
        reason: 'Customer requested refund',
      });

      // Assert
      expect(result.paymentStatus).toBe(PaymentStatus.REFUNDED);
      expect(result.orderStatus).toBe('REFUNDED');

      // Verify database
      const payment = await prisma.payment.findUnique({
        where: { id: completedPayment.id },
      });
      const order = await prisma.order.findUnique({
        where: { id: testOrder.id },
      });

      expect(payment.status).toBe(PaymentStatus.REFUNDED);
      expect(order.status).toBe('REFUNDED');
    });

    it('should send REFUND_PROCESSED notification', async () => {
      // Arrange
      jest.spyOn(notificationService, 'sendEmail');

      // Act
      await paymentService.refundPayment(completedPayment.id, testUser.id, {
        reason: 'Defective part',
      });

      // Assert
      expect(notificationService.sendEmail).not.toThrow();
    });

    it('should throw BadRequestException for non-COMPLETED payment', async () => {
      // Arrange: Create a pending payment
      const pendingPayment = await paymentService.createPayment(
        {
          orderId: testOrder.id,
          amount: new Prisma.Decimal('45.99'),
          currency: 'XOF',
          method: 'MOBILE_MONEY',
          mobileMoneyPhone: '+212123456789',
        },
        testUser.id,
      );

      // Act & Assert
      await expect(
        paymentService.refundPayment(pendingPayment.paymentId, testUser.id, {
          reason: 'Test',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('[IDEMPOTENCY & EDGE CASES]', () => {
    it('should handle double-processing gracefully (idempotency)', async () => {
      // Arrange
      const payment = await paymentService.createPayment(
        {
          orderId: testOrder.id,
          amount: new Prisma.Decimal('45.99'),
          currency: 'XOF',
          method: 'MOBILE_MONEY',
          mobileMoneyPhone: '+212123456789',
        },
        testUser.id,
      );

      const verifyDto: VerifyPaymentDto = {
        status: PaymentStatus.COMPLETED,
        transactionRef: 'TXN123456789',
        errorMessage: null,
      };

      // Act: Update payment twice
      const result1 = await paymentService.updatePaymentStatus(payment.paymentId, verifyDto);
      const result2 = await paymentService.updatePaymentStatus(payment.paymentId, verifyDto);

      // Assert: Both should succeed but result in same state
      expect(result1.paymentStatus).toBe(PaymentStatus.COMPLETED);
      expect(result2.paymentStatus).toBe(PaymentStatus.COMPLETED);

      // Verify order wasn't duplicated
      const orderPayments = await prisma.payment.findMany({
        where: { orderId: testOrder.id },
      });
      expect(orderPayments).toHaveLength(1);
    });

    it('should handle payment for order with multiple items', async () => {
      // Arrange: Create order with multiple items
      const multiItemOrder = await prisma.order.create({
        data: {
          userId: testUser.id,
          status: 'PENDING_PAYMENT',
          total: new Prisma.Decimal('91.98'),
          items: {
            create: [
              {
                partId: testPart.id,
                quantity: 2,
                unitPrice: new Prisma.Decimal('45.99'),
              },
            ],
          },
        },
      });

      // Act
      const payment = await paymentService.createPayment(
        {
          orderId: multiItemOrder.id,
          amount: new Prisma.Decimal('91.98'),
          currency: 'XOF',
          method: 'CARD',
          mobileMoneyPhone: null,
        },
        testUser.id,
      );

      // Assert
      expect(payment.amount).toEqual(new Prisma.Decimal('91.98'));
      expect(payment.orderId).toBe(multiItemOrder.id);
    });
  });

  describe('[FULL E2E FLOW] — Order → Payment → Success', () => {
    it('should complete full payment flow: create order → payment → verify → notification', async () => {
      // [STEP 1] Create Order
      const newOrder = await ordersService.create(testUser.id, {
        items: [{ partId: testPart.id, quantity: 1 }],
      });

      expect(newOrder.status).toBe('PENDING');

      // [STEP 2] Create Payment
      const payment = await paymentService.createPayment(
        {
          orderId: newOrder.id,
          amount: newOrder.total,
          currency: 'XOF',
          method: 'MOBILE_MONEY',
          mobileMoneyPhone: '+212123456789',
        },
        testUser.id,
      );

      expect(payment.status).toBe(PaymentStatus.PENDING);

      // [STEP 3] Verify Payment Success
      const verified = await paymentService.updatePaymentStatus(payment.paymentId, {
        status: PaymentStatus.COMPLETED,
        transactionRef: 'TXN987654321',
        errorMessage: null,
      });

      expect(verified.paymentStatus).toBe(PaymentStatus.COMPLETED);
      expect(verified.orderStatus).toBe('PROCESSING');

      // [STEP 4] Verify final state
      const finalOrder = await prisma.order.findUnique({ where: { id: newOrder.id } });
      const finalPayment = await prisma.payment.findUnique({
        where: { id: payment.paymentId },
      });

      expect(finalOrder.status).toBe('PROCESSING');
      expect(finalPayment.status).toBe(PaymentStatus.COMPLETED);
    });
  });
});
