import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';

export interface CreateLeadDto {
  name?: string;
  email?: string;
  phone?: string;
  source?: string;
  value?: number;
  currency?: string;
  notes?: string;
}

export interface UpdateLeadDto {
  name?: string;
  email?: string;
  phone?: string;
  status?: string;
  value?: number;
  currency?: string;
  notes?: string;
  assignedTo?: string;
}

export interface CreateContactDto {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  title?: string;
  notes?: string;
  tags?: string[];
}

export interface UpdateContactDto {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  title?: string;
  notes?: string;
  tags?: string[];
}

export interface CreateCompanyDto {
  name: string;
  website?: string;
  industry?: string;
  size?: string;
  address?: string;
  notes?: string;
}

export interface UpdateCompanyDto {
  name?: string;
  website?: string;
  industry?: string;
  size?: string;
  address?: string;
  notes?: string;
}

export interface CreateDealDto {
  leadId?: string;
  title: string;
  value: number;
  currency?: string;
  stage?: string;
  probability?: number;
  expectedCloseDate?: Date;
  notes?: string;
}

export interface UpdateDealDto {
  title?: string;
  value?: number;
  currency?: string;
  stage?: string;
  probability?: number;
  expectedCloseDate?: Date;
  actualCloseDate?: Date;
  notes?: string;
}

export interface CreateTaskDto {
  title: string;
  description?: string;
  dueDate?: Date;
  priority?: string;
  relatedTo?: string;
  relatedId?: string;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  dueDate?: Date;
  priority?: string;
  status?: string;
}

export interface CreateActivityDto {
  leadId?: string;
  type: string;
  subject?: string;
  description: string;
}

@Injectable()
export class CrmService {
  constructor(private prisma: PrismaService) {}

  // LEADS
  async getLeads(user: User) {
    return this.prisma.crmLead.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: { deals: true, activities: true },
    });
  }

  async getLead(user: User, id: string) {
    const lead = await this.prisma.crmLead.findFirst({
      where: { id, userId: user.id },
      include: { deals: true, activities: true },
    });
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  async createLead(user: User, dto: CreateLeadDto) {
    return this.prisma.crmLead.create({
      data: {
        userId: user.id,
        ...dto,
      },
    });
  }

  async updateLead(user: User, id: string, dto: UpdateLeadDto) {
    const lead = await this.getLead(user, id);
    return this.prisma.crmLead.update({
      where: { id },
      data: dto,
    });
  }

  async deleteLead(user: User, id: string) {
    await this.getLead(user, id);
    return this.prisma.crmLead.delete({ where: { id } });
  }

  // CONTACTS
  async getContacts(user: User) {
    return this.prisma.crmContact.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getContact(user: User, id: string) {
    const contact = await this.prisma.crmContact.findFirst({
      where: { id, userId: user.id },
    });
    if (!contact) throw new NotFoundException('Contact not found');
    return contact;
  }

  async createContact(user: User, dto: CreateContactDto) {
    return this.prisma.crmContact.create({
      data: {
        userId: user.id,
        ...dto,
      },
    });
  }

  async updateContact(user: User, id: string, dto: UpdateContactDto) {
    await this.getContact(user, id);
    return this.prisma.crmContact.update({
      where: { id },
      data: dto,
    });
  }

  async deleteContact(user: User, id: string) {
    await this.getContact(user, id);
    return this.prisma.crmContact.delete({ where: { id } });
  }

  // COMPANIES
  async getCompanies(user: User) {
    return this.prisma.crmCompany.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCompany(user: User, id: string) {
    const company = await this.prisma.crmCompany.findFirst({
      where: { id, userId: user.id },
    });
    if (!company) throw new NotFoundException('Company not found');
    return company;
  }

  async createCompany(user: User, dto: CreateCompanyDto) {
    return this.prisma.crmCompany.create({
      data: {
        userId: user.id,
        ...dto,
      },
    });
  }

  async updateCompany(user: User, id: string, dto: UpdateCompanyDto) {
    await this.getCompany(user, id);
    return this.prisma.crmCompany.update({
      where: { id },
      data: dto,
    });
  }

  async deleteCompany(user: User, id: string) {
    await this.getCompany(user, id);
    return this.prisma.crmCompany.delete({ where: { id } });
  }

  // DEALS
  async getDeals(user: User) {
    return this.prisma.crmDeal.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: { lead: true },
    });
  }

  async getDeal(user: User, id: string) {
    const deal = await this.prisma.crmDeal.findFirst({
      where: { id, userId: user.id },
      include: { lead: true },
    });
    if (!deal) throw new NotFoundException('Deal not found');
    return deal;
  }

  async createDeal(user: User, dto: CreateDealDto) {
    return this.prisma.crmDeal.create({
      data: {
        userId: user.id,
        ...dto,
      },
    });
  }

  async updateDeal(user: User, id: string, dto: UpdateDealDto) {
    await this.getDeal(user, id);
    return this.prisma.crmDeal.update({
      where: { id },
      data: dto,
    });
  }

  async deleteDeal(user: User, id: string) {
    await this.getDeal(user, id);
    return this.prisma.crmDeal.delete({ where: { id } });
  }

  // TASKS
  async getTasks(user: User) {
    return this.prisma.crmTask.findMany({
      where: { userId: user.id },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async getTask(user: User, id: string) {
    const task = await this.prisma.crmTask.findFirst({
      where: { id, userId: user.id },
    });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async createTask(user: User, dto: CreateTaskDto) {
    return this.prisma.crmTask.create({
      data: {
        userId: user.id,
        ...dto,
      },
    });
  }

  async updateTask(user: User, id: string, dto: UpdateTaskDto) {
    await this.getTask(user, id);
    return this.prisma.crmTask.update({
      where: { id },
      data: dto,
    });
  }

  async deleteTask(user: User, id: string) {
    await this.getTask(user, id);
    return this.prisma.crmTask.delete({ where: { id } });
  }

  // ACTIVITIES
  async getActivities(user: User, leadId?: string) {
    return this.prisma.crmActivity.findMany({
      where: { userId: user.id, leadId },
      orderBy: { createdAt: 'desc' },
      include: { lead: true },
    });
  }

  async getActivity(user: User, id: string) {
    const activity = await this.prisma.crmActivity.findFirst({
      where: { id, userId: user.id },
      include: { lead: true },
    });
    if (!activity) throw new NotFoundException('Activity not found');
    return activity;
  }

  async createActivity(user: User, dto: CreateActivityDto) {
    return this.prisma.crmActivity.create({
      data: {
        userId: user.id,
        ...dto,
      },
    });
  }

  async deleteActivity(user: User, id: string) {
    await this.getActivity(user, id);
    return this.prisma.crmActivity.delete({ where: { id } });
  }

  // DASHBOARD STATS
  async getStats(user: User) {
    const [leads, contacts, companies, deals, tasks] = await Promise.all([
      this.prisma.crmLead.count({ where: { userId: user.id } }),
      this.prisma.crmContact.count({ where: { userId: user.id } }),
      this.prisma.crmCompany.count({ where: { userId: user.id } }),
      this.prisma.crmDeal.count({ where: { userId: user.id } }),
      this.prisma.crmTask.count({ where: { userId: user.id, status: 'todo' } }),
    ]);

    const totalDealValue = await this.prisma.crmDeal.aggregate({
      where: { userId: user.id, stage: { not: 'closed_lost' } },
      _sum: { value: true },
    });

    return {
      leads,
      contacts,
      companies,
      deals,
      pendingTasks: tasks,
      totalDealValue: totalDealValue._sum.value || 0,
    };
  }
}
