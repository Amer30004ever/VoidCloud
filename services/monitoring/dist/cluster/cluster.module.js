"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClusterModule = void 0;
const common_1 = require("@nestjs/common");
const cluster_controller_1 = require("./cluster.controller");
const cluster_service_1 = require("./cluster.service");
const kubernetes_module_1 = require("../kubernetes/kubernetes.module");
let ClusterModule = class ClusterModule {
};
exports.ClusterModule = ClusterModule;
exports.ClusterModule = ClusterModule = __decorate([
    (0, common_1.Module)({
        imports: [kubernetes_module_1.KubernetesModule],
        controllers: [cluster_controller_1.ClusterController],
        providers: [cluster_service_1.ClusterService],
        exports: [cluster_service_1.ClusterService],
    })
], ClusterModule);
//# sourceMappingURL=cluster.module.js.map