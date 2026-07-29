import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TosAcceptanceService } from './tos-acceptance.service';

@Module({
  imports: [PrismaModule],
  controllers: [],
  providers: [TosAcceptanceService],
  exports: [TosAcceptanceService],
})
export class TosModule {}
