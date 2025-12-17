/**
 * [1] NOTIFICATION SERVICE
 *     Business logic for sending emails and SMS
 *     Integrations: SendGrid (email), Twilio (SMS)
 *     Caching: Redis for message deduplication and rate limiting
 *     Database: Prisma for notification audit log
 */

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { SendEmailDto } from './dto/send-email.dto';
import { SendSmsDto } from './dto/send-sms.dto';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class NotificationService {
  private logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * [2] SEND EMAIL
   *     Delegates to SendGrid API
   *     Steps:
   *       1. Check Redis for rate limit (max 10 emails per minute)
   *       2. Check for duplicate (same to + template + variables)
   *       3. Call SendGrid API (async, no await)
   *       4. Store audit log in Prisma
   *       5. Return messageId
   */
  async sendEmail(
    sendEmailDto: SendEmailDto,
    userId: string,
  ): Promise<{ messageId: string }> {
    // [3] RATE LIMITING VIA REDIS
    //     Key: email:user:{userId}:sent_count
    //     TTL: 60 seconds
    //     Max: 10 emails per minute
    const rateLimitKey = `email:user:${userId}:sent_count`;
    const emailCount = await this.redis.incr(rateLimitKey);

    if (emailCount === 1) {
      // First email this minute, set TTL
      await this.redis.expire(rateLimitKey, 60);
    }

    if (emailCount > 10) {
      throw new BadRequestException(
        'Rate limit exceeded: maximum 10 emails per minute',
      );
    }

    // [4] DEDUPLICATE VIA REDIS
    //     Key: email:dedup:{to}:{template}:{hash(variables)}
    //     TTL: 300 seconds (5 minutes)
    //     Prevents sending same email twice within 5 minutes
    const variablesHash = JSON.stringify(sendEmailDto.variables || {})
      .split('')
      .reduce((acc, char) => ((acc << 5) - acc) + char.charCodeAt(0), 0)
      .toString(36);

    const dedupeKey = `email:dedup:${sendEmailDto.to}:${sendEmailDto.template}:${variablesHash}`;
    const isDuplicate = await this.redis.get(dedupeKey);

    if (isDuplicate) {
      this.logger.warn(
        `Duplicate email detected for ${sendEmailDto.to} (template: ${sendEmailDto.template})`,
      );
      // Return existing messageId instead of sending again
      return { messageId: isDuplicate };
    }

    // [5] GENERATE MESSAGE ID
    //     Format: email_{timestamp}_{randomString}
    const messageId = `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // [6] STORE DEDUP KEY IN REDIS
    //     TTL: 5 minutes (300 seconds)
    await this.redis.setex(dedupeKey, 300, messageId);

    // [7] QUEUE EMAIL VIA SENDGRID
    //     TODO: Integrate SendGrid API
    //     Steps:
    //       1. Build email content from template
    //       2. Inject variables into template
    //       3. Call SendGrid.send() asynchronously
    //       4. Catch errors and log to Prisma.notificationLog
    this.sendViaProvider(sendEmailDto, messageId, userId);

    // [8] STORE AUDIT LOG IN PRISMA
    //     Table: NotificationLog (to be created)
    //     Fields: id, userId, type (email/sms), recipient, template, status, messageId, createdAt
    try {
      // Uncomment when NotificationLog model is added to schema.prisma
      // await this.prisma.notificationLog.create({
      //   data: {
      //     userId,
      //     type: 'EMAIL',
      //     recipient: sendEmailDto.to,
      //     template: sendEmailDto.template,
      //     status: 'PENDING',
      //     messageId,
      //   },
      // });
      this.logger.debug(`Email queued: ${messageId} to ${sendEmailDto.to}`);
    } catch (error) {
      this.logger.error(`Failed to log email: ${error.message}`);
    }

    // [9] RETURN MESSAGE ID TO CALLER
    //     Caller can use this for tracking/debugging
    return { messageId };
  }

  /**
   * [10] SEND SMS
   *      Delegates to Twilio API
   *      Steps:
   *        1. Check Redis for rate limit (max 5 SMS per minute)
   *        2. Validate phone number format
   *        3. Call Twilio API (async, no await)
   *        4. Store audit log in Prisma
   *        5. Return messageId
   */
  async sendSms(
    sendSmsDto: SendSmsDto,
    userId: string,
  ): Promise<{ messageId: string }> {
    // [11] RATE LIMITING VIA REDIS
    //      Key: sms:user:{userId}:sent_count
    //      TTL: 60 seconds
    //      Max: 5 SMS per minute
    const rateLimitKey = `sms:user:${userId}:sent_count`;
    const smsCount = await this.redis.incr(rateLimitKey);

    if (smsCount === 1) {
      // First SMS this minute, set TTL
      await this.redis.expire(rateLimitKey, 60);
    }

    if (smsCount > 5) {
      throw new BadRequestException(
        'Rate limit exceeded: maximum 5 SMS per minute',
      );
    }

    // [12] DEDUPLICATE VIA REDIS
    //      Key: sms:dedup:{phoneNumber}:{template}:{hash(variables)}
    //      TTL: 300 seconds (5 minutes)
    //      Prevents sending same SMS twice within 5 minutes
    const variablesHash = JSON.stringify(sendSmsDto.variables || {})
      .split('')
      .reduce((acc, char) => ((acc << 5) - acc) + char.charCodeAt(0), 0)
      .toString(36);

    const dedupeKey = `sms:dedup:${sendSmsDto.phoneNumber}:${sendSmsDto.template}:${variablesHash}`;
    const isDuplicate = await this.redis.get(dedupeKey);

    if (isDuplicate) {
      this.logger.warn(
        `Duplicate SMS detected for ${sendSmsDto.phoneNumber} (template: ${sendSmsDto.template})`,
      );
      return { messageId: isDuplicate };
    }

    // [13] GENERATE MESSAGE ID
    //      Format: sms_{timestamp}_{randomString}
    const messageId = `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // [14] STORE DEDUP KEY IN REDIS
    //      TTL: 5 minutes (300 seconds)
    await this.redis.setex(dedupeKey, 300, messageId);

    // [15] QUEUE SMS VIA TWILIO
    //      TODO: Integrate Twilio API
    //      Steps:
    //        1. Build SMS content from template
    //        2. Inject variables into template
    //        3. Call Twilio.send() asynchronously
    //        4. Catch errors and log to Prisma.notificationLog
    this.sendViaProvider(sendSmsDto, messageId, userId);

    // [16] STORE AUDIT LOG IN PRISMA
    //      Table: NotificationLog (to be created)
    try {
      // Uncomment when NotificationLog model is added to schema.prisma
      // await this.prisma.notificationLog.create({
      //   data: {
      //     userId,
      //     type: 'SMS',
      //     recipient: sendSmsDto.phoneNumber,
      //     template: sendSmsDto.template,
      //     status: 'PENDING',
      //     messageId,
      //   },
      // });
      this.logger.debug(`SMS queued: ${messageId} to ${sendSmsDto.phoneNumber}`);
    } catch (error) {
      this.logger.error(`Failed to log SMS: ${error.message}`);
    }

    // [17] RETURN MESSAGE ID TO CALLER
    return { messageId };
  }

  /**
   * [18] PRIVATE: SEND VIA PROVIDER
   *      Generic async sending function
   *      Catches errors without throwing (fire-and-forget pattern)
   */
  private async sendViaProvider(
    dto: SendEmailDto | SendSmsDto,
    messageId: string,
    userId: string,
  ): Promise<void> {
    // [19] FIRE-AND-FORGET PATTERN
    //      Use setImmediate to queue this outside current event loop
    //      Prevents blocking HTTP response
    setImmediate(async () => {
      try {
        // [20] TODO: PROVIDER INTEGRATION
        //      - For SendEmailDto: Call SendGrid API
        //      - For SendSmsDto: Call Twilio API
        //
        //      Example SendGrid:
        //      const msg = {
        //        to: dto.to,
        //        subject: dto.subject,
        //        html: this.buildEmailContent(dto.template, dto.variables),
        //      };
        //      await sgMail.send(msg);
        //
        //      Example Twilio:
        //      await twilio.messages.create({
        //        body: this.buildSmsContent(dto.template, dto.variables),
        //        to: dto.phoneNumber,
        //        from: process.env.TWILIO_PHONE,
        //      });

        this.logger.log(`Message sent: ${messageId}`);

        // [21] UPDATE AUDIT LOG STATUS TO SENT
        //      Uncomment when NotificationLog model exists
        // await this.prisma.notificationLog.update({
        //   where: { messageId },
        //   data: { status: 'SENT' },
        // });
      } catch (error) {
        this.logger.error(
          `Failed to send message ${messageId}: ${error.message}`,
        );

        // [22] UPDATE AUDIT LOG STATUS TO FAILED
        //      Uncomment when NotificationLog model exists
        // await this.prisma.notificationLog.update({
        //   where: { messageId },
        //   data: { status: 'FAILED', error: error.message },
        // });
      }
    });
  }

  /**
   * [23] HELPER: BUILD EMAIL CONTENT
   *      Renders template with variables
   *      TODO: Integrate with template engine (e.g., EJS, Handlebars)
   */
  private buildEmailContent(template: string, variables: any): string {
    // Placeholder for template rendering
    return `Email template: ${template}`;
  }

  /**
   * [24] HELPER: BUILD SMS CONTENT
   *      Renders template with variables
   *      TODO: Integrate with template engine
   */
  private buildSmsContent(template: string, variables: any): string {
    // Placeholder for template rendering
    return `SMS template: ${template}`;
  }
}
