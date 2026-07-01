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
exports.BillingService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let BillingService = class BillingService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    listSubscriptions(userId) {
        return this.prisma.user.findMany({
            where: userId ? { id: userId } : undefined,
            select: {
                id: true,
                email: true,
                subscriptionStatus: true,
                trialEndsAt: true,
                cloudPlan: true,
            },
        });
    }
    async createSubscription(userId, planSlug) {
        const plan = await this.prisma.cloudPlan.findUnique({ where: { slug: planSlug } });
        if (!plan)
            throw new common_1.NotFoundException('Plan not found');
        return this.prisma.user.update({
            where: { id: userId },
            data: {
                cloudPlanId: plan.id,
                subscriptionStatus: plan.priceUSD === 0 ? 'ACTIVE' : 'INCOMPLETE',
                trialEndsAt: plan.trialDays
                    ? new Date(Date.now() + plan.trialDays * 86400000)
                    : null,
            },
            include: { cloudPlan: true },
        });
    }
    updateSubscription(userId, data) {
        return this.prisma.user.update({
            where: { id: userId },
            data: {
                subscriptionStatus: data.status,
            },
        });
    }
    listInvoices(userId) {
        return this.prisma.cloudInvoice.findMany({
            where: userId ? { userId } : undefined,
            orderBy: { createdAt: 'desc' },
        });
    }
    getInvoice(id) {
        return this.prisma.cloudInvoice.findUnique({ where: { id } });
    }
    async processPayment(data) {
        const invoice = await this.prisma.cloudInvoice.findUnique({ where: { id: data.invoiceId } });
        if (!invoice)
            throw new common_1.NotFoundException('Invoice not found');
        return this.prisma.cloudInvoice.update({
            where: { id: data.invoiceId },
            data: { status: 'PAID', paidAt: new Date(), provider: data.provider },
        });
    }
    listPlans() {
        return this.prisma.cloudPlan.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });
    }
    createPlan(data) {
        return this.prisma.cloudPlan.create({ data: data });
    }
    updatePlan(id, data) {
        return this.prisma.cloudPlan.update({ where: { id }, data: data });
    }
    deletePlan(id) {
        return this.prisma.cloudPlan.delete({ where: { id } });
    }
    createReferral(userId) {
        return { code: `ref-${userId.slice(0, 8)}`, url: `https://voidcloud.cc.cd/register?ref=${userId}` };
    }
    referralStats(userId) {
        return { userId, signups: 0, commissions: 0, pendingPayout: 0 };
    }
    requestPayout(userId) {
        return { success: true, userId, status: 'pending' };
    }
};
exports.BillingService = BillingService;
exports.BillingService = BillingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], BillingService);
//# sourceMappingURL=billing.service.js.map