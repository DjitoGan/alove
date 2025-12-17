import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { SyncCartDto } from './dto/sync-cart.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentUserPayload } from '../auth/types/auth.types';

/**
 * Cart Controller (US-ORD-401, US-PWA-1101)
 * Manages shopping cart operations with offline sync support
 */
@ApiTags('cart')
@Controller('cart')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user cart' })
  async getCart(@CurrentUser() user: CurrentUserPayload) {
    return this.cartService.getOrCreateCart(user.sub);
  }

  @Post('items')
  @ApiOperation({ summary: 'Add item to cart' })
  async addToCart(@CurrentUser() user: CurrentUserPayload, @Body() dto: AddToCartDto) {
    return this.cartService.addToCart(user.sub, dto);
  }

  @Patch('items/:itemId')
  @ApiOperation({ summary: 'Update cart item quantity' })
  async updateCartItem(
    @CurrentUser() user: CurrentUserPayload,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateCartItem(user.sub, itemId, dto);
  }

  @Delete('items/:itemId')
  @ApiOperation({ summary: 'Remove item from cart' })
  async removeCartItem(@CurrentUser() user: CurrentUserPayload, @Param('itemId') itemId: string) {
    return this.cartService.removeCartItem(user.sub, itemId);
  }

  @Delete()
  @ApiOperation({ summary: 'Clear cart' })
  async clearCart(@CurrentUser() user: CurrentUserPayload) {
    return this.cartService.clearCart(user.sub);
  }

  @Post('sync')
  @ApiOperation({
    summary: 'Sync offline cart with server (PWA)',
    description: 'Merge offline cart items with server cart, resolving conflicts',
  })
  async syncCart(@CurrentUser() user: CurrentUserPayload, @Body() dto: SyncCartDto) {
    return this.cartService.syncCart(user.sub, dto);
  }
}
