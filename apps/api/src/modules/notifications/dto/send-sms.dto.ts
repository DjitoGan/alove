/**
 * [1] SEND SMS DTO
 *     Validates SMS sending requests
 */

import { IsString, IsMobilePhone, IsOptional, IsEnum } from 'class-validator';

export enum SMSTemplate {
  OTP_CODE = 'otp_code', // [123456] is your OTP code
  ORDER_CONFIRMATION = 'order_confirmation', // Your order #12345 confirmed
  PAYMENT_SUCCESS = 'payment_success', // Payment received for order #12345
  ORDER_SHIPPED = 'order_shipped', // Your order #12345 shipped (tracking)
  DELIVERY_UPDATE = 'delivery_update', // Order arriving today
  REFUND_PROCESSED = 'refund_processed', // Refund of XOF 50,000 processed
}

export class SendSmsDto {
  // [2] RECIPIENT PHONE NUMBER
  //     International format: +228XXXXXXXX (Togo), +229XXXXXXXX (Benin), etc.
  @IsMobilePhone('fr-TG' || 'fr-BJ' || 'fr-NE') // West African formats
  phoneNumber: string;

  // [3] SMS TEMPLATE
  //     Which template to use
  @IsEnum(SMSTemplate)
  template: SMSTemplate;

  // [4] TEMPLATE VARIABLES
  //     Data to inject into SMS (e.g., { orderId, amount, otp })
  @IsOptional()
  variables?: Record<string, any>;

  // [5] MESSAGE (OPTIONAL, OVERRIDE TEMPLATE)
  //     Plain text SMS (overrides template if provided)
  @IsOptional()
  @IsString()
  message?: string;

  // [6] PRIORITY (OPTIONAL)
  //     Whether SMS is urgent (affects queue priority)
  @IsOptional()
  @IsEnum(['low', 'normal', 'high'])
  priority?: 'low' | 'normal' | 'high' = 'normal';
}
