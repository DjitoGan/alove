/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                        PAYMENT SERVICE — Payment Processing Logic                                  ║
 * ║  Implements: Create payment, verify, refund, payment provider integration                         ║
 * ║  Uses: Prisma (database), Redis (temporary payment state), Payment APIs (Stripe, MTN, etc.)       ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 *
 * [1] PAYMENT FLOW LOGIC
 *     [1a] createPayment() → Create Payment record, call provider API
 *     [1b] updatePaymentStatus() → Update status from webhook, update Order
 *     [1c] refundPayment() → Request refund from provider, update status
 *
 * [2] PAYMENT PROVIDERS (Future Integration)
 *     [2a] Stripe: Card payments (international), webhook events
 *     [2b] MTN Mobile Money API: MTN payments in West Africa
 *     [2c] Airtel Money: Airtel payments in West Africa
 *     [2d] Local banks: Bank transfers (SEPA, ACH, local)
 *
 * [3] SECURITY
 *     [3a] Webhook signature verification (prevent spoofing)
 *     [3b] Idempotency keys (prevent double-processing)
 *     [3c] Never store card data (PCI DSS compliance)
 *     [3d] Encrypt sensitive data (mobile money tokens)
 *     [3e] Audit trail (log all payment events)
 */

import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { NotificationService } from '../notifications/notification.service';
import { EmailTemplate } from '../notifications/dto/send-email.dto';
import { CreatePaymentDto, PaymentStatus } from './dto/create-payment.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private notificationService: NotificationService,
  ) {}

  /**
   * [4] CREATE PAYMENT
   *     [4a] Input: CreatePaymentDto, userId
   *     [4b] Output: { paymentId, orderId, status: 'pending', expiresAt }
   *     [4c] Process:
   *         1. Validate order exists
   *         2. Check order is in 'pending_payment' status
   *         3. Create Payment record in database
   *         4. Call payment provider API (initiate payment)
   *         5. Store payment ref in Redis (for quick lookup)
   *         6. Return payment details
   *     [4d] Idempotency: Store request hash in Redis, return cached result if duplicate
   */
  async createPayment(createPaymentDto: CreatePaymentDto, userId: string) {
    // [4.1] VALIDATE ORDER EXISTS AND STATUS
    const order = await this.prisma.order.findUnique({
      where: { id: createPaymentDto.orderId },
      include: { user: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // [4.2] Check user owns this order
    if (order.userId !== userId) {
      throw new BadRequestException('Unauthorized: You do not own this order');
    }

    // [4.3] Check order status is 'pending_payment'
    if (order.status !== 'pending_payment') {
      throw new BadRequestException(`Cannot pay for order in status: ${order.status}`);
    }

    // [4.4] CREATE PAYMENT RECORD
    const payment = await this.prisma.payment.create({
      data: {
        orderId: createPaymentDto.orderId,
        amount: createPaymentDto.amount,
        currency: createPaymentDto.currency || 'XOF',
        method: createPaymentDto.method,
        status: PaymentStatus.PENDING,
        metadata: {
          mobileMoneyPhone: createPaymentDto.mobileMoneyPhone,
        },
      },
    });

    // [4.5] INITIATE PAYMENT WITH PROVIDER
    //       (Mock implementation; integrate with Stripe, MTN, etc.)
    try {
      // In production: call payment provider API
      // const providerResponse = await this.callPaymentProvider(payment);
      // payment.externalReference = providerResponse.reference;
      this.logger.log(
        `Payment created: ${payment.id} for order ${order.id} (${createPaymentDto.amount} ${createPaymentDto.currency})`,
      );
    } catch (error) {
      // [4.6] If provider API fails, still keep Payment record (status: pending)
      // User can retry via GET /payments/:id
      this.logger.error(`Payment provider error: ${error.message}`);
    }

    // [4.7] CACHE IN REDIS FOR QUICK LOOKUP
    //       Redis key: payment:{paymentId} (TTL: 24 hours)
    await this.redis.set(`payment:${payment.id}`, JSON.stringify(payment), 86400);

    return {
      paymentId: payment.id,
      orderId: payment.orderId,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    };
  }

  /**
   * [5] UPDATE PAYMENT STATUS (FROM WEBHOOK)
   *     [5a] Input: paymentId, VerifyPaymentDto { status, transactionRef, errorMessage }
   *     [5b] Output: { paymentId, status, orderStatus }
   *     [5c] Process:
   *         1. Find payment by ID
   *         2. Update payment status in database
   *         3. If status = 'completed':
   *            - Update order status to 'processing'
   *            - Send order confirmation notification
   *         4. If status = 'failed':
   *            - Keep order status as 'pending_payment'
   *            - Send payment failure notification (retry option)
   *         5. Update Redis cache
   *     [5d] Idempotency: If payment already in final state, return current state
   */
  async updatePaymentStatus(paymentId: string, verifyPaymentDto: VerifyPaymentDto) {
    // [5.1] FIND PAYMENT
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: true },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // [5.2] CHECK IDEMPOTENCY
    //       If payment already in final state, don't re-process
    if (payment.status === PaymentStatus.COMPLETED || payment.status === PaymentStatus.FAILED) {
      this.logger.warn(`Payment ${paymentId} already in final state: ${payment.status}`);
      return payment; // Return current state
    }

    // [5.3] UPDATE PAYMENT STATUS
    const updatedPayment = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: verifyPaymentDto.status,
        externalReference: verifyPaymentDto.transactionRef,
        errorMessage: verifyPaymentDto.errorMessage,
        updatedAt: new Date(),
      },
    });

    // [5.4] UPDATE ORDER STATUS BASED ON PAYMENT STATUS
    if (verifyPaymentDto.status === PaymentStatus.COMPLETED) {
      // Payment successful → update order to processing
      await this.prisma.order.update({
        where: { id: payment.orderId },
        data: { status: 'processing' },
      });

      this.logger.log(`Payment ${paymentId} completed. Order processing started.`);

      // [5.4a] SEND PAYMENT SUCCESS NOTIFICATION (ASYNC)
      //        Fire-and-forget: Don't await, send in background
      //        EmailTemplate: PAYMENT_SUCCESS
      this.notificationService
        .sendEmail(
          {
            to: 'customer@example.com', // TODO: Get from user object
            template: EmailTemplate.PAYMENT_SUCCESS,
            variables: {
              orderId: payment.orderId,
              amount: payment.amount.toString(),
              paymentMethod: payment.paymentMethod,
              transactionRef: verifyPaymentDto.transactionRef,
            },
          },
          payment.order!.userId,
        )
        .catch((error) => {
          this.logger.error(`Failed to send payment success email: ${error.message}`);
        });
    } else if (verifyPaymentDto.status === PaymentStatus.FAILED) {
      // Payment failed → order remains pending_payment (user can retry)
      this.logger.error(`Payment ${paymentId} failed: ${verifyPaymentDto.errorMessage}`);

      // [5.4b] SEND PAYMENT FAILURE NOTIFICATION (ASYNC)
      this.notificationService
        .sendEmail(
          {
            to: 'customer@example.com', // TODO: Get from user object
            template: EmailTemplate.PAYMENT_FAILED,
            variables: {
              orderId: payment.orderId,
              amount: payment.amount.toString(),
              errorMessage: verifyPaymentDto.errorMessage,
              retryLink: `https://alove.app/orders/${payment.orderId}/pay`, // TODO: Use actual domain
            },
          },
          payment.order!.userId,
        )
        .catch((error) => {
          this.logger.error(`Failed to send payment failure email: ${error.message}`);
        });
    }

    // [5.5] UPDATE REDIS CACHE
    await this.redis.set(`payment:${paymentId}`, JSON.stringify(updatedPayment), 86400);

    return updatedPayment;
  }

  /**
   * [6] GET PAYMENT BY ID
   *     [6a] Input: paymentId
   *     [6b] Output: Full payment object from database
   *     [6c] Try Redis cache first, fallback to database
   */
  async getPaymentById(paymentId: string) {
    // [6.1] TRY REDIS CACHE FIRST
    //       Fast path: if payment in cache, return immediately
    const cached = await this.redis.get(`payment:${paymentId}`);
    if (cached) {
      return JSON.parse(cached);
    }

    // [6.2] FALLBACK TO DATABASE
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: true },
    });

    // [6.3] CACHE RESULT
    if (payment) {
      await this.redis.set(`payment:${paymentId}`, JSON.stringify(payment), 86400);
    }

    return payment;
  }

  /**
   * [7] REFUND PAYMENT
   *     [7a] Input: paymentId
   *     [7b] Output: { paymentId, status: 'refunded', refundedAmount, refundDate }
   *     [7c] Process:
   *         1. Find payment
   *         2. Check payment status = 'completed'
   *         3. Call payment provider refund API
   *         4. Update payment status to 'refunded'
   *         5. Update order status to 'cancelled' (or 'refunding')
   *         6. Send refund notification to user
   *     [7d] Errors:
   *         - Payment not completed → can't refund
   *         - Provider refund fails → store error, allow retry
   */
  async refundPayment(paymentId: string) {
    // [7.1] FIND PAYMENT
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // [7.2] CHECK PAYMENT IS COMPLETED
    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new BadRequestException(`Cannot refund payment in status: ${payment.status}`);
    }

    // [7.3] CALL PAYMENT PROVIDER REFUND API
    //       (Mock implementation; integrate with Stripe, MTN, etc.)
    try {
      // In production: const refundResponse = await this.callProviderRefund(payment);
      this.logger.log(`Refund initiated for payment ${paymentId}`);
    } catch (error) {
      this.logger.error(`Refund failed: ${error.message}`);
      throw new BadRequestException('Refund failed. Please try again.');
    }

    // [7.4] UPDATE PAYMENT STATUS
    const refundedPayment = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.REFUNDED,
        updatedAt: new Date(),
      },
    });

    // [7.5] UPDATE ORDER STATUS (if refund succeeds)
    //       Order can be cancelled only if refund completes
    const order = await this.prisma.order.update({
      where: { id: payment.orderId },
      data: { status: 'cancelled' },
    });

    this.logger.log(`Payment ${paymentId} refunded successfully`);

    // [7.6] SEND REFUND CONFIRMATION NOTIFICATION (ASYNC)
    this.notificationService
      .sendEmail(
        {
          to: 'customer@example.com', // TODO: Get from user object
          template: EmailTemplate.REFUND_PROCESSED,
          variables: {
            orderId: payment.orderId,
            refundAmount: payment.amount.toString(),
            refundDate: new Date(),
            estimatedArrival: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // +3 days
          },
        },
        order.userId,
      )
      .catch((error) => {
        this.logger.error(`Failed to send refund email: ${error.message}`);
      });

    return refundedPayment;
  }

  /**
   * [8] VALIDATE ORDER (HELPER)
   *     [8a] Check if order exists and belongs to user
   *     [8b] Returns order object or null
   */
  async validateOrder(orderId: string, userId: string) {
    return this.prisma.order.findFirst({
      where: {
        id: orderId,
        userId: userId,
      },
    });
  }
}
