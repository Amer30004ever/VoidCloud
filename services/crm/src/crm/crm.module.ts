import { Module } from '@nestjs/common';
import { CrmController } from './crm.controller';
import { CrmService } from './crm.service';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { WhatsappController } from '../whatsapp/whatsapp.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, WhatsappModule],
  controllers: [CrmController, WhatsappController],
  providers: [CrmService],
})
export class CrmModule {}
