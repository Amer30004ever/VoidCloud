import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  IsNotEmpty,
  IsOptional,
  Length,
} from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'admin@mavoid.com',
    description: 'User email address',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'password123',
    description: 'User password (min 6 chars)',
  })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({
    required: false,
    description: '6-digit TOTP code or a recovery code',
  })
  @IsOptional()
  @IsString()
  @Length(6, 32)
  twoFactorToken?: string;
}
