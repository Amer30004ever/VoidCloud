import { Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type AgentUser = { id: string; role: Role };

@Injectable()
export class AgentService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(agent: AgentUser) {
    const [conversations, leads] = await Promise.all([
      this.prisma.conversation.findMany({
        where: { assignedTo: agent.id },
        select: { id: true, status: true },
      }),
      this.prisma.crmLead.findMany({
        where: { assignedTo: agent.id },
        select: { id: true, status: true },
      }),
    ]);

    const leadStatusSummary = leads.reduce<Record<string, number>>((acc, lead) => {
      acc[lead.status] = (acc[lead.status] ?? 0) + 1;
      return acc;
    }, {});

    return {
      assignedConversations: conversations.length,
      openConversations: conversations.filter((c) => c.status === 'OPEN').length,
      assignedLeads: leads.length,
      leadStatusSummary,
    };
  }

  listConversations(agent: AgentUser) {
    return this.prisma.conversation.findMany({
      where: { assignedTo: agent.id },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  listLeads(agent: AgentUser) {
    return this.prisma.crmLead.findMany({
      where: { assignedTo: agent.id },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async replyToConversation(conversationId: string, agent: AgentUser, content: string) {
    const conversation = await this.findAssignedConversation(conversationId, agent);
    const message = await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'agent',
        content,
        type: 'TEXT',
      },
    });
    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });
    return { conversationId: conversation.id, message };
  }

  async updateLeadStatus(leadId: string, agent: AgentUser, status: string) {
    await this.findAssignedLead(leadId, agent);
    return this.prisma.crmLead.update({
      where: { id: leadId },
      data: { status },
    });
  }

  private findAssignedConversation(id: string, agent: AgentUser) {
    return this.prisma.conversation.findUnique({ where: { id } }).then((row) => {
      if (!row) throw new NotFoundException('Conversation not found');
      if (agent.role !== Role.SUPER_ADMIN && row.assignedTo !== agent.id) {
        throw new NotFoundException('Conversation not found');
      }
      return row;
    });
  }

  private findAssignedLead(id: string, agent: AgentUser) {
    return this.prisma.crmLead.findUnique({ where: { id } }).then((row) => {
      if (!row) throw new NotFoundException('Lead not found');
      if (agent.role !== Role.SUPER_ADMIN && row.assignedTo !== agent.id) {
        throw new NotFoundException('Lead not found');
      }
      return row;
    });
  }
}
