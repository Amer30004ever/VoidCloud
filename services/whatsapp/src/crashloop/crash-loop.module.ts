import { Module } from '@nestjs/common';
import { CrashLoopGuard } from './crash-loop.guard';

@Module({
  providers: [CrashLoopGuard],
  exports: [CrashLoopGuard],
})
export class CrashLoopModule {}
