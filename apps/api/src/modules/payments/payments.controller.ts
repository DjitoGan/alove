/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                        PAYMENT CONTROLLER — Payment Processing Endpoints                           ║
 * ║  Handles: Create payment, verify payment, get payment status, process refunds                     ║
 * ║  Routes: POST /v1/payments, POST /v1/payments/:id/verify, GET /v1/payments/:id                   ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 *
 * [1] PAYMENT FLOW
 *     [1a] User places order with items → OrderModule creates Order
 *     [1b] User initiates payment → POST /payments (creates Payment record)
 *     [1c] Payment provider processes → User completes payment (mobile money, card, etc.)
 *     [1d] Provider sends webhook → POST /payments/:id/verify (updates Payment status)
 *     [1e] PaymentService updates Order status → Order fulfilled
 *
 * [2] PAYMENT METHODS (West Africa Focus)
 *     [2a] Mobile Money: MTN, Airtel (most popular in Togo, Benin, Niger)
 *     [2b] Card: Visa, Mastercard (secondary option)
 *     [2c] Bank Transfer: For B2B or large orders
 *     [2d] Cash on Pickup: Local pickup with cash payment
 *
 * [3] ENDPOINTS
 *     [3a] POST /v1/payments { orderId, amount, method, ... }
 *          → { paymentId, status: 'pending', expiresAt }
 *     [3b] POST /v1/payments/:id/verify { status, transactionRef }
 *          → { paymentId, status: 'completed'|'failed', orderStatus }
 *     [3c] GET /v1/payments/:id (requires auth)
 *          → { paymentId, orderId, amount, status, createdAt, ... }
 */

import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PaymentService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';

@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  /**
   * [4] POST /v1/payments
   *     [4a] Create new payment for order
   *     [4b] Body: { orderId, amount, method, mobileMoneyPhone?, currency? }
   *     [4c] Returns: { paymentId, orderId, status: 'pending', expiresAt }
   *     [4d] Requires: Authentication (user must own the order)
   *     [4e] Process:
   *         1. Validate order exists and belongs to user
   *         2. Create Payment record in database
   *         3. Initiate payment with provider (if applicable)
   *         4. Return payment details
   *     [4f] Errors:
   *         - Order not found → 404
   *         - Invalid amount → 400
   *         - Unauthorized (not order owner) → 401
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createPayment(
    @Body() createPaymentDto: CreatePaymentDto,
    @Request() req: any,
  ) {
    // [4.1] Validate order exists and user owns it
    const order = await this.paymentService.validateOrder(
      createPaymentDto.orderId,
      req.user.sub,
    );

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // [4.2] Validate amount matches order total
    if (createPaymentDto.amount !== order.totalPrice) {
      throw new BadRequestException('Payment amount does not match order total');
    }

    // [4.3] Create payment record
    const payment = await this.paymentService.createPayment(
      createPaymentDto,
      req.user.sub,
    );

    return payment;
  }

  /**
   * [5] POST /v1/payments/:id/verify
   *     [5a] Verify payment (called by webhook from payment provider)
   *     [5b] Body: { status: 'completed'|'failed', transactionRef?, errorMessage? }
   *     [5c] Returns: { paymentId, status, orderStatus }
   *     [5d] Process:
   *         1. Find payment by ID
   *         2. Update payment status
   *         3. If completed: update order status to "processing"
   *         4. If failed: keep order status as "pending_payment"
   *         5. Trigger notification (email/SMS to user)
   *     [5e] Note: This endpoint is typically called by payment provider
   *          In production, verify webhook signature (prevent spoofing)
   */
  @Post(':id/verify')
  @HttpCode(HttpStatus.OK)
  async verifyPayment(
    @Param('id') paymentId: string,
    @Body() verifyPaymentDto: VerifyPaymentDto,
  ) {
    // [5.1] Find payment
    const payment = await this.paymentService.getPaymentById(paymentId);

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // [5.2] Update payment status
    const updatedPayment = await this.paymentService.updatePaymentStatus(
      paymentId,
      verifyPaymentDto,
    );

    return updatedPayment;
  }

  /**
   * [6] GET /v1/payments/:id
   *     [6a] Fetch payment details
   *     [6b] Requires: Authentication
   *     [6c] Returns: { paymentId, orderId, amount, status, method, createdAt, updatedAt }
   *     [6d] Process: User can only see own payments (via order ownership)
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getPayment(@Param('id') paymentId: string, @Request() req: any) {
    const payment = await this.paymentService.getPaymentById(paymentId);

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // [6.1] Verify user owns this payment (via order)
    const order = await this.paymentService.validateOrder(
      payment.orderId,
      req.user.sub,
    );

    if (!order) {
      throw new NotFoundException('Unauthorized');
    }

    return payment;
  }

  /**
   * [7] POST /v1/payments/:id/refund
   *     [7a] Request refund for completed payment
   *     [7b] Requires: Authentication (order owner)
   *     [7c] Returns: { paymentId, status: 'refunded', refundedAmount }
   *     [7d] Process:
   *         1. Verify payment is completed
   *         2. Call payment provider refund API
   *         3. Update payment status to 'refunded'
   *         4. Update order status (if allowed)
   *         5. Send notification to user
   */
  @Post(':id/refund')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async refundPayment(@Param('id') paymentId: string, @Request() req: any) {
    // [7.1] Find payment
    const payment = await this.paymentService.getPaymentById(paymentId);

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // [7.2] Verify user owns this payment
    const order = await this.paymentService.validateOrder(
      payment.orderId,
      req.user.sub,
    );

    if (!order) {
      throw new NotFoundException('Unauthorized');
    }

    // [7.3] Process refund
    const refund = await this.paymentService.refundPayment(paymentId);

    return refund;
  }
}
