import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTemplateDto, SendBroadcastDto } from './dto/create-template.dto';

const BROADCAST_QUEUE = 'whatsapp.broadcast';

function rabbitUrl(): string {
  const host = process.env.RABBITMQ_HOST ?? 'rabbitmq';
  const port = Number(process.env.RABBITMQ_PORT ?? 5672);
  const user = process.env.RABBITMQ_USER ?? 'guest';
  const pass = process.env.RABBITMQ_PASSWORD ?? 'guest';
  return `amqp://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}:${port}`;
}

@Injectable()
export class WhatsappBroadcastService {
  private readonly logger = new Logger(WhatsappBroadcastService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createTemplate(userId: string, dto: CreateTemplateDto) {
    return this.prisma.whatsappTemplate.create({
      data: {
        name: dto.name,
        body: dto.body,
        createdBy: userId,
        tenantId: dto.tenantId || null,
      },
    });
  }

  async listTemplates(userId: string, tenantId?: string) {
    return this.prisma.whatsappTemplate.findMany({
      where: { OR: [{ createdBy: userId }, tenantId ? { tenantId } : { createdBy: userId }] },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateTemplate(id: string, userId: string, dto: CreateTemplateDto) {
    const existing = await this.prisma.whatsappTemplate.findFirst({ where: { id, createdBy: userId } });
    if (!existing) throw new BadRequestException('Template not found');
    return this.prisma.whatsappTemplate.update({
      where: { id },
      data: { name: dto.name, body: dto.body },
    });
  }

  async deleteTemplate(id: string, userId: string) {
    const existing = await this.prisma.whatsappTemplate.findFirst({ where: { id, createdBy: userId } });
    if (!existing) throw new BadRequestException('Template not found');
    await this.prisma.whatsappTemplate.delete({ where: { id } });
    return { success: true };
  }

  async sendBroadcast(userId: string, tenantId: string | undefined, dto: SendBroadcastDto) {
    const template = await this.prisma.whatsappTemplate.findFirst({ where: { id: dto.templateId } });
    if (!template) throw new BadRequestException('Template not found');

    const broadcast = await this.prisma.whatsappBroadcast.create({
      data: {
        createdBy: userId,
        tenantId: tenantId || null,
        templateId: template.id,
        templateName: template.name,
        messageBody: template.body,
        segment: dto.segment || 'all',
        status: 'PENDING',
        metadata: {
          recipientPhones: dto.recipientPhones || [],
          planId: dto.planId || null,
          activeWithinDays: dto.activeWithinDays || null,
          signupAfter: dto.signupAfter || null,
          signupBefore: dto.signupBefore || null,
        },
      },
    });

    const phones = await this.resolveRecipients(dto);

    if (phones.length > 0) {
      await this.prisma.whatsappBroadcastRecipient.createMany({
        data: phones.map((phone) => ({
          broadcastId: broadcast.id,
          phone,
          status: 'PENDING',
        })),
      });
    }

    const recipients = await this.prisma.whatsappBroadcastRecipient.findMany({
      where: { broadcastId: broadcast.id },
    });

    const publisher = ClientProxyFactory.create({
      transport: Transport.RMQ,
      options: {
        urls: [rabbitUrl()],
        queue: BROADCAST_QUEUE,
        queueOptions: { durable: true },
      },
    });

    try {
      await publisher.connect();
      await publisher.emit(BROADCAST_QUEUE, {
        broadcastId: broadcast.id,
        templateBody: template.body,
        recipients: recipients.map((r) => ({ id: r.id, phone: r.phone, name: r.name })),
      });
    } catch (err) {
      this.logger.error(`Failed to publish broadcast job: ${err instanceof Error ? err.message : String(err)}`);
      await this.prisma.whatsappBroadcast.update({
        where: { id: broadcast.id },
        data: { status: 'FAILED' },
      });
      throw new BadRequestException('Failed to queue broadcast');
    } finally {
      publisher.close();
    }

    return broadcast;
  }

  private async resolveRecipients(dto: SendBroadcastDto): Promise<string[]> {
    if (dto.recipientPhones && dto.recipientPhones.length > 0) {
      return dto.recipientPhones;
    }

    const where: any = {};

    if (dto.planId) {
      where.cloudPlanId = dto.planId;
    }
    if (dto.signupAfter || dto.signupBefore) {
      where.createdAt = {};
      if (dto.signupAfter) where.createdAt.gte = new Date(dto.signupAfter);
      if (dto.signupBefore) where.createdAt.lte = new Date(dto.signupBefore);
    }
    if (dto.activeWithinDays) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - dto.activeWithinDays);
      where.lastLoginAt = { gte: cutoff };
    }

    const users = await this.prisma.user.findMany({
      where,
      include: { whatsappContacts: true },
    });

    const phones = new Set<string>();
    for (const user of users) {
      for (const contact of user.whatsappContacts) {
        if (contact.phone) {
          phones.add(contact.phone);
        }
      }
    }

    return Array.from(phones);
  }

  async listBroadcasts(userId: string) {
    return this.prisma.whatsappBroadcast.findMany({
      where: { createdBy: userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getBroadcast(id: string, userId: string) {
    const broadcast = await this.prisma.whatsappBroadcast.findFirst({ where: { id, createdBy: userId } });
    if (!broadcast) throw new BadRequestException('Broadcast not found');
    return broadcast;
  }

  async getRecipients(id: string, userId: string) {
    const broadcast = await this.prisma.whatsappBroadcast.findFirst({ where: { id, createdBy: userId } });
    if (!broadcast) throw new BadRequestException('Broadcast not found');
    return this.prisma.whatsappBroadcastRecipient.findMany({
      where: { broadcastId: id },
      orderBy: { createdAt: 'desc' },
    });
  }
}
