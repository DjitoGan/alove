/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                        ORDERS CONTROLLER — Order Management Endpoints                              ║
 * ║  Handles: Create order, list user orders, get order details, cancel order                         ║
 * ║  Routes: POST /orders, GET /orders, GET /orders/:id, DELETE /orders/:id                           ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 *
 * [1] ENDPOINTS
 *     [1a] POST /v1/orders → Create new order from cart items
 *     [1b] GET /v1/orders → List current user's orders (paginated)
 *     [1c] GET /v1/orders/:id → Get order details with items
 *     [1d] DELETE /v1/orders/:id → Cancel order (if status allows)
 *
 * [2] AUTHENTICATION
 *     [2a] All endpoints require JWT access token
 *     [2b] User can only see/modify their own orders
 *     [2c] JwtAuthGuard extracts user ID from token
 *
 * [3] ORDER FLOW
 *     [3a] User adds items to cart (frontend state)
 *     [3b] POST /orders { items: [{ partId, quantity }] }
 *     [3c] Service validates stock, calculates total, creates order
 *     [3d] Returns order with status PENDING
 *     [3e] User proceeds to payment
 */

import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('orders')
@UseGuards(JwtAuthGuard) // All routes require authentication
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /**
   * [4] POST /v1/orders (CREATE ORDER)
   *     [4a] Body: { items: [{ partId, quantity }] }
   *     [4b] Returns: Order { id, status: 'PENDING', total, items, ... }
   *     [4c] Process:
   *         1. Validate stock availability for all items
   *         2. Calculate total price (sum of unitPrice * quantity)
   *         3. Create order + order items in transaction
   *         4. Reduce stock levels
   *     [4d] Errors:
   *         - Insufficient stock → BadRequestException
   *         - Invalid part ID → NotFoundException
   *     [4e] WHY transaction? Ensures atomicity: if stock update fails, order not created
   */
  @Post()
  async create(@Body() createOrderDto: CreateOrderDto, @Request() req: any) {
    const userId = req.user.sub; // Extract user ID from JWT token
    return this.ordersService.create(userId, createOrderDto);
  }

  /**
   * [5] GET /v1/orders (LIST USER ORDERS)
   *     [5a] Query params: page, pageSize (optional, defaults 1, 20)
   *     [5b] Returns: { items: Order[], page, pageSize, total, hasMore }
   *     [5c] Only shows current user's orders (filtered by userId from JWT)
   *     [5d] Sorted by creation date (newest first)
   *     [5e] WHY paginated? User could have hundreds of orders over time
   */
  @Get()
  async findAll(
    @Request() req: any,
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 20,
  ) {
    const userId = req.user.sub;
    return this.ordersService.findAll(userId, +page, +pageSize);
  }

  /**
   * [6] GET /v1/orders/:id (GET ORDER DETAILS)
   *     [6a] Param: id (UUID of order)
   *     [6b] Returns: Order { id, status, total, items: [{ part, quantity, unitPrice }], ... }
   *     [6c] Includes: Order items with part details (title, vendor, etc.)
   *     [6d] Security: Only order owner can view
   *     [6e] Errors:
   *         - Order not found → NotFoundException
   *         - User not owner → ForbiddenException
   */
  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: any) {
    const userId = req.user.sub;
    const order = await this.ordersService.findOne(id, userId);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  /**
   * [7] DELETE /v1/orders/:id (CANCEL ORDER)
   *     [7a] Param: id (UUID of order)
   *     [7b] Returns: { message: 'Order cancelled', order: { id, status: 'CANCELLED' } }
   *     [7c] Process:
   *         1. Check order status (only PENDING can be cancelled)
   *         2. Update order status to CANCELLED
   *         3. Restore stock levels for all items
   *     [7d] Security: Only order owner can cancel
   *     [7e] Errors:
   *         - Order not found → NotFoundException
   *         - User not owner → ForbiddenException
   *         - Order already shipped → BadRequestException
   *     [7f] WHY restore stock? User cancelled, items available for others
   */
  @Delete(':id')
  async cancel(@Param('id') id: string, @Request() req: any) {
    const userId = req.user.sub;
    return this.ordersService.cancel(id, userId);
  }
}
