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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClusterController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const cluster_service_1 = require("./cluster.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const common_2 = require("@nestjs/common");
let ClusterController = class ClusterController {
    constructor(clusterService) {
        this.clusterService = clusterService;
    }
    async getNodes() {
        return this.clusterService.getNodes();
    }
    async getNodeDetails(name) {
        return this.clusterService.getNodeDetails(name);
    }
    async getNodePods(nodeName) {
        return this.clusterService.getNodePods(nodeName);
    }
    async getQuotas() {
        return this.clusterService.getQuotas();
    }
    async setQuota(quotaData) {
        return this.clusterService.setQuota(quotaData);
    }
    async getNetworkPolicies() {
        return this.clusterService.getNetworkPolicies();
    }
    async createNetworkPolicy(policyData) {
        return this.clusterService.createNetworkPolicy(policyData);
    }
    async getStorageClasses() {
        return this.clusterService.getStorageClasses();
    }
    async getPersistentVolumes() {
        return this.clusterService.getPersistentVolumes();
    }
    async getPersistentVolumeClaims() {
        return this.clusterService.getPersistentVolumeClaims();
    }
    async getEvents(namespace, type, limit) {
        return this.clusterService.getEvents(namespace, type, limit ? parseInt(limit) : 50);
    }
    async getHelmReleases() {
        return this.clusterService.getHelmReleases();
    }
    async installHelmRelease(releaseData) {
        return this.clusterService.installHelmRelease(releaseData);
    }
    async uninstallHelmRelease(name, namespace) {
        return this.clusterService.uninstallHelmRelease(name, namespace);
    }
    async drainNode(nodeName) {
        return this.clusterService.drainNode(nodeName);
    }
    async uncordonNode(nodeName) {
        return this.clusterService.uncordonNode(nodeName);
    }
};
exports.ClusterController = ClusterController;
__decorate([
    (0, common_1.Get)('nodes'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all cluster nodes with detailed metrics' }),
    (0, swagger_1.ApiOkResponse)({
        description: 'Returns cluster nodes with CPU, memory, disk metrics',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ClusterController.prototype, "getNodes", null);
__decorate([
    (0, common_1.Get)('nodes/:name'),
    (0, swagger_1.ApiOperation)({ summary: 'Get details for a specific node' }),
    __param(0, (0, common_1.Param)('name')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ClusterController.prototype, "getNodeDetails", null);
__decorate([
    (0, common_1.Get)('pods/:node'),
    (0, swagger_1.ApiOperation)({ summary: 'Get pods running on a specific node' }),
    __param(0, (0, common_1.Param)('node')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ClusterController.prototype, "getNodePods", null);
__decorate([
    (0, common_1.Get)('quotas'),
    (0, swagger_1.ApiOperation)({ summary: 'Get resource quotas for all namespaces' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ClusterController.prototype, "getQuotas", null);
__decorate([
    (0, common_1.Post)('quotas'),
    (0, swagger_1.ApiOperation)({ summary: 'Create or update resource quota for a namespace' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ClusterController.prototype, "setQuota", null);
__decorate([
    (0, common_1.Get)('network-policies'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all network policies' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ClusterController.prototype, "getNetworkPolicies", null);
__decorate([
    (0, common_1.Post)('network-policies'),
    (0, swagger_1.ApiOperation)({ summary: 'Create network policy' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ClusterController.prototype, "createNetworkPolicy", null);
__decorate([
    (0, common_1.Get)('storage-classes'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all storage classes' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ClusterController.prototype, "getStorageClasses", null);
__decorate([
    (0, common_1.Get)('persistent-volumes'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all persistent volumes' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ClusterController.prototype, "getPersistentVolumes", null);
__decorate([
    (0, common_1.Get)('persistent-volume-claims'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all persistent volume claims' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ClusterController.prototype, "getPersistentVolumeClaims", null);
__decorate([
    (0, common_1.Get)('events'),
    (0, swagger_1.ApiOperation)({ summary: 'Get cluster events with filtering' }),
    __param(0, (0, common_1.Query)('namespace')),
    __param(1, (0, common_1.Query)('type')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], ClusterController.prototype, "getEvents", null);
__decorate([
    (0, common_1.Get)('helm-releases'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all Helm releases' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ClusterController.prototype, "getHelmReleases", null);
__decorate([
    (0, common_1.Post)('helm-releases'),
    (0, swagger_1.ApiOperation)({ summary: 'Install or upgrade Helm release' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ClusterController.prototype, "installHelmRelease", null);
__decorate([
    (0, common_1.Delete)('helm-releases/:name'),
    (0, swagger_1.ApiOperation)({ summary: 'Uninstall Helm release' }),
    __param(0, (0, common_1.Param)('name')),
    __param(1, (0, common_1.Query)('namespace')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ClusterController.prototype, "uninstallHelmRelease", null);
__decorate([
    (0, common_1.Post)('nodes/:name/drain'),
    (0, swagger_1.ApiOperation)({ summary: 'Drain a node for maintenance' }),
    __param(0, (0, common_1.Param)('name')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ClusterController.prototype, "drainNode", null);
__decorate([
    (0, common_1.Post)('nodes/:name/uncordon'),
    (0, swagger_1.ApiOperation)({ summary: 'Uncordon a node after maintenance' }),
    __param(0, (0, common_1.Param)('name')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ClusterController.prototype, "uncordonNode", null);
exports.ClusterController = ClusterController = __decorate([
    (0, swagger_1.ApiTags)('Cluster'),
    (0, common_1.Controller)('cluster'),
    (0, common_2.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [cluster_service_1.ClusterService])
], ClusterController);
//# sourceMappingURL=cluster.controller.js.map