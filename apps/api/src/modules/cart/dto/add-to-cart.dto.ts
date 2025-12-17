import { IsString, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddToCartDto {
  @ApiProperty({ description: 'Part ID to add to cart' })
  @IsString()
  partId!: string;

  @ApiProperty({ description: 'Quantity to add', minimum: 1, default: 1 })
  @IsInt()
  @Min(1)
  quantity: number = 1;
}
