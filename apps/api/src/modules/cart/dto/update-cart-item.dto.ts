import { IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCartItemDto {
  @ApiProperty({ description: 'New quantity for the cart item', minimum: 1 })
  @IsInt()
  @Min(1)
  quantity!: number;
}
