import { IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class VendorShippingDto {
  @ApiProperty({ description: 'Vendor ID' })
  @IsString()
  vendorId: string;

  @ApiProperty({ description: 'Selected address ID for this vendor' })
  @IsString()
  addressId: string;

  @ApiProperty({ description: 'Delivery notes for this vendor', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class CheckoutDto {
  @ApiProperty({
    type: [VendorShippingDto],
    description: 'Per-vendor shipping configuration',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VendorShippingDto)
  vendorShipping: VendorShippingDto[];
}
