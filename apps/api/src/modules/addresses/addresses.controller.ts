import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AddressesService } from './addresses.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentUserPayload } from '../auth/types/auth.types';

/**
 * Addresses Controller (US-ORD-402)
 * Manages user address book for delivery
 */
@ApiTags('addresses')
@Controller('addresses')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all user addresses' })
  async findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.addressesService.findAll(user.sub);
  }

  @Get('default')
  @ApiOperation({ summary: 'Get default address' })
  async getDefault(@CurrentUser() user: CurrentUserPayload) {
    return this.addressesService.getDefault(user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific address' })
  async findOne(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.addressesService.findOne(user.sub, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new address' })
  async create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateAddressDto) {
    return this.addressesService.create(user.sub, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an address' })
  async update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.addressesService.update(user.sub, id, dto);
  }

  @Patch(':id/default')
  @ApiOperation({ summary: 'Set address as default' })
  async setDefault(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.addressesService.setDefault(user.sub, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an address' })
  async remove(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.addressesService.remove(user.sub, id);
  }
}
