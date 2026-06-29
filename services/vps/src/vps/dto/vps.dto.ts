import { IsNumber, IsOptional, IsString, MinLength } from 'class-validator';

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
}

export class UpdateVpsDto {
  @IsOptional()
  @IsString()
  name?: string;
}
