import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Every CRM DTO is an explicit allow-list.
 *
 * The global ValidationPipe runs with `whitelist: true` and
 * `forbidNonWhitelisted: true`, so any property NOT declared here is rejected
 * with a 400 rather than being forwarded to Prisma. That is what stops a
 * caller from smuggling `userId` (tenant reassignment) or `id` into a
 * create/update payload.
 */

export const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'lost', 'converted'] as const;
export const LEAD_SOURCES = ['whatsapp', 'manual', 'referral'] as const;
export const DEAL_STAGES = [
  'prospecting',
  'qualification',
  'proposal',
  'negotiation',
  'closed_won',
  'closed_lost',
] as const;
export const TASK_STATUSES = ['todo', 'in_progress', 'done', 'cancelled'] as const;
export const TASK_PRIORITIES = ['low', 'medium', 'high'] as const;
export const ACTIVITY_TYPES = ['call', 'email', 'meeting', 'note', 'whatsapp_message'] as const;
export const MESSAGE_DIRECTIONS = ['inbound', 'outbound'] as const;
export const MESSAGE_TYPES = ['text', 'image', 'audio', 'video', 'document'] as const;
export const MESSAGE_STATUSES = ['sent', 'delivered', 'read', 'failed'] as const;

// ---------------------------------------------------------------- Contacts

export class CreateContactDto {
  @IsString() @MaxLength(200) name!: string;
  @IsOptional() @IsString() @MaxLength(320) email?: string;
  @IsOptional() @IsString() @MaxLength(50) phone?: string;
  @IsOptional() @IsString() @MaxLength(200) company?: string;
  @IsOptional() @IsString() @MaxLength(200) title?: string;
  @IsOptional() @IsString() @MaxLength(5000) notes?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
}

export class UpdateContactDto {
  @IsOptional() @IsString() @MaxLength(200) name?: string;
  @IsOptional() @IsString() @MaxLength(320) email?: string;
  @IsOptional() @IsString() @MaxLength(50) phone?: string;
  @IsOptional() @IsString() @MaxLength(200) company?: string;
  @IsOptional() @IsString() @MaxLength(200) title?: string;
  @IsOptional() @IsString() @MaxLength(5000) notes?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
}

// ------------------------------------------------------------------- Leads

export class CreateLeadDto {
  @IsOptional() @IsString() @MaxLength(200) name?: string;
  @IsOptional() @IsString() @MaxLength(320) email?: string;
  @IsOptional() @IsString() @MaxLength(50) phone?: string;
  @IsOptional() @IsIn(LEAD_SOURCES) source?: string;
  @IsOptional() @IsIn(LEAD_STATUSES) status?: string;
  @IsOptional() @IsNumber() @Min(0) value?: number;
  @IsOptional() @IsString() @MaxLength(3) currency?: string;
  @IsOptional() @IsString() @MaxLength(5000) notes?: string;
  @IsOptional() @IsString() assignedTo?: string;
}

export class UpdateLeadDto extends CreateLeadDto {}

// --------------------------------------------------------------- Companies

export class CreateCompanyDto {
  @IsString() @MaxLength(200) name!: string;
  @IsOptional() @IsString() @MaxLength(500) website?: string;
  @IsOptional() @IsString() @MaxLength(120) industry?: string;
  @IsOptional() @IsString() @MaxLength(50) size?: string;
  @IsOptional() @IsString() @MaxLength(500) address?: string;
  @IsOptional() @IsString() @MaxLength(5000) notes?: string;
}

export class UpdateCompanyDto {
  @IsOptional() @IsString() @MaxLength(200) name?: string;
  @IsOptional() @IsString() @MaxLength(500) website?: string;
  @IsOptional() @IsString() @MaxLength(120) industry?: string;
  @IsOptional() @IsString() @MaxLength(50) size?: string;
  @IsOptional() @IsString() @MaxLength(500) address?: string;
  @IsOptional() @IsString() @MaxLength(5000) notes?: string;
}

