import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { SyncCartDto } from './dto/sync-cart.dto';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get or create active cart for user
   */
  async getOrCreateCart(userId: string) {
    let cart = await this.prisma.cart.findFirst({
      where: { userId, status: 'ACTIVE' },
      include: {
        items: {
          include: {
            part: {
              include: {
                images: { orderBy: { sortOrder: 'asc' }, take: 1 },
                vendor: true,
              },
            },
            vendor: true,
          },
        },
      },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: {
          userId,
          status: 'ACTIVE',
          subtotal: 0,
          total: 0,
        },
        include: {
          items: {
            include: {
              part: {
                include: {
                  images: { orderBy: { sortOrder: 'asc' }, take: 1 },
                  vendor: true,
                },
              },
              vendor: true,
            },
          },
        },
      });
    }

    return this.enrichCartWithTotals(cart);
  }

  /**
   * Add item to cart or update quantity if already exists
   */
  async addToCart(userId: string, dto: AddToCartDto) {
    const cart = await this.getOrCreateCart(userId);

    // Validate part exists and is published
    const part = await this.prisma.part.findUnique({
      where: { id: dto.partId },
      include: {
        vendor: true,
        images: { orderBy: { sortOrder: 'asc' }, take: 1 },
      },
    });

    if (!part) {
      throw new NotFoundException('Part not found');
    }

    if (part.status !== 'PUBLISHED') {
      throw new BadRequestException('Part is not available for purchase');
    }

    if (part.stock < dto.quantity) {
      throw new BadRequestException('Insufficient stock');
    }

    // Check if item already exists in cart
    const existingItem = await this.prisma.cartItem.findUnique({
      where: {
        cartId_partId: {
          cartId: cart.id,
          partId: dto.partId,
        },
      },
    });

    if (existingItem) {
      // Update quantity
      const newQuantity = existingItem.quantity + dto.quantity;
      if (part.stock < newQuantity) {
        throw new BadRequestException('Insufficient stock for requested quantity');
      }

      await this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity },
      });
    } else {
      // Create new cart item with snapshot data
      await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          partId: dto.partId,
          vendorId: part.vendorId,
          quantity: dto.quantity,
          unitPrice: part.price,
          partTitle: part.title,
          partImage: part.images[0]?.url || null,
          vendorName: part.vendor.name,
        },
      });
    }

    // Recalculate totals
    await this.recalculateCartTotals(cart.id);

    return this.getOrCreateCart(userId);
  }

  /**
   * Update cart item quantity
   */
  async updateCartItem(userId: string, itemId: string, dto: UpdateCartItemDto) {
    const cart = await this.getOrCreateCart(userId);

    const item = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
      include: { part: true },
    });

    if (!item || item.cartId !== cart.id) {
      throw new NotFoundException('Cart item not found');
    }

    if (item.part.stock < dto.quantity) {
      throw new BadRequestException('Insufficient stock');
    }

    await this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity: dto.quantity },
    });

    await this.recalculateCartTotals(cart.id);

    return this.getOrCreateCart(userId);
  }

  /**
   * Remove item from cart
   */
  async removeCartItem(userId: string, itemId: string) {
    const cart = await this.getOrCreateCart(userId);

    const item = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
    });

    if (!item || item.cartId !== cart.id) {
      throw new NotFoundException('Cart item not found');
    }

    await this.prisma.cartItem.delete({
      where: { id: itemId },
    });

    await this.recalculateCartTotals(cart.id);

    return this.getOrCreateCart(userId);
  }

  /**
   * Clear all items from cart
   */
  async clearCart(userId: string) {
    const cart = await this.getOrCreateCart(userId);

    await this.prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    await this.prisma.cart.update({
      where: { id: cart.id },
      data: { subtotal: 0, total: 0 },
    });

    return this.getOrCreateCart(userId);
  }

  /**
   * Sync offline cart with server (US-PWA-1101)
   */
  async syncCart(userId: string, dto: SyncCartDto) {
    const cart = await this.getOrCreateCart(userId);
    const conflicts = [];

    for (const offlineItem of dto.items) {
      try {
        const part = await this.prisma.part.findUnique({
          where: { id: offlineItem.partId },
          include: { vendor: true, images: { take: 1, orderBy: { sortOrder: 'asc' } } },
        });

        if (!part || part.status !== 'PUBLISHED') {
          conflicts.push({
            partId: offlineItem.partId,
            reason: 'Part no longer available',
          });
          continue;
        }

        const existingItem = await this.prisma.cartItem.findUnique({
          where: {
            cartId_partId: {
              cartId: cart.id,
              partId: offlineItem.partId,
            },
          },
        });

        const targetQuantity = existingItem
          ? Math.max(existingItem.quantity, offlineItem.quantity)
          : offlineItem.quantity;

        if (part.stock < targetQuantity) {
          conflicts.push({
            partId: offlineItem.partId,
            reason: `Insufficient stock (available: ${part.stock}, requested: ${targetQuantity})`,
          });
          continue;
        }

        if (existingItem) {
          await this.prisma.cartItem.update({
            where: { id: existingItem.id },
            data: { quantity: targetQuantity },
          });
        } else {
          await this.prisma.cartItem.create({
            data: {
              cartId: cart.id,
              partId: offlineItem.partId,
              vendorId: part.vendorId,
              quantity: targetQuantity,
              unitPrice: part.price,
              partTitle: part.title,
              partImage: part.images[0]?.url || null,
              vendorName: part.vendor.name,
            },
          });
        }
      } catch (error) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const err = error as any;
        conflicts.push({
          partId: offlineItem.partId,
          reason: err.message || 'Unknown error',
        });
      }
    }

    await this.recalculateCartTotals(cart.id);

    const updatedCart = await this.getOrCreateCart(userId);

    return {
      cart: updatedCart,
      conflicts,
    };
  }

  /**
   * Recalculate cart totals
   */
  private async recalculateCartTotals(cartId: string) {
    const items = await this.prisma.cartItem.findMany({
      where: { cartId },
      include: { part: true },
    });

    // Use current part prices for calculation
    const subtotal = items.reduce((sum, item) => sum + Number(item.part.price) * item.quantity, 0);

    await this.prisma.cart.update({
      where: { id: cartId },
      data: {
        subtotal,
        total: subtotal, // For now, total = subtotal (no taxes/shipping yet)
      },
    });
  }

  /**
   * Enrich cart with calculated totals grouped by vendor
   */
  private enrichCartWithTotals(cart: {
    id: string;
    items: Array<{
      vendorId: string;
      vendor: { id: string; name: string };
      quantity: number;
      part: { price: Prisma.Decimal | number };
    }>;
    subtotal: Prisma.Decimal | number;
    total: Prisma.Decimal | number;
  }) {
    const vendorGroups: Record<
      string,
      { vendor: { id: string; name: string }; items: typeof cart.items; subtotal: number }
    > = {};

    cart.items.forEach((item) => {
      const vendorId = item.vendorId;
      if (!vendorGroups[vendorId]) {
        vendorGroups[vendorId] = {
          vendor: item.vendor,
          items: [],
          subtotal: 0,
        };
      }

      vendorGroups[vendorId].items.push(item);
      vendorGroups[vendorId].subtotal += Number(item.part.price) * item.quantity;
    });

    return {
      ...cart,
      vendorGroups: Object.values(vendorGroups),
    };
  }
}
