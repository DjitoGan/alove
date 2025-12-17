import { Injectable, BadRequestException, Logger, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../../notifications/notification.service';
import { EmailTemplate } from '../../notifications/dto/send-email.dto';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

/**
 * Password Reset Service
 * Manages secure password reset token generation and validation
 *
 * Flow:
 * 1. User requests password reset → Token sent to email
 * 2. User clicks link with token → Validates token
 * 3. User enters new password → Password updated, token invalidated
 */
@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  /**
   * Generate & send password reset token
   */
  async generateAndSendResetToken(userId: string, email: string): Promise<void> {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    try {
      // Delete old reset tokens for this user
      await this.prisma.passwordResetToken.deleteMany({
        where: { userId },
      });

      // Create new reset token
      await this.prisma.passwordResetToken.create({
        data: {
          userId,
          token,
          expiresAt,
        },
      });

      const resetLink = `${process.env.APP_URL || 'http://localhost:3000'}/reset-password?token=${token}`;

      // Send reset link via email
      await this.notificationService.sendEmail(
        {
          to: email,
          subject: 'Reset Your Password',
          template: EmailTemplate.PASSWORD_RESET,
          variables: {
            resetLink,
            expiresAt: expiresAt.toLocaleString(),
          },
        },
        userId,
      );

      this.logger.log(`Password reset token sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send reset token to ${email}:`, error);
      throw new BadRequestException('Failed to send password reset email');
    }
  }

  /**
   * Validate reset token
   */
  async validateResetToken(token: string): Promise<string> {
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!resetToken) {
      throw new BadRequestException('Invalid reset token');
    }

    if (new Date() > resetToken.expiresAt) {
      await this.prisma.passwordResetToken.delete({
        where: { token },
      });

      throw new BadRequestException('Reset token expired. Request a new one.');
    }

    if (resetToken.usedAt) {
      throw new ConflictException('This reset token has already been used');
    }

    return resetToken.userId;
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const userId = await this.validateResetToken(token);

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    try {
      // Update password
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          password: hashedPassword,
        },
      });

      // Mark token as used
      await this.prisma.passwordResetToken.update({
        where: { token },
        data: {
          usedAt: new Date(),
        },
      });

      // Invalidate all existing sessions for this user (security measure)
      await this.prisma.session.updateMany({
        where: { userId },
        data: {
          revokedAt: new Date(),
        },
      });

      this.logger.log(`Password reset for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to reset password for user:`, error);
      throw new BadRequestException('Failed to reset password');
    }
  }

  /**
   * Cleanup expired reset tokens (run periodically)
   */
  async cleanupExpiredTokens(): Promise<number> {
    const result = await this.prisma.passwordResetToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    this.logger.log(`Cleaned up ${result.count} expired password reset tokens`);
    return result.count;
  }
}
