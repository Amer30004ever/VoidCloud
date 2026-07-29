import { IsString, IsOptional, Length } from 'class-validator';

export class CreateGenerationDto {
  @IsString()
  @IsOptional()
  @Length(1, 2000)
  prompt?: string;
}
