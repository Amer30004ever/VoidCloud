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
exports.WaCrmController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const wa_crm_service_1 = require("./wa-crm.service");
let WaCrmController = class WaCrmController {
    constructor(waCrm) {
        this.waCrm = waCrm;
    }
    getFeatures() {
        return this.waCrm.getFeatures();
    }
};
exports.WaCrmController = WaCrmController;
__decorate([
    (0, common_1.Get)('features'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], WaCrmController.prototype, "getFeatures", null);
exports.WaCrmController = WaCrmController = __decorate([
    (0, swagger_1.ApiTags)('CRM'),
    (0, common_1.Controller)('crm'),
    __metadata("design:paramtypes", [wa_crm_service_1.WaCrmService])
], WaCrmController);
//# sourceMappingURL=wa-crm.controller.js.map