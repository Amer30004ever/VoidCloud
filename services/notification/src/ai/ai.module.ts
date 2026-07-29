import { Module } from '@nestjs/common';
import { AiAssistantController } from './ai-assistant.controller';
import { AiAssistantService, AiContextService, AiToolsService } from './ai-assistant.service';

@Module({
  controllers: [AiAssistantController],
  providers: [AiAssistantService, AiContextService, AiToolsService],
})
export class AiModule {}
