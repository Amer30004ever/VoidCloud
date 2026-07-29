import { IsNotEmpty, IsString } from 'class-validator';

export class ImpersonateDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}
