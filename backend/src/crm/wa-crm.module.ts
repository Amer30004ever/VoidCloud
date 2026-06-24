import { Module } from '@nestjs/common';
import { WaCrmController } from './wa-crm.controller';
import { WaCrmService } from './wa-crm.service';

@Module({
  controllers: [WaCrmController],
  providers: [WaCrmService],
  exports: [WaCrmService],
})
export class WaCrmModule {}