// ------------------------------------------------------------------- Deals

export class CreateDealDto {
  @IsString() @MaxLength(200) title!: string;
  @IsNumber() @Min(0) value!: number;
  @IsOptional() @IsString() @MaxLength(3) currency?: string;
  @IsOptional() @IsString() leadId?: string;
  @IsOptional() @IsIn(DEAL_STAGES) stage?: string;
  @IsOptional() @IsInt() @Min(0) @Max(100) probability?: number;
  @IsOptional() @IsDateString() expectedCloseDate?: string;
  @IsOptional() @IsString() @MaxLength(5000) notes?: string;
}

export class UpdateDealDto {
  @IsOptional() @IsString() @MaxLength(200) title?: string;
  @IsOptional() @IsNumber() @Min(0) value?: number;
  @IsOptional() @IsString() @MaxLength(3) currency?: string;
  @IsOptional() @IsString() leadId?: string;
  @IsOptional() @IsIn(DEAL_STAGES) stage?: string;
  @IsOptional() @IsInt() @Min(0) @Max(100) probability?: number;
  @IsOptional() @IsDateString() expectedCloseDate?: string;
  @IsOptional() @IsDateString() actualCloseDate?: string;
  @IsOptional() @IsString() @MaxLength(5000) notes?: string;
}

export class UpdateDealStageDto {
  @IsIn(DEAL_STAGES) stage!: string;
}

// ------------------------------------------------------------------- Tasks

export class CreateTaskDto {
  @IsString() @MaxLength(200) title!: string;
  @IsOptional() @IsString() @MaxLength(5000) description?: string;
  @IsOptional() @IsDateString() dueDate?: string;
  @IsOptional() @IsIn(TASK_PRIORITIES) priority?: string;
  @IsOptional() @IsIn(TASK_STATUSES) status?: string;
  @IsOptional() @IsIn(['lead', 'deal', 'contact']) relatedTo?: string;
  @IsOptional() @IsString() relatedId?: string;
}

export class UpdateTaskDto extends CreateTaskDto {
  @IsOptional() @IsString() @MaxLength(200) declare title?: string;
}

// -------------------------------------------------------------- Activities

export class CreateActivityDto {
  @IsIn(ACTIVITY_TYPES) type!: string;
  @IsString() @MaxLength(10000) description!: string;
  @IsOptional() @IsString() @MaxLength(200) subject?: string;
  @IsOptional() @IsString() leadId?: string;
}

export class UpdateActivityDto {
  @IsOptional() @IsIn(ACTIVITY_TYPES) type?: string;
  @IsOptional() @IsString() @MaxLength(10000) description?: string;
  @IsOptional() @IsString() @MaxLength(200) subject?: string;
}

// -------------------------------------------------------- WhatsApp messages

export class CreateWhatsappMessageDto {
  @IsString() contactId!: string;
  @IsString() @MaxLength(200) waMessageId!: string;
  @IsIn(MESSAGE_DIRECTIONS) direction!: string;
  @IsString() @MaxLength(20000) content!: string;
  @IsOptional() @IsIn(MESSAGE_TYPES) type?: string;
  @IsOptional() @IsString() @MaxLength(2000) mediaUrl?: string;
  @IsOptional() @IsIn(MESSAGE_STATUSES) status?: string;
  @IsOptional() @IsDateString() timestamp?: string;
}

export class UpdateWhatsappMessageDto {
  @IsOptional() @IsIn(MESSAGE_STATUSES) status?: string;
  @IsOptional() @IsString() @MaxLength(2000) mediaUrl?: string;
  @IsOptional() @IsBoolean() reread?: boolean;
}

// ------------------------------------------------------------------ Paging

export class ListQueryDto {
  @IsOptional() @IsInt() @Min(1) @Max(200) take?: number;
  @IsOptional() @IsInt() @Min(0) skip?: number;
  @IsOptional() @IsString() @MaxLength(200) q?: string;
}
