import { IsString, IsOptional, IsArray, MaxLength, IsInt, Min } from 'class-validator';

export class CreateTemplateDto {
  @IsString()
  @MaxLength(120)
  name: string;

  @IsString()
  @MaxLength(4000)
  body: string;

  @IsOptional()
  @IsString()
  tenantId?: string;
}

export class SendBroadcastDto {
  @IsString()
  templateId: string;

  @IsOptional()
  @IsString()
  segment?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  recipientPhones?: string[];

  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  @IsString()
  planId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  activeWithinDays?: number;

  @IsOptional()
  @IsString()
  signupAfter?: string;

  @IsOptional()
  @IsString()
  signupBefore?: string;
}
