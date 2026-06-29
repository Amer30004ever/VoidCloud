"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VpsModule = void 0;
const common_1 = require("@nestjs/common");
const vps_controller_1 = require("./vps.controller");
const vps_service_1 = require("./vps.service");
const proxmox_service_1 = require("../proxmox/proxmox.service");
let VpsModule = class VpsModule {
};
exports.VpsModule = VpsModule;
exports.VpsModule = VpsModule = __decorate([
    (0, common_1.Module)({
        controllers: [vps_controller_1.VpsController],
        providers: [vps_service_1.VpsService, proxmox_service_1.ProxmoxService],
    })
], VpsModule);
//# sourceMappingURL=vps.module.js.map