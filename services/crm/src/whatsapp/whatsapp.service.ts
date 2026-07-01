import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../prisma/prisma.service';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class WhatsappService {
  private readonly openwaUrl = process.env.OPENWA_URL || 'http://openwa-service.voidcloud.svc.cluster.local:2785';
  private readonly apiKey = process.env.OPENWA_API_KEY || 'dev-admin-key';

  constructor(
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
  ) {}

  async sendMessage(phone: string, message: string, userId: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.openwaUrl}/api/sendText`,
          {
            chatId: `${phone}@c.us`,
            text: message,
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.apiKey}`,
            },
          },
        ),
      );

      // Store message in database
      const contact = await this.getOrCreateContact(phone, userId);
      await this.prisma.whatsappMessage.create({
        data: {
          contactId: contact.id,
          waMessageId: response.data?.id || '',
          direction: 'outbound',
          content: message,
          type: 'text',
          status: 'sent',
          timestamp: new Date(),
        },
      });

      return { success: true, messageId: response.data?.id };
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      throw new HttpException(
        'Failed to send WhatsApp message',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getMessages(phone: string, userId: string) {
    const contact = await this.prisma.whatsappContact.findFirst({
      where: {
        phone,
        userId,
      },
      include: {
        messages: {
          orderBy: { timestamp: 'desc' },
        },
      },
    });

    if (!contact) {
      return [];
    }

    return contact.messages;
  }

  async getContacts(userId: string) {
    return this.prisma.whatsappContact.findMany({
      where: { userId },
      include: {
        messages: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async syncContact(phone: string, name: string, userId: string) {
    const contact = await this.getOrCreateContact(phone, userId);
    
    if (name && contact.name !== name) {
      await this.prisma.whatsappContact.update({
        where: { id: contact.id },
        data: { name },
      });
    }

    // Sync with CRM contact if not linked
    if (!contact.crmContactId) {
      const crmContact = await this.prisma.crmContact.create({
        data: {
          userId,
          name: name || phone,
          phone,
        },
      });

      await this.prisma.whatsappContact.update({
        where: { id: contact.id },
        data: { crmContactId: crmContact.id },
      });
    }

    return contact;
  }

  async handleWebhook(event: any) {
    const { event: eventType, data } = event;

    if (eventType === 'message') {
      const { from, to, body, id, timestamp, type } = data;
      
      // Extract phone number from WhatsApp ID
      const phone = from.replace('@c.us', '');
      
      // Get or create contact
      const contact = await this.prisma.whatsappContact.findFirst({
        where: { waId: from },
      });

      if (!contact) {
        // Create new contact - will need userId from context or default
        // For now, we'll skip if no user context
        return { success: false, error: 'No user context' };
      }

      // Store incoming message
      await this.prisma.whatsappMessage.create({
        data: {
          contactId: contact.id,
          waMessageId: id,
          direction: 'inbound',
          content: body,
          type: type || 'text',
          status: 'delivered',
          timestamp: new Date(timestamp * 1000),
        },
      });

      // Create CRM activity if linked
      if (contact.crmContactId) {
        await this.prisma.crmActivity.create({
          data: {
            userId: contact.userId,
            type: 'whatsapp_message',
            description: `Received WhatsApp message: ${body?.substring(0, 100)}`,
          },
        });
      }

      return { success: true };
    }

    return { success: true, message: 'Event processed' };
  }

  private async getOrCreateContact(phone: string, userId: string) {
    let contact = await this.prisma.whatsappContact.findFirst({
      where: {
        phone,
        userId,
      },
    });

    if (!contact) {
      contact = await this.prisma.whatsappContact.create({
        data: {
          userId,
          phone,
          waId: `${phone}@c.us`,
        },
      });
    }

    return contact;
  }

  async getOpenwaStatus() {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.openwaUrl}/api/status`, {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
          },
        }),
      );
      return response.data;
    } catch (error) {
      throw new HttpException(
        'Failed to get OpenWA status',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
