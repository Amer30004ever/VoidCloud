import { NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CrmService } from './crm.service';

/**
 * Cross-tenant CRM isolation — mirrors VpsService.findOwned() behaviour.
 * Non-SUPER_ADMIN users must never read or mutate another tenant's CRM rows by ID.
 */
describe('CrmService — cross-tenant isolation', () => {
  const tenantB = 'user-B';
  const userA = { id: 'user-A', role: Role.ADMIN };
  const superAdmin = { id: 'user-root', role: Role.SUPER_ADMIN };

  const OTHER_CONTACT = { id: 'contact-B', userId: tenantB, name: 'Tenant B Contact' };
  const OTHER_LEAD = { id: 'lead-B', userId: tenantB, name: 'Tenant B Lead', status: 'new' };
  const OTHER_DEAL = { id: 'deal-B', userId: tenantB, title: 'Tenant B Deal', stage: 'prospecting' };
  const OTHER_TASK = { id: 'task-B', userId: tenantB, title: 'Tenant B Task', status: 'todo' };

  const mkPrisma = () => ({
    crmContact: {
      findUnique: jest.fn().mockResolvedValue(OTHER_CONTACT),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({ ...OTHER_CONTACT }),
      create: jest.fn().mockResolvedValue({ id: 'new-contact', userId: tenantB }),
    },
    crmLead: {
      findUnique: jest.fn().mockResolvedValue(OTHER_LEAD),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({ ...OTHER_LEAD, status: 'converted' }),
      create: jest.fn().mockResolvedValue({ id: 'new-contact', userId: tenantB }),
    },
    crmDeal: {
      findUnique: jest.fn().mockResolvedValue(OTHER_DEAL),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({ ...OTHER_DEAL, stage: 'closed_won' }),
    },
    crmTask: {
      findUnique: jest.fn().mockResolvedValue(OTHER_TASK),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({ ...OTHER_TASK, status: 'done' }),
    },
  });

  const mkService = () => {
    const prisma = mkPrisma();
    const svc = new CrmService(prisma as never);
    return { svc, prisma };
  };

  describe('customers', () => {
    it('Tenant A cannot read Tenant B customer', async () => {
      const { svc } = mkService();
      await expect(svc.getCustomer(OTHER_CONTACT.id, userA)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('Tenant A cannot update Tenant B customer', async () => {
      const { svc, prisma } = mkService();
      await expect(svc.updateCustomer(OTHER_CONTACT.id, { name: 'hacked' }, userA)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.crmContact.update).not.toHaveBeenCalled();
    });

    it('SUPER_ADMIN can read any customer', async () => {
      const { svc } = mkService();
      await expect(svc.getCustomer(OTHER_CONTACT.id, superAdmin)).resolves.toMatchObject({ id: OTHER_CONTACT.id });
    });
  });

  describe('leads', () => {
    it('Tenant A cannot convert Tenant B lead', async () => {
      const { svc, prisma } = mkService();
      await expect(svc.convertLead(OTHER_LEAD.id, userA)).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.crmContact.create).not.toHaveBeenCalled();
      expect(prisma.crmLead.update).not.toHaveBeenCalled();
    });

    it('SUPER_ADMIN can convert any lead', async () => {
      const { svc, prisma } = mkService();
      await expect(svc.convertLead(OTHER_LEAD.id, superAdmin)).resolves.toMatchObject({
        lead: expect.objectContaining({ id: OTHER_LEAD.id }),
      });
      expect(prisma.crmContact.create).toHaveBeenCalled();
    });
  });

  describe('deals', () => {
    it('Tenant A cannot update Tenant B deal stage', async () => {
      const { svc, prisma } = mkService();
      await expect(svc.updateDealStage(OTHER_DEAL.id, 'closed_won', userA)).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.crmDeal.update).not.toHaveBeenCalled();
    });

    it('SUPER_ADMIN can update any deal', async () => {
      const { svc } = mkService();
      await expect(svc.updateDealStage(OTHER_DEAL.id, 'closed_won', superAdmin)).resolves.toMatchObject({
        stage: 'closed_won',
      });
    });
  });

  describe('tasks', () => {
    it('Tenant A cannot complete Tenant B task', async () => {
      const { svc, prisma } = mkService();
      await expect(svc.completeTask(OTHER_TASK.id, userA)).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.crmTask.update).not.toHaveBeenCalled();
    });

    it('SUPER_ADMIN can complete any task', async () => {
      const { svc } = mkService();
      await expect(svc.completeTask(OTHER_TASK.id, superAdmin)).resolves.toMatchObject({ status: 'done' });
    });
  });

  describe('list queries', () => {
    it('listCustomers scopes by userId for non-admin', async () => {
      const { svc, prisma } = mkService();
      await svc.listCustomers(userA);
      expect(prisma.crmContact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: userA.id } }),
      );
    });

    it('listLeads is unscoped for SUPER_ADMIN', async () => {
      const { svc, prisma } = mkService();
      await svc.listLeads(superAdmin);
      expect(prisma.crmLead.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
    });
  });
});
