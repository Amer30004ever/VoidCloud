import { IsString, MinLength, IsArray } from 'class-validator';

export class CreateApiKeyDto {
  @IsString()
  @MinLength(3)
  name: string;

  @IsArray()
  @IsString({ each: true })
  permissions?: string[];

  expiresAt?: Date;
}
