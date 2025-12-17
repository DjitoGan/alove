/**
 * [1] NOTIFICATIONS CONTROLLER
 *     Handles email and SMS notification requests
 *     Endpoints: POST /notifications/email, POST /notifications/sms
 *     Uses: NotificationService for message delivery
 */

import { Controller, Post, Body, UseGuards, HttpCode } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SendEmailDto } from './dto/send-email.dto';
import { SendSmsDto } from './dto/send-sms.dto';

@Controller('notifications')
@ApiTags('notifications')
export class NotificationController {
  // [2] INJECT NOTIFICATION SERVICE
  constructor(private readonly notificationService: NotificationService) {}

  /**
   * [3] SEND EMAIL ENDPOINT
   *     POST /notifications/email
   *     Body: SendEmailDto
   *     Response: { success: true, messageId: 'email_12345' }
   *     Use cases:
   *       - Send order confirmation (user submits order)
   *       - Send payment receipt (payment succeeds)
   *       - Send password reset link (user requests reset)
   *       - Send welcome email (new user registers)
   */
  @Post('email')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(200) // Return 200 (not 201) as notification is async
  async sendEmail(@Body() sendEmailDto: SendEmailDto, @CurrentUser() user: any) {
    // [4] CONTEXT: sendEmail should be called from:
    //     - orders.service.ts (after order creation)
    //     - payments.service.ts (after payment success)
    //     - auth.service.ts (password reset flow)
    //     - users.service.ts (account creation)
    //
    //     The userId from user.sub is mainly for audit logging,
    //     the actual 'to' email comes from sendEmailDto.to
    //
    // [5] DELEGATE TO SERVICE
    const result = await this.notificationService.sendEmail(
      sendEmailDto,
      user.sub, // userId for audit log
    );

    return {
      success: true,
      messageId: result.messageId,
      sentAt: new Date(),
    };
  }

  /**
   * [6] SEND SMS ENDPOINT
   *     POST /notifications/sms
   *     Body: SendSmsDto
   *     Response: { success: true, messageId: 'sms_12345' }
   *     Use cases:
   *       - Send OTP code (passwordless auth)
   *       - Send order confirmation (SMS alert)
   *       - Send payment receipt (SMS notification)
   *       - Send delivery update (shipment tracking)
   */
  @Post('sms')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(200) // Return 200 (not 201) as notification is async
  async sendSms(@Body() sendSmsDto: SendSmsDto, @CurrentUser() user: any) {
    // [7] CONTEXT: sendSms should be called from:
    //     - otp.service.ts (after OTP generation)
    //     - orders.service.ts (order notifications)
    //     - payments.service.ts (payment notifications)
    //     - shipment.service.ts (delivery updates)
    //
    //     The phoneNumber comes from sendSmsDto, not user
    //     because notifications go to customer, not authenticated user
    //
    // [8] DELEGATE TO SERVICE
    const result = await this.notificationService.sendSms(
      sendSmsDto,
      user.sub, // userId for audit log
    );

    return {
      success: true,
      messageId: result.messageId,
      sentAt: new Date(),
    };
  }
}
