import { IsString, IsBoolean, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAddressDto {
  @ApiProperty({ description: 'Label for the address (e.g., Home, Office, Workshop)' })
  @IsString()
  @MaxLength(50)
  label!: string;

  @ApiProperty({ description: 'Address line 1' })
  @IsString()
  @MaxLength(255)
  line1!: string;

  @ApiProperty({ description: 'Address line 2', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  line2?: string;

  @ApiProperty({ description: 'City' })
  @IsString()
  @MaxLength(100)
  city!: string;

  @ApiProperty({ description: 'State/Region', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  state?: string;

  @ApiProperty({ description: 'Postal code', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  postalCode?: string;

  @ApiProperty({ description: 'Country code (ISO 3166-1 alpha-2)', default: 'TG' })
  @IsString()
  @MaxLength(2)
  country: string = 'TG';

  @ApiProperty({ description: 'Phone number', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  phoneNumber?: string;

  @ApiProperty({ description: 'Delivery instructions', required: false })
  @IsString()
  @IsOptional()
  instructions?: string;

  @ApiProperty({ description: 'Set as default address', default: false })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean = false;
}
