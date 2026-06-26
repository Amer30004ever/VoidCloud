import { Module } from '@nestjs/common';
import { WaCrmController } from './wa-crm.controller';
import { WaCrmService } from './wa-crm.service';
import { CrmController } from './crm.controller';
import { CrmService } from './crm.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [WaCrmController, CrmController],
  providers: [WaCrmService, CrmService, PrismaService],
  exports: [WaCrmService, CrmService],
})
export class WaCrmModule {}
