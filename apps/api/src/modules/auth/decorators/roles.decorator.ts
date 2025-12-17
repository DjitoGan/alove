import { SetMetadata } from '@nestjs/common';

/**
 * Roles Decorator
 * Sets metadata on route handler to specify required roles for access
 *
 * Usage:
 * @Roles('CUSTOMER', 'ADMIN')
 * async createOrder(@CurrentUser() user) { ... }
 */
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
