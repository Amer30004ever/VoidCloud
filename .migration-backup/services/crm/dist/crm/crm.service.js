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
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
let CrmService = class CrmService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    tenantFilter(user) {
        return user.role === client_1.Role.SUPER_ADMIN ? {} : { userId: user.id };
    }
    listCustomers(user) {
        return this.prisma.crmContact.findMany({
            where: this.tenantFilter(user),
            orderBy: { createdAt: 'desc' },
        });
    }
    createCustomer(user, data) {
        return this.prisma.crmContact.create({
            data: { ...data, userId: user.id },
        });
    }
    getCustomer(id) {
        return this.findContact(id);
    }
    updateCustomer(id, data) {
        return this.prisma.crmContact.update({ where: { id }, data: data });
    }
    listLeads(user) {
        return this.prisma.crmLead.findMany({
            where: this.tenantFilter(user),
            orderBy: { createdAt: 'desc' },
        });
    }
    createLead(user, data) {
        return this.prisma.crmLead.create({
            data: { ...data, userId: user.id },
        });
    }
    async convertLead(id) {
        const lead = await this.prisma.crmLead.findUnique({ where: { id } });
        if (!lead)
            throw new common_1.NotFoundException('Lead not found');
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
    listDeals(user) {
        return this.prisma.crmDeal.findMany({
            where: this.tenantFilter(user),
            orderBy: { createdAt: 'desc' },
        });
    }
    createDeal(user, data) {
        return this.prisma.crmDeal.create({
            data: { ...data, userId: user.id },
        });
    }
    updateDealStage(id, stage) {
        return this.prisma.crmDeal.update({
            where: { id },
            data: { stage: stage },
        });
    }
    listTasks(user) {
        return this.prisma.crmTask.findMany({
            where: this.tenantFilter(user),
            orderBy: { dueDate: 'asc' },
        });
    }
    createTask(user, data) {
        return this.prisma.crmTask.create({
            data: { ...data, userId: user.id },
        });
    }
    completeTask(id) {
        return this.prisma.crmTask.update({
            where: { id },
            data: { status: 'done' },
        });
    }
    async findContact(id) {
        const row = await this.prisma.crmContact.findUnique({ where: { id } });
        if (!row)
            throw new common_1.NotFoundException('Customer not found');
        return row;
    }
};
exports.CrmService = CrmService;
exports.CrmService = CrmService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CrmService);
//# sourceMappingURL=crm.service.js.map