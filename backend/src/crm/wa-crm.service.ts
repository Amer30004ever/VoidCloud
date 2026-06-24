import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface WaCrmConfig {
  enabled: boolean;
  frontendUrl: string;
  apiUrl: string;
  features: string[];
}

@Injectable()
export class WaCrmService {
  constructor(private config: ConfigService) {}

  getConfig(): WaCrmConfig {
    const frontendUrl =
      this.config.get<string>('WA_CRM_FRONTEND_URL') ??
      this.config.get<string>('CRM_FRONTEND_URL') ??
      '';
    const apiUrl =
      this.config.get<string>('WA_CRM_API_URL') ??
      this.config.get<string>('CRM_API_URL') ??
      '';
    return {
      enabled: Boolean(frontendUrl),
      frontendUrl,
      apiUrl,
      features: [
        'inbox',
        'leads',
        'deals',
        'contacts',
        'companies',
        'tasks',
        'whatsapp-webhook',
      ],
    };
  }
}
