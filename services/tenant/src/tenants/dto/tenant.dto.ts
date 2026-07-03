import { IsObject, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class CreateTenantDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  @Matches(/^[a-z0-9-]+$/)
  subdomain: string;

  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;
}

export class UpdateTenantDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]+$/)
  subdomain?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;
}

export class UpdateTenantSettingsDto {
  @IsObject()
  settings: Record<string, unknown>;
}
