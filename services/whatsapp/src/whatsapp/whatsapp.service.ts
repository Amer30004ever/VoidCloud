import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

interface WhatsAppMessage {
  to: string;
  text: string;
  type?: 'text';
}

interface WhatsAppTemplateMessage {
  to: string;
  template: {
    name: string;
    language: { code: string };
  };
}

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly apiVersion = 'v18.0';
  private readonly baseUrl: string;
  private readonly phoneNumberId: string;
  private readonly accessToken: string;
  private readonly verifyToken: string;
  private readonly supportNumber: string;

  constructor(private configService: ConfigService) {
    this.phoneNumberId = this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID') || '1251629638023277';
    this.accessToken = this.configService.get<string>('WHATSAPP_ACCESS_TOKEN') || '';
    this.verifyToken = this.configService.get<string>('WHATSAPP_VERIFY_TOKEN') || 'voidcloud_secure_2026';
    this.supportNumber = this.configService.get<string>('WHATSAPP_SUPPORT_NUMBER') || '201061365444';
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}`;
  }

  /**
   * Verify webhook from Meta
   */
  verifyWebhook(mode: string, token: string, challenge: string): string | null {
    if (mode === 'subscribe' && token === this.verifyToken) {
      this.logger.log('Webhook verified successfully');
      return challenge;
    }
    this.logger.warn('Webhook verification failed');
    return null;
  }

  /**
   * Send text message via WhatsApp API
   */
  async sendTextMessage(to: string, text: string): Promise<any> {
    try {
      const url = `${this.baseUrl}/${this.phoneNumberId}/messages`;
      const response = await axios.post(
        url,
        {
          messaging_product: 'whatsapp',
          to: this.formatPhoneNumber(to),
          type: 'text',
          text: { body: text },
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      this.logger.log(`Message sent to ${to}: ${text.substring(0, 50)}...`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to send message: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send template message
   */
  async sendTemplateMessage(to: string, templateName: string, languageCode: string = 'en_US'): Promise<any> {
    try {
      const url = `${this.baseUrl}/${this.phoneNumberId}/messages`;
      const response = await axios.post(
        url,
        {
          messaging_product: 'whatsapp',
          to: this.formatPhoneNumber(to),
          type: 'template',
          template: {
            name: templateName,
            language: { code: languageCode },
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      this.logger.log(`Template message sent to ${to}: ${templateName}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to send template message: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get auto-reply based on message content and business hours
   */
  getAutoReply(message: string): string {
    const lowerMessage = message.toLowerCase();
    const now = new Date();
    const cairoTime = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Cairo' }));
    const hour = cairoTime.getHours();
    const day = cairoTime.getDay();

    // Check business hours: 9AM - 6PM Cairo time, Monday - Sunday
    const isBusinessHours = hour >= 9 && hour < 18;

    // Keyword-based routing
    if (lowerMessage.includes('subscribe') || lowerMessage.includes('subscription') || lowerMessage.includes('plan') || lowerMessage.includes('pricing')) {
      return "Interested in our VPS hosting? Let me help you find the perfect plan! 🚀\n\nWe offer:\n- Starter: $5/month\n- Pro: $15/month\n- Business: $30/month\n\nWould you like more details about any plan?";
    }

    if (lowerMessage.includes('support') || lowerMessage.includes('help') || lowerMessage.includes('issue') || lowerMessage.includes('problem')) {
      return "I'll connect you with our technical support team right away. ⚙️\n\nOur support team is available 24/7. Please describe your issue and we'll assist you shortly.";
    }

    if (lowerMessage.includes('billing') || lowerMessage.includes('invoice') || lowerMessage.includes('payment')) {
      return "For billing inquiries, please contact our billing team. 💳\n\nYou can:\n- View invoices in your dashboard\n- Update payment methods\n- Request refunds\n\nHow can I help with your billing?";
    }

    if (lowerMessage.includes('vps') || lowerMessage.includes('server') || lowerMessage.includes('hosting')) {
      return "Welcome to Void Cloud! 🚀 How can I help you with your cloud hosting today?\n\nI can assist with:\n- Creating new VPS instances\n- Managing existing servers\n- Technical support\n- Plan upgrades";
    }

    // Default greeting
    if (!isBusinessHours) {
      return "Thank you for contacting Void Cloud! We're currently offline. We'll respond within 2 hours during business hours (9AM - 6PM Cairo time). 🌙";
    }

    return "Welcome to Void Cloud! 🚀 How can I help you with your cloud hosting today?";
  }

  /**
   * Route message to appropriate team based on keywords
   */
  routeMessage(message: string): string {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('subscribe') || lowerMessage.includes('subscription') || lowerMessage.includes('plan') || lowerMessage.includes('pricing')) {
      return 'SALES';
    }

    if (lowerMessage.includes('support') || lowerMessage.includes('help') || lowerMessage.includes('issue') || lowerMessage.includes('problem')) {
      return 'SUPPORT';
    }

    if (lowerMessage.includes('billing') || lowerMessage.includes('invoice') || lowerMessage.includes('payment')) {
      return 'BILLING';
    }

    if (lowerMessage.includes('vps') || lowerMessage.includes('server') || lowerMessage.includes('hosting')) {
      return 'TECHNICAL';
    }

    return 'GENERAL';
  }

  /**
   * Format phone number to international format
   */
  private formatPhoneNumber(phone: string): string {
    // Remove all non-numeric characters
    const cleaned = phone.replace(/\D/g, '');
    
    // If already has country code, return as is
    if (cleaned.length >= 12) {
      return cleaned;
    }
    
    // Add Egypt country code if missing
    if (cleaned.length === 10) {
      return `2${cleaned}`;
    }
    
    return cleaned;
  }

  /**
   * Get WhatsApp support number
   */
  getSupportNumber(): string {
    return this.supportNumber;
  }

  /**
   * Get formatted WhatsApp support number with + prefix
   */
  getFormattedSupportNumber(): string {
    return `+${this.supportNumber}`;
  }
}
