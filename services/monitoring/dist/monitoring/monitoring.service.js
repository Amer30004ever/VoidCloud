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
exports.MonitoringService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let MonitoringService = class MonitoringService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    clusterNodes() {
        return {
            nodes: [
                { name: 'masternode01', role: 'control-plane', cpu: 4, memoryGB: 4 },
                { name: 'workernode01', role: 'worker', cpu: 8, memoryGB: 24 },
            ],
        };
    }
    clusterPods() {
        return { pods: [], note: 'Connect in-cluster K8s API for live pod metrics' };
    }
    namespaces() {
        return { namespaces: ['voidcloud', 'kube-system', 'traefik'] };
    }
    metrics() {
        return { uptime: process.uptime(), timestamp: new Date().toISOString() };
    }
    alerts() {
        return this.prisma.alert.findMany({ take: 50, orderBy: { createdAt: 'desc' } });
    }
    createAlert(data) {
        return this.prisma.alert.create({ data: data });
    }
};
exports.MonitoringService = MonitoringService;
exports.MonitoringService = MonitoringService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MonitoringService);
//# sourceMappingURL=monitoring.service.js.map