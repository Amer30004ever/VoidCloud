import { IsString, IsOptional, IsIn, Length } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @Length(1, 120)
  name: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateProjectDto {
  @IsString()
  @IsOptional()
  @Length(1, 120)
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsIn(['draft', 'generating', 'ready', 'failed'])
  @IsOptional()
  status?: string;
}
