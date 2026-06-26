import { Injectable } from '@nestjs/common';

export interface CrmFeature {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

@Injectable()
export class WaCrmService {
  getFeatures(): CrmFeature[] {
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
}
