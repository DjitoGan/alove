/**
 * [1] CREATE PAYMENT DTO
 *     Validates input for creating a new payment
 */

import { IsString, IsNumber, IsEnum, IsOptional, Min, Max } from 'class-validator';

export enum PaymentMethod {
  MOBILE_MONEY = 'mobile_money', // MTN, Airtel (West Africa)
  CARD = 'card', // Visa, Mastercard
  BANK_TRANSFER = 'bank_transfer',
  CASH_ON_PICKUP = 'cash_on_pickup',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export class CreatePaymentDto {
  // [2] ORDER ID
  //     Which order is this payment for?
  @IsString()
  orderId!: string;

  // [3] AMOUNT
  //     Payment amount in currency (XOF for West Africa)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  // [4] PAYMENT METHOD
  //     How is the user paying? (mobile money, card, etc.)
  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  // [5] MOBILE MONEY PHONE (OPTIONAL)
  //     Phone number for mobile money (required if method = mobile_money)
  @IsOptional()
  @IsString()
  mobileMoneyPhone?: string;

  // [6] CURRENCY (OPTIONAL)
  //     Default: XOF (West African CFA franc)
  @IsOptional()
  @IsString()
  currency?: string = 'XOF';
}
