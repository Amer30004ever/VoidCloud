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
exports.AnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let AnalyticsService = class AnalyticsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async usage() {
        const [vpsCount, users, conversations] = await Promise.all([
            this.prisma.cloudDeployment.count(),
            this.prisma.user.count(),
            this.prisma.conversation.count(),
        ]);
        return { vpsCount, users, conversations };
    }
    async revenue() {
        const paid = await this.prisma.cloudInvoice.aggregate({
            _sum: { amountUSD: true },
            where: { status: 'PAID' },
        });
        return { totalUSD: paid._sum.amountUSD ?? 0 };
    }
    async forecast() {
        const revenue = await this.revenue();
        return {
            nextMonthUSD: (revenue.totalUSD ?? 0) * 1.08,
            confidence: 0.75,
        };
    }
    vpsUsage() {
        return this.prisma.cloudDeployment.groupBy({
            by: ['status'],
            _count: { _all: true },
        });
    }
    whatsappUsage() {
        return this.prisma.message.groupBy({
            by: ['direction'],
            _count: { _all: true },
        });
    }
    async exportCsv() {
        const usage = await this.usage();
        const revenue = await this.revenue();
        return {
            csv: `metric,value\nvps,${usage.vpsCount}\nusers,${usage.users}\nrevenue,${revenue.totalUSD}`,
        };
    }
};
exports.AnalyticsService = AnalyticsService;
exports.AnalyticsService = AnalyticsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AnalyticsService);
//# sourceMappingURL=analytics.service.js.map