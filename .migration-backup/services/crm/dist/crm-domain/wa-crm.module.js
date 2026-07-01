"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WaCrmModule = void 0;
const common_1 = require("@nestjs/common");
const wa_crm_controller_1 = require("./wa-crm.controller");
const wa_crm_service_1 = require("./wa-crm.service");
const crm_controller_1 = require("./crm.controller");
const crm_service_1 = require("./crm.service");
const prisma_service_1 = require("../prisma/prisma.service");
let WaCrmModule = class WaCrmModule {
};
exports.WaCrmModule = WaCrmModule;
exports.WaCrmModule = WaCrmModule = __decorate([
    (0, common_1.Module)({
        controllers: [wa_crm_controller_1.WaCrmController, crm_controller_1.CrmController],
        providers: [wa_crm_service_1.WaCrmService, crm_service_1.CrmService, prisma_service_1.PrismaService],
        exports: [wa_crm_service_1.WaCrmService, crm_service_1.CrmService],
    })
], WaCrmModule);
//# sourceMappingURL=wa-crm.module.js.map