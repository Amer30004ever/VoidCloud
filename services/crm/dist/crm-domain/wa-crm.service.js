"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WaCrmService = void 0;
const common_1 = require("@nestjs/common");
let WaCrmService = class WaCrmService {
    getFeatures() {
        return [
            {
                id: 'inbox',
                name: 'WhatsApp Inbox',
                description: 'Manage WhatsApp messages and conversations',
                enabled: true,
            },
            {
                id: 'leads',
                name: 'Lead Management',
                description: 'Track and manage sales leads',
                enabled: true,
            },
            {
                id: 'deals',
                name: 'Deal Pipeline',
                description: 'Visual pipeline for sales opportunities',
                enabled: true,
            },
            {
                id: 'contacts',
                name: 'Contact Management',
                description: 'Organize customer contacts',
                enabled: true,
            },
            {
                id: 'companies',
                name: 'Company Management',
                description: 'Manage company profiles',
                enabled: true,
            },
            {
                id: 'tasks',
                name: 'Task Management',
                description: 'Assign and track tasks',
                enabled: true,
            },
            {
                id: 'whatsapp-webhook',
                name: 'WhatsApp Webhook',
                description: 'Receive WhatsApp message webhooks',
                enabled: true,
            },
        ];
    }
};
exports.WaCrmService = WaCrmService;
exports.WaCrmService = WaCrmService = __decorate([
    (0, common_1.Injectable)()
], WaCrmService);
//# sourceMappingURL=wa-crm.service.js.map