import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiKey } from './entities/api-key.entity';
import { ApiKeysService } from './api-keys.service';
import { ApiKeysController } from './api-keys.controller';
import { UsageModule } from '../usage/usage.module';

@Module({
  imports: [TypeOrmModule.forFeature([ApiKey]), UsageModule],
  providers: [ApiKeysService],
  controllers: [ApiKeysController],
  exports: [ApiKeysService],
})
export class ApiKeysModule {}
