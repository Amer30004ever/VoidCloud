import { Module } from '@nestjs/common';
import { WhatsappBroadcastController } from './whatsapp-broadcast.controller';
import { WhatsappBroadcastService } from './whatsapp-broadcast.service';
import { WhatsappBroadcastConsumer } from './whatsapp-broadcast.consumer';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [WhatsappBroadcastController, WhatsappBroadcastConsumer],
  providers: [WhatsappBroadcastService],
  exports: [WhatsappBroadcastService],
})
export class WhatsappBroadcastModule {}
