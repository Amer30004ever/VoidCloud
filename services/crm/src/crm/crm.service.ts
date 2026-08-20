import { Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { ListQueryDto } from './dto/crm.dto';

type AuthUser = { id: string; role: Role };

/**
 * Tenant model for CRM
 * ---------------------
 * Every first-class CRM row (lead, contact, company, deal, task, activity)
 * carries `userId` and is scoped by `tenantFilter`. WhatsApp messages have no
 * own `userId` — they are owned transitively through their contact, so they
 * are scoped with a relation filter (`contact.userId`).
 *
 * SUPER_ADMIN is the only role that reads across tenants.
 *
 * Two invariants every mutating method must uphold:
 *  1. Ownership is re-checked by id BEFORE the write (findOwned* helpers),
 *     and a foreign row is reported as 404 so the API is not an existence
 *     oracle for other tenants' ids.
 *  2. `userId` is never taken from the request body. DTOs whitelist fields,
 *     and writes always stamp `userId` from the authenticated principal.
 */
@Injectable()
export class CrmService {
  constructor(private readonly prisma: PrismaService) {}

  private tenantFilter(user: AuthUser) {
    return user.role === Role.SUPER_ADMIN ? {} : { userId: user.id };
  }

  /** WhatsApp messages are owned via their contact. */
  private messageTenantFilter(user: AuthUser) {
    return user.role === Role.SUPER_ADMIN ? {} : { contact: { userId: user.id } };
  }

  private page(query?: ListQueryDto) {
    return {
      take: query?.take ?? 50,
      skip: query?.skip ?? 0,
    };
  }

  /**
   * Defence in depth: even though the DTOs whitelist properties, strip the
   * ownership/identity columns before any Prisma write so a future DTO change
   * cannot silently reopen tenant reassignment.
   */
  private sanitize<T extends object>(data: T): T {
    const clone: Record<string, unknown> = { ...data };
    delete clone['userId'];
    delete clone['id'];
    delete clone['user'];
    delete clone['createdAt'];
    return clone as T;
  }

  // =================================================================== Contacts

  listCustomers(user: AuthUser, query?: ListQueryDto) {
    return this.prisma.crmContact.findMany({
      where: this.tenantFilter(user),
      orderBy: { createdAt: 'desc' },
      ...this.page(query),
    });
  }

  createCustomer(user: AuthUser, data: Record<string, unknown>) {
    return this.prisma.crmContact.create({
      data: { ...this.sanitize(data), userId: user.id } as never,
    });
  }

  async getCustomer(id: string, user: AuthUser) {
    return this.findOwnedContact(id, user);
  }

  async updateCustomer(id: string, data: Record<string, unknown>, user: AuthUser) {
    await this.findOwnedContact(id, user);
    return this.prisma.crmContact.update({
      where: { id },
      data: this.sanitize(data) as never,
    });
  }

  async deleteCustomer(id: string, user: AuthUser) {
    await this.findOwnedContact(id, user);
    await this.prisma.crmContact.delete({ where: { id } });
    return { id, deleted: true };
  }

  // ====================================================================== Leads

  listLeads(user: AuthUser, query?: ListQueryDto) {
    return this.prisma.crmLead.findMany({
      where: this.tenantFilter(user),
      orderBy: { createdAt: 'desc' },
      ...this.page(query),
    });
  }

  createLead(user: AuthUser, data: Record<string, unknown>) {
    return this.prisma.crmLead.create({
      data: { ...this.sanitize(data), userId: user.id } as never,
    });
  }

  async getLead(id: string, user: AuthUser) {
    return this.findOwnedLead(id, user);
  }

  async updateLead(id: string, data: Record<string, unknown>, user: AuthUser) {
    await this.findOwnedLead(id, user);
    return this.prisma.crmLead.update({
      where: { id },
      data: this.sanitize(data) as never,
    });
  }

  async deleteLead(id: string, user: AuthUser) {
    await this.findOwnedLead(id, user);
    await this.prisma.crmLead.delete({ where: { id } });
    return { id, deleted: true };
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

  // ================================================================== Companies

  listCompanies(user: AuthUser, query?: ListQueryDto) {
    return this.prisma.crmCompany.findMany({
      where: this.tenantFilter(user),
      orderBy: { createdAt: 'desc' },
      ...this.page(query),
    });
  }

  createCompany(user: AuthUser, data: Record<string, unknown>) {
    return this.prisma.crmCompany.create({
      data: { ...this.sanitize(data), userId: user.id } as never,
    });
  }

  async getCompany(id: string, user: AuthUser) {
    return this.findOwnedCompany(id, user);
  }

  async updateCompany(id: string, data: Record<string, unknown>, user: AuthUser) {
    await this.findOwnedCompany(id, user);
    return this.prisma.crmCompany.update({
      where: { id },
      data: this.sanitize(data) as never,
    });
  }

  async deleteCompany(id: string, user: AuthUser) {
    await this.findOwnedCompany(id, user);
    await this.prisma.crmCompany.delete({ where: { id } });
    return { id, deleted: true };
  }

  // ====================================================================== Deals

  listDeals(user: AuthUser, query?: ListQueryDto) {
    return this.prisma.crmDeal.findMany({
      where: this.tenantFilter(user),
      orderBy: { createdAt: 'desc' },
      ...this.page(query),
    });
  }

  createDeal(user: AuthUser, data: Record<string, unknown>) {
    return this.prisma.crmDeal.create({
      data: { ...this.sanitize(data), userId: user.id } as never,
    });
  }

  async getDeal(id: string, user: AuthUser) {
    return this.findOwnedDeal(id, user);
  }

  async updateDeal(id: string, data: Record<string, unknown>, user: AuthUser) {
    await this.findOwnedDeal(id, user);
    return this.prisma.crmDeal.update({
      where: { id },
      data: this.sanitize(data) as never,
    });
  }

  async updateDealStage(id: string, stage: string, user: AuthUser) {
    await this.findOwnedDeal(id, user);
    return this.prisma.crmDeal.update({
      where: { id },
      data: { stage: stage as never },
    });
  }

  async deleteDeal(id: string, user: AuthUser) {
    await this.findOwnedDeal(id, user);
    await this.prisma.crmDeal.delete({ where: { id } });
    return { id, deleted: true };
  }

  // ====================================================================== Tasks

  listTasks(user: AuthUser, query?: ListQueryDto) {
    return this.prisma.crmTask.findMany({
      where: this.tenantFilter(user),
      orderBy: { dueDate: 'asc' },
      ...this.page(query),
    });
  }

  createTask(user: AuthUser, data: Record<string, unknown>) {
    return this.prisma.crmTask.create({
      data: { ...this.sanitize(data), userId: user.id } as never,
    });
  }

  async getTask(id: string, user: AuthUser) {
    return this.findOwnedTask(id, user);
  }

  async updateTask(id: string, data: Record<string, unknown>, user: AuthUser) {
    await this.findOwnedTask(id, user);
    return this.prisma.crmTask.update({
      where: { id },
      data: this.sanitize(data) as never,
    });
  }

  async completeTask(id: string, user: AuthUser) {
    await this.findOwnedTask(id, user);
    return this.prisma.crmTask.update({
      where: { id },
      data: { status: 'done' },
    });
  }

  async deleteTask(id: string, user: AuthUser) {
    await this.findOwnedTask(id, user);
    await this.prisma.crmTask.delete({ where: { id } });
    return { id, deleted: true };
  }

  // ================================================================= Activities

  listActivities(user: AuthUser, query?: ListQueryDto) {
    return this.prisma.crmActivity.findMany({
      where: this.tenantFilter(user),
      orderBy: { createdAt: 'desc' },
      ...this.page(query),
    });
  }

  /**
   * An activity may reference a lead. The referenced lead must belong to the
   * caller too, otherwise a tenant could attach activity rows onto another
   * tenant's lead timeline.
   */
  async createActivity(user: AuthUser, data: Record<string, unknown>) {
    const clean = this.sanitize(data) as Record<string, unknown>;
    if (typeof clean['leadId'] === 'string') {
      await this.findOwnedLead(clean['leadId'] as string, user);
    }
    return this.prisma.crmActivity.create({
      data: { ...clean, userId: user.id } as never,
    });
  }

  async getActivity(id: string, user: AuthUser) {
    return this.findOwnedActivity(id, user);
  }

  async updateActivity(id: string, data: Record<string, unknown>, user: AuthUser) {
    await this.findOwnedActivity(id, user);
    return this.prisma.crmActivity.update({
      where: { id },
      data: this.sanitize(data) as never,
    });
  }

  async deleteActivity(id: string, user: AuthUser) {
    await this.findOwnedActivity(id, user);
    await this.prisma.crmActivity.delete({ where: { id } });
    return { id, deleted: true };
  }

  // ========================================================= WhatsApp messages

  listMessages(user: AuthUser, query?: ListQueryDto) {
    return this.prisma.whatsappMessage.findMany({
      where: this.messageTenantFilter(user),
      orderBy: { timestamp: 'desc' },
      ...this.page(query),
    });
  }

  async listMessagesForContact(contactId: string, user: AuthUser, query?: ListQueryDto) {
    await this.findOwnedWhatsappContact(contactId, user);
    return this.prisma.whatsappMessage.findMany({
      where: { contactId },
      orderBy: { timestamp: 'asc' },
      ...this.page(query),
    });
  }

  async createMessage(user: AuthUser, data: Record<string, unknown>) {
    const clean = this.sanitize(data) as Record<string, unknown>;
    // Ownership is derived from the contact, so the contact must be ours.
    await this.findOwnedWhatsappContact(clean['contactId'] as string, user);
    return this.prisma.whatsappMessage.create({
      data: {
        ...clean,
        timestamp: clean['timestamp'] ? new Date(clean['timestamp'] as string) : new Date(),
      } as never,
    });
  }

  async getMessage(id: string, user: AuthUser) {
    return this.findOwnedMessage(id, user);
  }

  async updateMessage(id: string, data: Record<string, unknown>, user: AuthUser) {
    await this.findOwnedMessage(id, user);
    const clean = this.sanitize(data) as Record<string, unknown>;
    delete clean['contactId'];
    delete clean['waMessageId'];
    return this.prisma.whatsappMessage.update({ where: { id }, data: clean as never });
  }

  async deleteMessage(id: string, user: AuthUser) {
    await this.findOwnedMessage(id, user);
    await this.prisma.whatsappMessage.delete({ where: { id } });
    return { id, deleted: true };
  }

  // ==================================================== ownership resolution

  private owned<T extends { userId: string }>(row: T | null, user: AuthUser, label: string): T {
    if (!row) throw new NotFoundException(`${label} not found`);
    if (user.role !== Role.SUPER_ADMIN && row.userId !== user.id) {
      throw new NotFoundException(`${label} not found`);
    }
    return row;
  }

  private findOwnedContact(id: string, user: AuthUser) {
    return this.prisma.crmContact
      .findUnique({ where: { id } })
      .then((row) => this.owned(row as never, user, 'Customer'));
  }

  private findOwnedLead(id: string, user: AuthUser) {
    return this.prisma.crmLead
      .findUnique({ where: { id } })
      .then((row) => this.owned(row as never, user, 'Lead'));
  }

  private findOwnedCompany(id: string, user: AuthUser) {
    return this.prisma.crmCompany
      .findUnique({ where: { id } })
      .then((row) => this.owned(row as never, user, 'Company'));
  }

  private findOwnedDeal(id: string, user: AuthUser) {
    return this.prisma.crmDeal
      .findUnique({ where: { id } })
      .then((row) => this.owned(row as never, user, 'Deal'));
  }

  private findOwnedTask(id: string, user: AuthUser) {
    return this.prisma.crmTask
      .findUnique({ where: { id } })
      .then((row) => this.owned(row as never, user, 'Task'));
  }

  private findOwnedActivity(id: string, user: AuthUser) {
    return this.prisma.crmActivity
      .findUnique({ where: { id } })
      .then((row) => this.owned(row as never, user, 'Activity'));
  }

  private findOwnedWhatsappContact(id: string, user: AuthUser) {
    return this.prisma.whatsappContact
      .findUnique({ where: { id } })
      .then((row) => this.owned(row as never, user, 'Contact'));
  }

  /** Messages have no userId column; resolve the owner through the contact. */
  private async findOwnedMessage(id: string, user: AuthUser) {
    const row = (await this.prisma.whatsappMessage.findUnique({
      where: { id },
      include: { contact: true },
    })) as unknown as { id: string; contact?: { userId: string } } | null;
    if (!row) throw new NotFoundException('Message not found');
    if (user.role !== Role.SUPER_ADMIN && row.contact?.userId !== user.id) {
      throw new NotFoundException('Message not found');
    }
    return row;
  }
}
