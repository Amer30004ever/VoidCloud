import {
  Body,
  Controller,
  Delete,
  Get,
  MessageEvent,
  Param,
  Patch,
  Post,
  Req,
  Sse,
  UseGuards,
} from '@nestjs/common';
import type { Observable } from 'rxjs';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { ManagedDatabaseService, ManagedEngine } from './managed-database.service';


@Controller('managed/databases')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('Managed Databases')
@ApiBearerAuth()
export class ManagedDatabaseController {
  constructor(private readonly databases: ManagedDatabaseService) {}

  @Get('plans')
  @ApiOperation({ summary: 'List managed database plans' })
  plans() {
    return this.databases.plans();
  }

  @Get()
  @ApiOperation({ summary: 'List the caller managed database instances' })
  list(@Req() req: any) {
    return this.databases.list(req.user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Provision a managed database instance' })
  create(
    @Req() req: any,
    @Body()
    body: {
      name: string;
      engine: ManagedEngine;
      planCode: string;
      version?: string;
      organizationId?: string;
      backupsEnabled?: boolean;
    },
  ) {
    return this.databases.create(req.user.id, body);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one managed database instance' })
  get(@Req() req: any, @Param('id') id: string) {
    return this.databases.get(req.user.id, id);
  }

  @Get(':id/events')
  @ApiOperation({
    summary: 'Provisioning timeline (status transitions) for one instance',
  })
  events(@Req() req: any, @Param('id') id: string) {
    return this.databases.events(req.user.id, id);
  }

  @Sse(':id/events/stream')
  @ApiOperation({
    summary: 'Live provisioning timeline (Server-Sent Events)',
  })
  eventStream(@Req() req: any, @Param('id') id: string): Observable<MessageEvent> {
    // Same ownership + audit path as the polled endpoint; the stream simply
    // pushes each change instead of waiting for the client to ask again.
    return this.databases.eventStream(req.user.id, id) as Observable<MessageEvent>;
  }


  @Get(':id/connection')
  @ApiOperation({ summary: 'Reveal the connection string (owner only)' })
  connection(@Req() req: any, @Param('id') id: string) {
    return this.databases.connectionString(req.user.id, id);
  }


  @Post(':id/start')
  start(@Req() req: any, @Param('id') id: string) {
    return this.databases.setPower(req.user.id, id, 'start');
  }

  @Post(':id/stop')
  stop(@Req() req: any, @Param('id') id: string) {
    return this.databases.setPower(req.user.id, id, 'stop');
  }

  @Patch(':id/plan')
  @ApiOperation({ summary: 'Resize the instance to another plan' })
  resize(@Req() req: any, @Param('id') id: string, @Body() body: { planCode: string }) {
    return this.databases.resize(req.user.id, id, body.planCode);
  }

  @Post(':id/backups')
  @ApiOperation({ summary: 'Trigger an on-demand backup' })
  backup(@Req() req: any, @Param('id') id: string) {
    return this.databases.createBackup(req.user.id, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Destroy a managed database instance' })
  destroy(@Req() req: any, @Param('id') id: string) {
    return this.databases.destroy(req.user.id, id);
  }
}
