import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateShipmentDto {
  @ApiProperty({ description: 'Shipment status', required: false })
  @IsString()
  @IsOptional()
  status?: string; // CREATED, SHIPPED, DELIVERED, CANCELLED

  @ApiProperty({ description: 'Carrier name', required: false })
  @IsString()
  @IsOptional()
  carrier?: string;

  @ApiProperty({ description: 'Tracking number', required: false })
  @IsString()
  @IsOptional()
  trackingNumber?: string;

  @ApiProperty({ description: 'Pickup PIN for customer verification', required: false })
  @IsString()
  @IsOptional()
  pickupPin?: string;
}
