import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { AgentService } from './agent.service';

type AgentUser = { id: string; role: Role };

@Controller('agent')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.AGENT, Role.SUPER_ADMIN)
export class AgentController {
  constructor(private readonly agent: AgentService) {}

  @Get('dashboard')
  getDashboard(@CurrentUser() user: AgentUser) {
    return this.agent.getDashboard(user);
  }

  @Get('conversations')
  listConversations(@CurrentUser() user: AgentUser) {
    return this.agent.listConversations(user);
  }

  @Get('leads')
  listLeads(@CurrentUser() user: AgentUser) {
    return this.agent.listLeads(user);
  }

  @Post('conversations/:id/reply')
  reply(
    @Param('id') id: string,
    @Body() body: { content: string },
    @CurrentUser() user: AgentUser,
  ) {
    return this.agent.replyToConversation(id, user, body.content);
  }

  @Patch('leads/:id/status')
  updateLeadStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
    @CurrentUser() user: AgentUser,
  ) {
    return this.agent.updateLeadStatus(id, user, body.status);
  }
}
