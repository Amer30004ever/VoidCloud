import { IsString, IsOptional, IsArray, Length } from 'class-validator';

export class CreateGenerationDto {
  @IsString()
  @IsOptional()
  @Length(1, 2000)
  prompt?: string;

  /**
   * Optional list of file paths (glob patterns allowed, e.g. `src/pages/*`)
   * to regenerate. When omitted, the whole project is regenerated.
   */
  @IsArray()
  @IsOptional()
  targetFiles?: string[];
}
