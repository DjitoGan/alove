import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../../notifications/notification.service';
import { EmailTemplate } from '../../notifications/dto/send-email.dto';

/**
 * Email Verification Service
 * Manages OTP generation, verification, and email verification flow
 *
 * Flow:
 * 1. User registers → OTP generated & sent to email
 * 2. User enters OTP → Verified & account activated
 * 3. User can request new OTP if expired
 */
@Injectable()
export class EmailVerificationService {
  private readonly logger = new Logger(EmailVerificationService.name);

  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  /**
   * Generate & send OTP to user email
   */
  async generateAndSendOtp(userId: string, email: string): Promise<void> {
    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    try {
      // Delete old OTPs for this user
      await this.prisma.emailVerificationOtp.deleteMany({
        where: { userId },
      });

      // Create new OTP
      await this.prisma.emailVerificationOtp.create({
        data: {
          userId,
          code,
          expiresAt,
        },
      });

      // Send OTP via email
      await this.notificationService.sendEmail(
        {
          to: email,
          subject: 'Verify Your Email Address',
          template: EmailTemplate.EMAIL_VERIFICATION,
          variables: {
            code,
            expiresAt: expiresAt.toLocaleString(),
          },
        },
        userId,
      );

      this.logger.log(`OTP sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send OTP to ${email}:`, error);
      throw new BadRequestException('Failed to send verification code');
    }
  }

  /**
   * Verify OTP code
   */
  async verifyOtp(userId: string, code: string): Promise<void> {
    const otp = await this.prisma.emailVerificationOtp.findFirst({
      where: {
        userId,
        code,
      },
    });

    if (!otp) {
      // Increment attempts for failed attempts tracking
      await this.prisma.emailVerificationOtp.updateMany({
        where: { userId },
        data: {
          attempts: {
            increment: 1,
          },
        },
      });

      throw new BadRequestException('Invalid verification code');
    }

    // Check if OTP expired
    if (new Date() > otp.expiresAt) {
      await this.prisma.emailVerificationOtp.delete({
        where: { id: otp.id },
      });

      throw new BadRequestException('Verification code expired. Request a new one.');
    }

    // Mark user as verified
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        isEmailVerified: true,
      },
    });

    // Delete used OTP
    await this.prisma.emailVerificationOtp.delete({
      where: { id: otp.id },
    });

    this.logger.log(`Email verified for user ${userId}`);
  }

  /**
   * Check if email is verified
   */
  async isEmailVerified(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isEmailVerified: true },
    });

    return user?.isEmailVerified || false;
  }

  /**
   * Cleanup expired OTPs (run periodically)
   */
  async cleanupExpiredOtps(): Promise<number> {
    const result = await this.prisma.emailVerificationOtp.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    this.logger.log(`Cleaned up ${result.count} expired OTPs`);
    return result.count;
  }
}
