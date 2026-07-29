import { IsIn, IsInt, IsOptional, Min, Max } from 'class-validator';

export class CreateBackupScheduleDto {
  @IsIn(['HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY'])
  frequency: 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY';

  @IsInt()
  retention: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  hour?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  dayOfMonth?: number;
}
