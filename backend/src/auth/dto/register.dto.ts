import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'StrongPass123!', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    example: '+201012345678',
    description: 'Egyptian phone format',
  })
  @IsOptional()
  @IsString()
  @Matches(/^(\+?20)?1[0-2,5]\d{8}$/, {
    message: 'Invalid Egyptian phone number',
  })
  phone?: string;

  @ApiPropertyOptional({
    example: 'free',
    description: 'Plan slug to subscribe to',
  })
  @IsOptional()
  @IsString()
  planSlug?: string;

  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
