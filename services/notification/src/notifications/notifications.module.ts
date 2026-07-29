import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { VpsEventsConsumer } from '../vps-events.consumer';

@Module({
  controllers: [NotificationsController, VpsEventsConsumer],
  providers: [NotificationsService],
})
export class NotificationsModule {}
