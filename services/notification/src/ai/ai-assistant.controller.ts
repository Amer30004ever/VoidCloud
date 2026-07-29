import { Controller, Post, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { AiAssistantService, AiToolsService, ToolName } from './ai-assistant.service';

@Controller('notification/ai')
@UseGuards(JwtAuthGuard)
@ApiTags('AI Assistant')
@ApiBearerAuth()
export class AiAssistantController {
  constructor(
    private readonly assistant: AiAssistantService,
    private readonly tools: AiToolsService,
  ) {}

  @Post('chat')
  @ApiOperation({ summary: 'Chat with VoidCloud AI assistant (Tier A advisory / Tier B actions)' })
  async chat(
    @CurrentUser() user: { id: string; role: Role; impersonatedBy?: string },
    @Body() body: { message: string },
  ) {
    const userMessage = body.message?.trim();
    if (!userMessage) {
      throw new BadRequestException('message is required');
    }
    return this.assistant.chat(userMessage, user);
  }

  @Post('tools/execute')
  @ApiOperation({ summary: 'Execute a confirmed AI tool action with RBAC checks' })
  async executeTool(
    @CurrentUser() user: { id: string; role: Role; impersonatedBy?: string },
    @Body() body: {
      toolName: ToolName;
      arguments: Record<string, string | number>;
      confirmed?: boolean;
    },
  ) {
    return this.tools.execute(body.toolName, body.arguments ?? {}, user, body.confirmed ?? false);
  }
}
