import { Module } from '@nestjs/common';
import { IncidentsController } from './incidents.controller';
import { IncidentsService } from './incidents.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  controllers: [IncidentsController],
  providers: [IncidentsService],
  imports: [PrismaModule],
})
export class IncidentsModule {}
