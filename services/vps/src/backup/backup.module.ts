import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { VpsBackupSchedulerService } from './backup-scheduler.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [VpsBackupSchedulerService],
  exports: [VpsBackupSchedulerService],
})
export class BackupModule {}
