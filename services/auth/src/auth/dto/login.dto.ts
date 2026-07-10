import { IsEmail, IsString, IsNotEmpty } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  // NOTE: twoFactorToken is intentionally removed. /auth/login no longer accepts
  // a TOTP inline. 2FA-enabled users get a scoped pending token and must call
  // /auth/two-factor/login-verify separately.
}

