import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class AddressesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all addresses for a user
   */
  async findAll(userId: string) {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  /**
   * Get a specific address
   */
  async findOne(userId: string, id: string) {
    const address = await this.prisma.address.findUnique({
      where: { id },
    });

    if (!address || address.userId !== userId) {
      throw new NotFoundException('Address not found');
    }

    return address;
  }

  /**
   * Create a new address
   */
  async create(userId: string, dto: CreateAddressDto) {
    // If setting as default, unset other defaults first
    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.address.create({
      data: {
        ...dto,
        userId,
      },
    });
  }

  /**
   * Update an address
   */
  async update(userId: string, id: string, dto: UpdateAddressDto) {
    await this.findOne(userId, id); // Validate address exists

    // If setting as default, unset other defaults first
    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    return this.prisma.address.update({
      where: { id },
      data: dto,
    });
  }

  /**
   * Delete an address
   */
  async remove(userId: string, id: string) {
    await this.findOne(userId, id); // Validate address exists

    await this.prisma.address.delete({
      where: { id },
    });

    return { message: 'Address deleted successfully' };
  }

  /**
   * Set an address as default
   */
  async setDefault(userId: string, id: string) {
    await this.findOne(userId, id); // Validate address exists

    // Unset other defaults
    await this.prisma.address.updateMany({
      where: { userId, isDefault: true, id: { not: id } },
      data: { isDefault: false },
    });

    // Set this one as default
    return this.prisma.address.update({
      where: { id },
      data: { isDefault: true },
    });
  }

  /**
   * Get default address for user
   */
  async getDefault(userId: string) {
    const address = await this.prisma.address.findFirst({
      where: { userId, isDefault: true },
    });

    if (!address) {
      throw new NotFoundException('No default address found');
    }

    return address;
  }
}
