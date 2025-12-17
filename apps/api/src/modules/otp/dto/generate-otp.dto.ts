// apps/api/src/modules/otp/dto/generate-otp.dto.ts
import { IsEmail, IsEnum } from 'class-validator';

export class GenerateOtpDto {
  @IsEmail()
  email: string;

  @IsEnum(['registration', 'login', 'password-reset'])
  purpose: 'registration' | 'login' | 'password-reset';
}
