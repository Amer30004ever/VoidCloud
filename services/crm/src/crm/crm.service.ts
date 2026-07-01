import { Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CrmService {
  constructor(private readonly prisma: PrismaService) {}

  private tenantFilter(user: { id: string; role: Role }) {
    return user.role === Role.SUPER_ADMIN ? {} : { userId: user.id };
  }

  listCustomers(user: { id: string; role: Role }) {
    return this.prisma.crmContact.findMany({
      where: this.tenantFilter(user),
      orderBy: { createdAt: 'desc' },
    });
  }

  createCustomer(user: { id: string }, data: Record<string, unknown>) {
    return this.prisma.crmContact.create({
      data: { ...(data as object), userId: user.id } as never,
    });
  }

  getCustomer(id: string) {
    return this.findContact(id);
  }

  updateCustomer(id: string, data: Record<string, unknown>) {
    return this.prisma.crmContact.update({ where: { id }, data: data as never });
  }

  listLeads(user: { id: string; role: Role }) {
    return this.prisma.crmLead.findMany({
      where: this.tenantFilter(user),
      orderBy: { createdAt: 'desc' },
    });
  }

  createLead(user: { id: string }, data: Record<string, unknown>) {
    return this.prisma.crmLead.create({
      data: { ...(data as object), userId: user.id } as never,
    });
  }

  async convertLead(id: string) {
    const lead = await this.prisma.crmLead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException('Lead not found');
    const contact = await this.prisma.crmContact.create({
      data: {
        name: lead.name,
        email: lead.email ?? undefined,
        phone: lead.phone ?? undefined,
        userId: lead.userId,
      },
    });
    await this.prisma.crmLead.update({
      where: { id },
      data: { status: 'converted' },
    });
    return { contact, lead };
  }

  listDeals(user: { id: string; role: Role }) {
    return this.prisma.crmDeal.findMany({
      where: this.tenantFilter(user),
      orderBy: { createdAt: 'desc' },
    });
  }

  createDeal(user: { id: string }, data: Record<string, unknown>) {
    return this.prisma.crmDeal.create({
      data: { ...(data as object), userId: user.id } as never,
    });
  }

  updateDealStage(id: string, stage: string) {
    return this.prisma.crmDeal.update({
      where: { id },
      data: { stage: stage as never },
    });
  }

  listTasks(user: { id: string; role: Role }) {
    return this.prisma.crmTask.findMany({
      where: this.tenantFilter(user),
      orderBy: { dueDate: 'asc' },
    });
  }

  createTask(user: { id: string }, data: Record<string, unknown>) {
    return this.prisma.crmTask.create({
      data: { ...(data as object), userId: user.id } as never,
    });
  }

  completeTask(id: string) {
    return this.prisma.crmTask.update({
      where: { id },
      data: { status: 'done' },
    });
  }

  private async findContact(id: string) {
    const row = await this.prisma.crmContact.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Customer not found');
    return row;
  }
}
