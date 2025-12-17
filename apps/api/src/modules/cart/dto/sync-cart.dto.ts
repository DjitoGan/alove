import { IsArray, ValidateNested, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class OfflineCartItemDto {
  @ApiProperty()
  @IsString()
  partId!: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class SyncCartDto {
  @ApiProperty({ type: [OfflineCartItemDto], description: 'Offline cart items to merge' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OfflineCartItemDto)
  items!: OfflineCartItemDto[];
}
