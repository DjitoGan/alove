/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                        ORDERS SERVICE — Order Business Logic                                       ║
 * ║  Implements: Order creation, validation, stock management, cancellation                           ║
 * ║  Database: Transactional order creation to ensure data consistency                                ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 *
 * [1] KEY RESPONSIBILITIES
 *     [1a] Create orders: Validate stock, calculate total, create order + items
 *     [1b] List orders: Paginated list of user's orders
 *     [1c] Get order: Fetch single order with items and part details
 *     [1d] Cancel order: Update status, restore stock levels
 *
 * [2] WHY TRANSACTIONS?
 *     [2a] Order creation: Create order + items + update stock atomically
 *     [2b] Order cancellation: Update status + restore stock atomically
 *     [2c] Prevents: Partial failures, stock overselling, orphaned items
 *
 * [3] STOCK MANAGEMENT
 *     [3a] Check availability before creating order
 *     [3b] Reduce stock when order created
 *     [3c] Restore stock when order cancelled
 *     [3d] Atomic updates prevent race conditions
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notifications/notification.service';
import { EmailTemplate } from '../notifications/dto/send-email.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { CheckoutDto } from './dto/checkout.dto';
import { UpdateShipmentDto } from './dto/update-shipment.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * [4] CREATE ORDER
   *     [4a] Input: userId, CreateOrderDto { items: [{ partId, quantity }] }
   *     [4b] Output: Order { id, status: 'PENDING', total, items, createdAt }
   *     [4c] Process:
   *         1. Fetch all parts and validate stock availability
   *         2. Calculate total price
   *         3. Create order + order items in transaction
   *         4. Reduce stock levels
   *     [4d] Errors:
   *         - Insufficient stock → BadRequestException
   *         - Part not found → NotFoundException
   *     [4e] WHY transaction? Ensures atomicity: all operations succeed or all fail
   */
  async create(userId: string, createOrderDto: CreateOrderDto) {
    const { items } = createOrderDto;

    // [4.1] FETCH ALL PARTS & VALIDATE STOCK
    //       Load all parts in one query for efficiency
    const partIds = items.map((item) => item.partId);
    const parts = await this.prisma.part.findMany({
      where: { id: { in: partIds } },
      include: { vendor: true },
    });

    // [4.1a] Check all parts exist
    if (parts.length !== items.length) {
      throw new NotFoundException('One or more parts not found');
    }

    // [4.1b] Build map for quick lookup: partId → part
    const partsMap = new Map(parts.map((p) => [p.id, p]));

    // [4.1c] Validate stock for each item
    for (const item of items) {
      const part = partsMap.get(item.partId);
      if (!part) {
        throw new NotFoundException(`Part ${item.partId} not found`);
      }
      if (part.stock < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for "${part.title}". Available: ${part.stock}, Requested: ${item.quantity}`,
        );
      }
    }

    // [4.2] CALCULATE TOTAL PRICE
    //       Sum of (unitPrice * quantity) for all items
    let total = new Prisma.Decimal(0);
    for (const item of items) {
      const part = partsMap.get(item.partId)!;
      const itemTotal = part.price.mul(item.quantity);
      total = total.add(itemTotal);
    }

    // [4.3] CREATE ORDER + ITEMS IN TRANSACTION
    //       Transaction ensures atomicity: if any step fails, all rollback
    const order = await this.prisma.$transaction(async (tx) => {
      // [4.3a] Create order
      const newOrder = await tx.order.create({
        data: {
          userId,
          status: 'PENDING',
          total,
        },
      });

      // [4.3b] Create order items
      const orderItemsData = items.map((item) => {
        const part = partsMap.get(item.partId)!;
        return {
          orderId: newOrder.id,
          partId: item.partId,
          vendorId: part.vendorId,
          quantity: item.quantity,
          unitPrice: part.price,
        };
      });

      await tx.orderItem.createMany({
        data: orderItemsData,
      });

      // [4.3c] Reduce stock levels
      for (const item of items) {
        await tx.part.update({
          where: { id: item.partId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      // [4.3d] Return order with items
      return tx.order.findUnique({
        where: { id: newOrder.id },
        include: {
          items: {
            include: {
              part: true,
              vendor: true,
            },
          },
        },
      });
    });

    // [4.4] LOG ORDER CREATION
    this.logger.log(`Order ${order!.id} created for user ${userId}. Total: ${total}`);

    // [4.5] SEND ORDER CONFIRMATION EMAIL (ASYNC)
    //       Fire-and-forget: Don't await, send in background
    //       EmailTemplate: ORDER_CONFIRMATION
    //       Variables: { orderId, totalAmount, itemCount, estimatedDelivery }
    this.notificationService
      .sendEmail(
        {
          to: 'customer@example.com', // TODO: Get from user object
          template: EmailTemplate.ORDER_CONFIRMATION,
          variables: {
            orderId: order!.id,
            totalAmount: total.toString(),
            itemCount: items.length,
            estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +7 days
          },
        },
        userId,
      )
      .catch((error) => {
        this.logger.error(
          `Failed to send order confirmation for order ${order!.id}: ${error.message}`,
        );
      });

    return order;
  }

  /**
   * [5] LIST USER ORDERS (PAGINATED)
   *     [5a] Input: userId, page, pageSize
   *     [5b] Output: { items: Order[], page, pageSize, total, hasMore }
   *     [5c] Sorted by creation date (newest first)
   *     [5d] Includes order items for quick display
   */
  async findAll(userId: string, page: number = 1, pageSize: number = 20) {
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: {
          items: {
            include: {
              part: true,
            },
          },
        },
      }),
      this.prisma.order.count({ where: { userId } }),
    ]);

    return {
      items,
      page,
      pageSize,
      total,
      hasMore: skip + items.length < total,
    };
  }

  /**
   * [6] GET ORDER BY ID
   *     [6a] Input: orderId, userId
   *     [6b] Output: Order { id, status, total, items: [{ part, vendor }] }
   *     [6c] Security: Only order owner can view
   *     [6d] Includes: Items with part and vendor details
   */
  async findOne(orderId: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            part: true,
            vendor: true,
          },
        },
      },
    });

    // [6.1] Check order exists
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // [6.2] Check user owns order
    if (order.userId !== userId) {
      throw new ForbiddenException('You do not have access to this order');
    }

    return order;
  }

  /**
   * [7] CANCEL ORDER
   *     [7a] Input: orderId, userId
   *     [7b] Output: { message, order }
   *     [7c] Process:
   *         1. Validate user owns order
   *         2. Check order status (only PENDING can be cancelled)
   *         3. Update status to CANCELLED
   *         4. Restore stock levels
   *     [7d] Errors:
   *         - Order not found → NotFoundException
   *         - User not owner → ForbiddenException
   *         - Order already shipped → BadRequestException
   */
  async cancel(orderId: string, userId: string) {
    // [7.1] FETCH ORDER WITH ITEMS
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
      },
    });

    // [7.1a] Check order exists
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // [7.1b] Check user owns order
    if (order.userId !== userId) {
      throw new ForbiddenException('You do not have access to this order');
    }

    // [7.1c] Check order can be cancelled
    if (order.status !== 'PENDING') {
      throw new BadRequestException(
        `Cannot cancel order with status: ${order.status}. Only PENDING orders can be cancelled.`,
      );
    }

    // [7.2] UPDATE STATUS + RESTORE STOCK IN TRANSACTION
    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      // [7.2a] Update order status
      const updated = await tx.order.update({
        where: { id: orderId },
        data: { status: 'CANCELLED' },
      });

      // [7.2b] Restore stock for all items
      for (const item of order.items) {
        await tx.part.update({
          where: { id: item.partId },
          data: { stock: { increment: item.quantity } },
        });
      }

      return updated;
    });

    // [7.3] LOG CANCELLATION
    this.logger.log(`Order ${orderId} cancelled by user ${userId}`);

    return {
      message: 'Order cancelled successfully',
      order: updatedOrder,
    };
  }

  /**
   * [8] CHECKOUT FROM CART (US-ORD-402)
   *     [8a] Input: userId, CheckoutDto { vendorShipping: [{ vendorId, addressId, notes }] }
   *     [8b] Output: Order { id, status, total, items, shipments }
   *     [8c] Process:
   *         1. Get user's active cart
   *         2. Validate cart has items
   *         3. Validate addresses exist
   *         4. Create order from cart items
   *         5. Create shipment per vendor
   *         6. Mark cart as checked out
   *     [8d] Multi-vendor: Each vendor gets a separate shipment
   */
  async checkoutFromCart(userId: string, checkoutDto: CheckoutDto) {
    // [8.1] GET ACTIVE CART
    const cart = await this.prisma.cart.findFirst({
      where: { userId, status: 'ACTIVE' },
      include: {
        items: {
          include: {
            part: {
              include: { vendor: true },
            },
            vendor: true,
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    // [8.2] VALIDATE ADDRESSES
    const addressIds = checkoutDto.vendorShipping.map((vs) => vs.addressId);
    const addresses = await this.prisma.address.findMany({
      where: { id: { in: addressIds }, userId },
    });

    if (addresses.length !== new Set(addressIds).size) {
      throw new BadRequestException('One or more addresses not found');
    }

    // [8.3] VALIDATE STOCK AVAILABILITY
    for (const item of cart.items) {
      if (item.part.status !== 'PUBLISHED') {
        throw new BadRequestException(`Part "${item.partTitle}" is no longer available`);
      }
      if (item.part.stock < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for "${item.partTitle}". Available: ${item.part.stock}, Requested: ${item.quantity}`,
        );
      }
    }

    // [8.4] CREATE ORDER + ITEMS + SHIPMENTS IN TRANSACTION
    const order = await this.prisma.$transaction(async (tx) => {
      // [8.4a] Create order
      const newOrder = await tx.order.create({
        data: {
          userId,
          status: 'PENDING',
          total: cart.total,
        },
      });

      // [8.4b] Create order items from cart
      const orderItemsData = cart.items.map((item) => ({
        orderId: newOrder.id,
        partId: item.partId,
        vendorId: item.vendorId,
        quantity: item.quantity,
        unitPrice: item.part.price, // Use current price
      }));

      await tx.orderItem.createMany({
        data: orderItemsData,
      });

      // [8.4c] Reduce stock levels
      for (const item of cart.items) {
        await tx.part.update({
          where: { id: item.partId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      // [8.4d] Create shipments per vendor
      const vendorShippingMap = new Map(checkoutDto.vendorShipping.map((vs) => [vs.vendorId, vs]));

      const vendorIds = [...new Set(cart.items.map((item) => item.vendorId))];

      for (const vendorId of vendorIds) {
        const shipping = vendorShippingMap.get(vendorId);
        if (!shipping) {
          throw new BadRequestException(`Missing shipping info for vendor ${vendorId}`);
        }

        await tx.shipment.create({
          data: {
            orderId: newOrder.id,
            vendorId,
            status: 'CREATED',
          },
        });
      }

      // [8.4e] Mark cart as checked out
      await tx.cart.update({
        where: { id: cart.id },
        data: { status: 'CHECKED_OUT' },
      });

      // [8.4f] Return order with full details
      return tx.order.findUnique({
        where: { id: newOrder.id },
        include: {
          items: {
            include: {
              part: true,
              vendor: true,
            },
          },
          shipments: {
            include: {
              vendor: true,
            },
          },
        },
      });
    });

    this.logger.log(`Order ${order!.id} created from cart for user ${userId}`);

    // Send confirmation email (async)
    this.notificationService
      .sendEmail(
        {
          to: 'customer@example.com', // TODO: Get from user
          template: EmailTemplate.ORDER_CONFIRMATION,
          variables: {
            orderId: order!.id,
            totalAmount: order!.total.toString(),
            itemCount: order!.items.length,
            estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        },
        userId,
      )
      .catch((error) => {
        this.logger.error(`Failed to send order confirmation: ${error.message}`);
      });

    return order;
  }

  /**
   * [9] UPDATE SHIPMENT (US-ORD-404)
   *     [9a] Input: shipmentId, UpdateShipmentDto { status?, carrier?, trackingNumber?, pickupPin? }
   *     [9b] Output: Updated shipment
   *     [9c] Process:
   *         1. Validate shipment exists
   *         2. Update fields
   *         3. Set timestamp for status transitions
   */
  async updateShipment(shipmentId: string, dto: UpdateShipmentDto) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
    });

    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }

    const updateData: any = { ...dto };

    // Set timestamps based on status
    if (dto.status === 'SHIPPED' && !shipment.shippedAt) {
      updateData.shippedAt = new Date();
    }
    if (dto.status === 'DELIVERED' && !shipment.deliveredAt) {
      updateData.deliveredAt = new Date();
    }

    const updated = await this.prisma.shipment.update({
      where: { id: shipmentId },
      data: updateData,
      include: {
        order: true,
        vendor: true,
      },
    });

    this.logger.log(`Shipment ${shipmentId} updated: ${JSON.stringify(dto)}`);

    return updated;
  }

  /**
   * [10] GET SHIPMENT
   *     [10a] Input: shipmentId
   *     [10b] Output: Shipment with order and vendor details
   */
  async findShipment(shipmentId: string) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: {
        order: {
          include: {
            items: {
              include: {
                part: true,
              },
            },
          },
        },
        vendor: true,
      },
    });

    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }

    return shipment;
  }
}
