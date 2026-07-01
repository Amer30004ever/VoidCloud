"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrmService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let CrmService = class CrmService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getLeads(user) {
        return this.prisma.crmLead.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' },
            include: { deals: true, activities: true },
        });
    }
    async getLead(user, id) {
        const lead = await this.prisma.crmLead.findFirst({
            where: { id, userId: user.id },
            include: { deals: true, activities: true },
        });
        if (!lead)
            throw new common_1.NotFoundException('Lead not found');
        return lead;
    }
    async createLead(user, dto) {
        return this.prisma.crmLead.create({
            data: {
                userId: user.id,
                ...dto,
            },
        });
    }
    async updateLead(user, id, dto) {
        const lead = await this.getLead(user, id);
        return this.prisma.crmLead.update({
            where: { id },
            data: dto,
        });
    }
    async deleteLead(user, id) {
        await this.getLead(user, id);
        return this.prisma.crmLead.delete({ where: { id } });
    }
    async getContacts(user) {
        return this.prisma.crmContact.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getContact(user, id) {
        const contact = await this.prisma.crmContact.findFirst({
            where: { id, userId: user.id },
        });
        if (!contact)
            throw new common_1.NotFoundException('Contact not found');
        return contact;
    }
    async createContact(user, dto) {
        return this.prisma.crmContact.create({
            data: {
                userId: user.id,
                ...dto,
            },
        });
    }
    async updateContact(user, id, dto) {
        await this.getContact(user, id);
        return this.prisma.crmContact.update({
            where: { id },
            data: dto,
        });
    }
    async deleteContact(user, id) {
        await this.getContact(user, id);
        return this.prisma.crmContact.delete({ where: { id } });
    }
    async getCompanies(user) {
        return this.prisma.crmCompany.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getCompany(user, id) {
        const company = await this.prisma.crmCompany.findFirst({
            where: { id, userId: user.id },
        });
        if (!company)
            throw new common_1.NotFoundException('Company not found');
        return company;
    }
    async createCompany(user, dto) {
        return this.prisma.crmCompany.create({
            data: {
                userId: user.id,
                ...dto,
            },
        });
    }
    async updateCompany(user, id, dto) {
        await this.getCompany(user, id);
        return this.prisma.crmCompany.update({
            where: { id },
            data: dto,
        });
    }
    async deleteCompany(user, id) {
        await this.getCompany(user, id);
        return this.prisma.crmCompany.delete({ where: { id } });
    }
    async getDeals(user) {
        return this.prisma.crmDeal.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' },
            include: { lead: true },
        });
    }
    async getDeal(user, id) {
        const deal = await this.prisma.crmDeal.findFirst({
            where: { id, userId: user.id },
            include: { lead: true },
        });
        if (!deal)
            throw new common_1.NotFoundException('Deal not found');
        return deal;
    }
    async createDeal(user, dto) {
        return this.prisma.crmDeal.create({
            data: {
                userId: user.id,
                ...dto,
            },
        });
    }
    async updateDeal(user, id, dto) {
        await this.getDeal(user, id);
        return this.prisma.crmDeal.update({
            where: { id },
            data: dto,
        });
    }
    async deleteDeal(user, id) {
        await this.getDeal(user, id);
        return this.prisma.crmDeal.delete({ where: { id } });
    }
    async getTasks(user) {
        return this.prisma.crmTask.findMany({
            where: { userId: user.id },
            orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
        });
    }
    async getTask(user, id) {
        const task = await this.prisma.crmTask.findFirst({
            where: { id, userId: user.id },
        });
        if (!task)
            throw new common_1.NotFoundException('Task not found');
        return task;
    }
    async createTask(user, dto) {
        return this.prisma.crmTask.create({
            data: {
                userId: user.id,
                ...dto,
            },
        });
    }
    async updateTask(user, id, dto) {
        await this.getTask(user, id);
        return this.prisma.crmTask.update({
            where: { id },
            data: dto,
        });
    }
    async deleteTask(user, id) {
        await this.getTask(user, id);
        return this.prisma.crmTask.delete({ where: { id } });
    }
    async getActivities(user, leadId) {
        return this.prisma.crmActivity.findMany({
            where: { userId: user.id, leadId },
            orderBy: { createdAt: 'desc' },
            include: { lead: true },
        });
    }
    async getActivity(user, id) {
        const activity = await this.prisma.crmActivity.findFirst({
            where: { id, userId: user.id },
            include: { lead: true },
        });
        if (!activity)
            throw new common_1.NotFoundException('Activity not found');
        return activity;
    }
    async createActivity(user, dto) {
        return this.prisma.crmActivity.create({
            data: {
                userId: user.id,
                ...dto,
            },
        });
    }
    async deleteActivity(user, id) {
        await this.getActivity(user, id);
        return this.prisma.crmActivity.delete({ where: { id } });
    }
    async getStats(user) {
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
};
exports.CrmService = CrmService;
exports.CrmService = CrmService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CrmService);
//# sourceMappingURL=crm.service.js.map