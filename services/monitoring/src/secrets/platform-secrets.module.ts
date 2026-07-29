import { Module } from '@nestjs/common';
import { PlatformSecretsController } from './platform-secrets.controller';
import { PlatformSecretsService } from './platform-secrets.service';

@Module({
  controllers: [PlatformSecretsController],
  providers: [PlatformSecretsService],
  exports: [PlatformSecretsService],
})
export class PlatformSecretsModule {}
