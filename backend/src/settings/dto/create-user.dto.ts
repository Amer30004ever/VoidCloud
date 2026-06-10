import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, MinLength, ValidateIf } from 'class-validator';
import { Role } from '@prisma/client';

export enum PasswordMode {
  MANUAL = 'manual',
  RANDOM = 'random',
  FORCE_CHANGE = 'force_change',
}

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(2)
  name: string;

  @IsEnum(Role)
  role: Role;

  @IsEnum(PasswordMode)
  passwordMode: PasswordMode;

  @ValidateIf((dto: CreateUserDto) => dto.passwordMode === PasswordMode.MANUAL)
  @IsString()
  @MinLength(8)
  password?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ChangePasswordDto {
  @IsString()
  @MinLength(8)
  currentPassword: string;

  @IsString()
  @MinLength(8)
  newPassword: string;
}

export class ResetPasswordDto {
  @IsEnum(PasswordMode)
  passwordMode: PasswordMode;

  @ValidateIf((dto: ResetPasswordDto) => dto.passwordMode === PasswordMode.MANUAL)
  @IsString()
  @MinLength(8)
  password?: string;
}

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
