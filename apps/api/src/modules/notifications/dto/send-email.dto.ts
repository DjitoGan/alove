/**
 * [1] SEND EMAIL DTO
 *     Validates email sending requests
 */

import { IsString, IsEmail, IsArray, IsOptional, IsObject } from 'class-validator';

export enum EmailTemplate {
  ORDER_CONFIRMATION = 'order_confirmation',
  PAYMENT_SUCCESS = 'payment_success',
  PAYMENT_FAILED = 'payment_failed',
  ORDER_SHIPPED = 'order_shipped',
  ORDER_DELIVERED = 'order_delivered',
  REFUND_PROCESSED = 'refund_processed',
  WELCOME = 'welcome',
  PASSWORD_RESET = 'password_reset',
}

export class SendEmailDto {
  // [2] RECIPIENT EMAIL
  @IsEmail()
  to: string;

  // [3] EMAIL TEMPLATE
  //     Which template to use for rendering
  @IsString()
  template: EmailTemplate;

  // [4] TEMPLATE VARIABLES
  //     Data to inject into template (e.g., { orderId, userName, amount })
  @IsOptional()
  @IsObject()
  variables?: Record<string, any>;

  // [5] CC ADDRESSES (OPTIONAL)
  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  cc?: string[];

  // [6] BCC ADDRESSES (OPTIONAL)
  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  bcc?: string[];

  // [7] SUBJECT (OPTIONAL, OVERRIDE TEMPLATE)
  @IsOptional()
  @IsString()
  subject?: string;
}
