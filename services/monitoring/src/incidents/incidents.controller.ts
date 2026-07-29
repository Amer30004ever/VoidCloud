import { Controller, Get, Post, Body, Param, UseGuards, Query, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Role } from '@prisma/client';

type IncidentSeverity = 'DEGRADED' | 'PARTIAL_OUTAGE' | 'MAJOR_OUTAGE';
type IncidentStatus = 'INVESTIGATING' | 'IDENTIFIED' | 'MONITORING' | 'RESOLVED';

@Controller('monitoring/incidents')
@ApiTags('Incidents')
@ApiBearerAuth()
export class IncidentsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('public')
  async publicIncidents() {
    const incidents = await this.prisma.incident.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { updates: { orderBy: { createdAt: 'desc' } } },
    });
    const open = incidents.filter((i) => i.status !== 'RESOLVED');
    const overall = this.deriveOverallStatus(open);
    return { overall, incidents };
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  async list(@Query('status') status?: string) {
    const where = status ? { status: status as IncidentStatus } : {};
    return this.prisma.incident.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { updates: { orderBy: { createdAt: 'desc' } } },
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @Post()
  async create(@CurrentUser() user: { id: string }, @Body() body: { title: string; description: string; severity: IncidentSeverity; status?: IncidentStatus }) {
    const incident = await this.prisma.incident.create({
      data: {
        title: body.title,
        description: body.description,
        severity: body.severity,
        status: body.status || 'INVESTIGATING',
        updates: {
          create: {
            message: body.description,
            status: body.status || 'INVESTIGATING',
          },
        },
      },
      include: { updates: true },
    });

    const createDetails: Record<string, unknown> = { title: incident.title, severity: incident.severity };
    if (user.impersonatedBy) createDetails.impersonatedBy = user.impersonatedBy;

    await this.prisma.auditLog.create({
      data: {
        action: 'INCIDENT_CREATED',
        adminId: user.id,
        resource: incident.id,
        details: createDetails as any,
      } as any,
    });

    return incident;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @Post(':id/updates')
  async addUpdate(@CurrentUser() user: { id: string; impersonatedBy?: string }, @Param('id') id: string, @Body() body: { message: string; status: IncidentStatus }) {
    const incident = await this.prisma.incident.findUnique({ where: { id } });
    if (!incident) throw new BadRequestException('Incident not found');

    const update = await this.prisma.incidentUpdate.create({
      data: {
        incidentId: id,
        message: body.message,
        status: body.status,
      },
    });

    if (body.status === 'RESOLVED') {
      await this.prisma.incident.update({
        where: { id },
        data: { status: 'RESOLVED', resolvedAt: new Date() },
      });
    } else {
      await this.prisma.incident.update({
        where: { id },
        data: { status: body.status },
      });
    }

    const updateDetails: Record<string, unknown> = { status: body.status, message: body.message.slice(0, 200) };
    if (user.impersonatedBy) updateDetails.impersonatedBy = user.impersonatedBy;

    await this.prisma.auditLog.create({
      data: {
        action: 'INCIDENT_UPDATED',
        adminId: user.id,
        resource: id,
        details: updateDetails as any,
      } as any,
    });

    return update;
  }

  private deriveOverallStatus(open: any[]): string {
    if (!open.length) return 'OPERATIONAL';
    if (open.some((i) => i.severity === 'MAJOR_OUTAGE')) return 'MAJOR_OUTAGE';
    if (open.some((i) => i.severity === 'PARTIAL_OUTAGE')) return 'PARTIAL_OUTAGE';
    return 'DEGRADED';
  }
}
