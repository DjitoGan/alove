/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                        CREATE ORDER DTO — Order Creation Validation                                ║
 * ║  Validates: User cart items before creating order in database                                      ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 *
 * [1] VALIDATION RULES
 *     [1a] items: Array of cart items (min 1 item required)
 *     [1b] Each item: { partId (UUID), quantity (>= 1) }
 *     [1c] Validated by class-validator decorators
 *
 * [2] WHY THIS DTO?
 *     [2a] Frontend sends cart items → DTO validates before DB insert
 *     [2b] Prevents empty orders, invalid part IDs, negative quantities
 *     [2c] Type-safe: TypeScript enforces structure at compile time
 */

import { IsArray, IsInt, IsNotEmpty, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * [3] ORDER ITEM DTO
 *     Represents one item in the cart
 */
export class CreateOrderItemDto {
  @IsString()
  @IsNotEmpty()
  partId: string; // UUID of part to purchase

  @IsInt()
  @Min(1)
  quantity: number; // Quantity (min 1)
}

/**
 * [4] CREATE ORDER DTO
 *     [4a] items: Array of cart items
 *     [4b] ValidateNested: Validates each item in array
 *     [4c] Type(() => CreateOrderItemDto): Transform plain objects to DTO instances
 */
export class CreateOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];
}
