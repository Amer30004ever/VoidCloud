import { Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type AuthUser = { id: string; role: Role };

@Injectable()
export class CrmService {
  constructor(private readonly prisma: PrismaService) {}

  private tenantFilter(user: AuthUser) {
    return user.role === Role.SUPER_ADMIN ? {} : { userId: user.id };
  }

  listCustomers(user: AuthUser) {
    return this.prisma.crmContact.findMany({
      where: this.tenantFilter(user),
      orderBy: { createdAt: 'desc' },
    });
  }

  createCustomer(user: AuthUser, data: Record<string, unknown>) {
    return this.prisma.crmContact.create({
      data: { ...(data as object), userId: user.id } as never,
    });
  }

  async getCustomer(id: string, user: AuthUser) {
    return this.findOwnedContact(id, user);
  }

  async updateCustomer(id: string, data: Record<string, unknown>, user: AuthUser) {
    await this.findOwnedContact(id, user);
    return this.prisma.crmContact.update({ where: { id }, data: data as never });
  }

  listLeads(user: AuthUser) {
    return this.prisma.crmLead.findMany({
      where: this.tenantFilter(user),
      orderBy: { createdAt: 'desc' },
    });
  }

  createLead(user: AuthUser, data: Record<string, unknown>) {
    return this.prisma.crmLead.create({
      data: { ...(data as object), userId: user.id } as never,
    });
  }

  async convertLead(id: string, user: AuthUser) {
    const lead = await this.findOwnedLead(id, user);
    const contact = await this.prisma.crmContact.create({
      data: {
        name: lead.name ?? 'Converted lead',
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

  listDeals(user: AuthUser) {
    return this.prisma.crmDeal.findMany({
      where: this.tenantFilter(user),
      orderBy: { createdAt: 'desc' },
    });
  }

  createDeal(user: AuthUser, data: Record<string, unknown>) {
    return this.prisma.crmDeal.create({
      data: { ...(data as object), userId: user.id } as never,
    });
  }

  async updateDealStage(id: string, stage: string, user: AuthUser) {
    await this.findOwnedDeal(id, user);
    return this.prisma.crmDeal.update({
      where: { id },
      data: { stage: stage as never },
    });
  }

  listTasks(user: AuthUser) {
    return this.prisma.crmTask.findMany({
      where: this.tenantFilter(user),
      orderBy: { dueDate: 'asc' },
    });
  }

  createTask(user: AuthUser, data: Record<string, unknown>) {
    return this.prisma.crmTask.create({
      data: { ...(data as object), userId: user.id } as never,
    });
  }

  async completeTask(id: string, user: AuthUser) {
    await this.findOwnedTask(id, user);
    return this.prisma.crmTask.update({
      where: { id },
      data: { status: 'done' },
    });
  }

  private findOwnedContact(id: string, user: AuthUser) {
    return this.prisma.crmContact.findUnique({ where: { id } }).then((row) => {
      if (!row) throw new NotFoundException('Customer not found');
      if (user.role !== Role.SUPER_ADMIN && row.userId !== user.id) {
        throw new NotFoundException('Customer not found');
      }
      return row;
    });
  }

  private findOwnedLead(id: string, user: AuthUser) {
    return this.prisma.crmLead.findUnique({ where: { id } }).then((row) => {
      if (!row) throw new NotFoundException('Lead not found');
      if (user.role !== Role.SUPER_ADMIN && row.userId !== user.id) {
        throw new NotFoundException('Lead not found');
      }
      return row;
    });
  }

  private findOwnedDeal(id: string, user: AuthUser) {
    return this.prisma.crmDeal.findUnique({ where: { id } }).then((row) => {
      if (!row) throw new NotFoundException('Deal not found');
      if (user.role !== Role.SUPER_ADMIN && row.userId !== user.id) {
        throw new NotFoundException('Deal not found');
      }
      return row;
    });
  }

  private findOwnedTask(id: string, user: AuthUser) {
    return this.prisma.crmTask.findUnique({ where: { id } }).then((row) => {
      if (!row) throw new NotFoundException('Task not found');
      if (user.role !== Role.SUPER_ADMIN && row.userId !== user.id) {
        throw new NotFoundException('Task not found');
      }
      return row;
    });
  }
}
