// apps/api/src/modules/otp/dto/verify-otp.dto.ts
import { IsEmail, IsString, Length, IsEnum } from 'class-validator';

export class VerifyOtpDto {
  @IsEmail()
  email: string;

  @IsString()
  @Length(6, 6)
  otp: string;

  @IsEnum(['registration', 'login', 'password-reset'])
  purpose: 'registration' | 'login' | 'password-reset';
}
