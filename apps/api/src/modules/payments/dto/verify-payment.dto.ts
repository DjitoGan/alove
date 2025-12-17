/**
 * [1] VERIFY PAYMENT DTO
 *     Validates payment verification requests (webhook or manual confirmation)
 */

import { IsString, IsEnum, IsOptional } from 'class-validator';
import { PaymentStatus } from './create-payment.dto';

export class VerifyPaymentDto {
  // [2] PAYMENT ID
  //     Which payment to verify?
  @IsString()
  paymentId: string;

  // [3] TRANSACTION REFERENCE
  //     From payment provider (MTN, Stripe, etc.)
  @IsOptional()
  @IsString()
  transactionRef?: string;

  // [4] STATUS
  //     What's the new status? (completed, failed, pending, etc.)
  @IsEnum(PaymentStatus)
  status: PaymentStatus;

  // [5] ERROR MESSAGE (OPTIONAL)
  //     If failed, what went wrong?
  @IsOptional()
  @IsString()
  errorMessage?: string;
}
