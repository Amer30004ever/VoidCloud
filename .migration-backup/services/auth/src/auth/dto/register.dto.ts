import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { Role } from '@prisma/client';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  @Matches(/^(\+?20)?1[0-2,5]\d{8}$/, {
    message: 'Invalid Egyptian phone number',
  })
  phone?: string;

  @IsOptional()
  @IsString()
  planSlug?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
