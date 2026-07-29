import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AccountDeletionService } from './account-deletion.service';

@Module({
  imports: [PrismaModule],
  controllers: [],
  providers: [AccountDeletionService],
  exports: [AccountDeletionService],
})
export class DeletionModule {}
