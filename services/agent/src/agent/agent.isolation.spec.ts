import { NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AgentService } from './agent.service';

describe('AgentService — cross-agent isolation', () => {
  const agentA = { id: 'agent-A', role: Role.AGENT };
  const agentB = { id: 'agent-B', role: Role.AGENT };
  const superAdmin = { id: 'admin-root', role: Role.SUPER_ADMIN };

  const OTHER_CONVERSATION = {
    id: 'conv-B',
    assignedTo: agentB.id,
    status: 'OPEN',
    userId: 'tenant-1',
  };
  const OTHER_LEAD = {
    id: 'lead-B',
    assignedTo: agentB.id,
    status: 'new',
    userId: 'tenant-1',
  };

  const mkPrisma = () => ({
    conversation: {
      findUnique: jest.fn().mockResolvedValue(OTHER_CONVERSATION),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue(OTHER_CONVERSATION),
    },
    crmLead: {
      findUnique: jest.fn().mockResolvedValue(OTHER_LEAD),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({ ...OTHER_LEAD, status: 'contacted' }),
    },
    message: {
      create: jest.fn().mockResolvedValue({ id: 'msg-1', content: 'hello' }),
    },
  });

  const mkService = () => {
    const prisma = mkPrisma();
    const svc = new AgentService(prisma as never);
    return { svc, prisma };
  };

  it('Agent A cannot reply to Agent B conversation', async () => {
    const { svc, prisma } = mkService();
    await expect(svc.replyToConversation(OTHER_CONVERSATION.id, agentA, 'hi')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.message.create).not.toHaveBeenCalled();
  });

  it('Agent A cannot update Agent B lead status', async () => {
    const { svc, prisma } = mkService();
    await expect(svc.updateLeadStatus(OTHER_LEAD.id, agentA, 'contacted')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.crmLead.update).not.toHaveBeenCalled();
  });

  it('listConversations only returns rows assigned to the agent', async () => {
    const { svc, prisma } = mkService();
    await svc.listConversations(agentA);
    expect(prisma.conversation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { assignedTo: agentA.id } }),
    );
  });

  it('listLeads only returns rows assigned to the agent', async () => {
    const { svc, prisma } = mkService();
    await svc.listLeads(agentA);
    expect(prisma.crmLead.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { assignedTo: agentA.id } }),
    );
  });

  it('SUPER_ADMIN can reply to any assigned conversation', async () => {
    const { svc, prisma } = mkService();
    await expect(svc.replyToConversation(OTHER_CONVERSATION.id, superAdmin, 'hi')).resolves.toMatchObject({
      conversationId: OTHER_CONVERSATION.id,
    });
    expect(prisma.message.create).toHaveBeenCalled();
  });
});
