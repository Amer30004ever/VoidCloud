import { Module } from '@nestjs/common';
import { CollaborationController } from './collaboration.controller';
import { CollaborationService } from './collaboration.service';
import { ChatGateway } from './chat.gateway';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CollaborationController],
  providers: [CollaborationService, ChatGateway],
  exports: [CollaborationService],
})
export class CollaborationModule {}
