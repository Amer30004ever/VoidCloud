import { IsIn, IsNumber, IsOptional, IsString, MinLength } from 'class-validator';
import { IsInProxmoxPool } from './static-ip.validator';

export class CreateVpsDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsNumber()
  cpu?: number;

  @IsOptional()
  @IsNumber()
  memory?: number;

  @IsOptional()
  @IsNumber()
  storage?: number;

  @IsOptional()
  @IsString()
  planSlug?: string;

  @IsOptional()
  @IsString()
  @IsInProxmoxPool()
  staticIp?: string;

  @IsOptional()
  @IsIn(['PAY_AS_YOU_GO', 'SUBSCRIPTION'])
  billingMode?: 'PAY_AS_YOU_GO' | 'SUBSCRIPTION';
}

export class UpdateVpsDto {
  @IsOptional()
  @IsString()
  name?: string;
}
