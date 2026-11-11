import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { EventPattern } from '@nestjs/microservices';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { VpsService } from './vps.service';
import { VpsProvisionService } from './vps-provision.service';
import { VpsCloneService, CloneVpsInput } from './vps-clone.service';
import { CreateVpsDto, UpdateVpsDto } from './dto/vps.dto';
import { CreateBackupScheduleDto } from '../backup/backup.dto';
import { VPS_PROVISION_QUEUE } from './rabbitmq.config';

@Controller('vps')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('VPS')
@ApiBearerAuth()
export class VpsController {
  constructor(
    private readonly vpsService: VpsService,
    private readonly vpsProvisionService: VpsProvisionService,
    private readonly vpsCloneService: VpsCloneService,
  ) {}

  @Get()
  @Roles(Role.USER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'List VPS instances' })
  @ApiResponse({ status: 200, description: 'VPS list' })
  list(@CurrentUser() user: { id: string; role: never }) {
    return this.vpsService.list(user);
  }

  @Get('quota')
  @Roles(Role.USER, Role.ADMIN, Role.SUPER_ADMIN)
  quota(@CurrentUser() user: { id: string; role: never }) {
    return this.vpsService.getQuota(user);
  }

  @Post()
  @Roles(Role.USER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a VPS instance' })
  @ApiResponse({ status: 201, description: 'VPS created' })
  create(@Body() dto: CreateVpsDto, @CurrentUser() user: { id: string; role: Role; impersonatedBy?: string }) {
    return this.vpsService.create(dto, user);
  }

  /**
   * Async provisioning entry point (Prompt 2.1). Returns a job immediately;
   * the real Proxmox provision runs in a RabbitMQ consumer. The client must
   * supply an idempotencyKey (UUID) so a retried submit does not double-provision.
   */
  @Post('provision')
  @Roles(Role.USER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Async provision a VPS' })
  @ApiResponse({ status: 201, description: 'Provisioning job enqueued' })
  provision(
    @Body() body: CreateVpsDto & { idempotencyKey: string },
    @CurrentUser() user: { id: string; role: never },
  ) {
    return this.vpsProvisionService.enqueue(body, user, body.idempotencyKey);
  }

  @Get('jobs')
  @Roles(Role.USER, Role.ADMIN, Role.SUPER_ADMIN)
  jobs(@CurrentUser() user: { id: string; role: never }) {
    return this.vpsProvisionService.listJobs(user);
  }

  @Get('jobs/:id')
  @Roles(Role.USER, Role.ADMIN, Role.SUPER_ADMIN)
  job(@Param('id') id: string, @CurrentUser() user: { id: string; role: never }) {
    return this.vpsProvisionService.getJob(id, user);
  }

  @Get(':id')
  @Roles(Role.USER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get VPS details' })
  @ApiResponse({ status: 200, description: 'VPS details' })
  get(@Param('id') id: string, @CurrentUser() user: { id: string; role: never }) {
    return this.vpsService.get(id, user);
  }

  @Put(':id')
  @Roles(Role.USER, Role.ADMIN, Role.SUPER_ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateVpsDto,
    @CurrentUser() user: { id: string; role: never },
  ) {
    return this.vpsService.update(id, dto, user);
  }

  @Post(':id/start')
  @Roles(Role.USER, Role.ADMIN, Role.SUPER_ADMIN)
  start(@Param('id') id: string, @CurrentUser() user: { id: string; role: never }) {
    return this.vpsService.start(id, user);
  }

  @Post(':id/stop')
  @Roles(Role.USER, Role.ADMIN, Role.SUPER_ADMIN)
  stop(@Param('id') id: string, @CurrentUser() user: { id: string; role: never }) {
    return this.vpsService.stop(id, user);
  }

  @Post(':id/restart')
  @Roles(Role.USER, Role.ADMIN, Role.SUPER_ADMIN)
  restart(@Param('id') id: string, @CurrentUser() user: { id: string; role: never }) {
    return this.vpsService.restart(id, user);
  }

  @Delete(':id')
  @Roles(Role.USER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete a VPS instance' })
  @ApiResponse({ status: 200, description: 'VPS deleted' })
  remove(@Param('id') id: string, @CurrentUser() user: { id: string; role: never }) {
    return this.vpsService.remove(id, user);
  }

  @Get(':id/status')
  @Roles(Role.USER, Role.ADMIN, Role.SUPER_ADMIN)
  status(@Param('id') id: string, @CurrentUser() user: { id: string; role: never }) {
    return this.vpsService.status(id, user);
  }

  @Post(':id/snapshot')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  snapshot(@Param('id') id: string, @CurrentUser() user: { id: string; role: never }) {
    return this.vpsService.snapshot(id, user);
  }

  @Get(':id/backups')
  @Roles(Role.USER, Role.ADMIN, Role.SUPER_ADMIN)
  backups(@Param('id') id: string, @CurrentUser() user: { id: string; role: never }) {
    return this.vpsService.backups(id, user);
  }

  @Get(':id/backup-schedule')
  @Roles(Role.USER, Role.ADMIN, Role.SUPER_ADMIN)
  backupSchedule(@Param('id') id: string, @CurrentUser() user: { id: string; role: never }) {
    return this.vpsService.getBackupSchedule(id, user);
  }

  @Post(':id/backup-schedule')
  @Roles(Role.USER, Role.ADMIN, Role.SUPER_ADMIN)
  createBackupSchedule(@Param('id') id: string, @Body() dto: CreateBackupScheduleDto, @CurrentUser() user: { id: string; role: never }) {
    return this.vpsService.createBackupSchedule(id, dto, user);
  }

  @Post('backups/:backupId/restore')
  @Roles(Role.USER, Role.ADMIN, Role.SUPER_ADMIN)
  restoreBackup(@Param('backupId') backupId: string, @CurrentUser() user: { id: string; role: never }) {
    return this.vpsService.restoreBackup(backupId, user);
  }

  @Put(':id/resources')
  @Roles(Role.USER, Role.ADMIN, Role.SUPER_ADMIN)
  resize(
    @Param('id') id: string,
    @Body() body: { cpu?: number; memory?: number; storage?: number; live?: boolean },
    @CurrentUser() user: { id: string; role: never },
  ) {
    const { cpu, memory, storage, live } = body ?? {};
    return this.vpsService.resize(id, { cpu, memory, storage }, user).then((vps) => ({
      ...vps,
      resizeMode: live ? 'live' : 'reboot',
    }));
  }

  @Post(':id/clone')
  @Roles(Role.USER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Clone a VPS into a staging copy or a cluster peer' })
  clone(
    @Param('id') id: string,
    @Body() body: CloneVpsInput,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.vpsCloneService.clone(id, body ?? {}, user);
  }

  @Get(':id/clones')
  @Roles(Role.USER, Role.ADMIN, Role.SUPER_ADMIN)
  clones(@Param('id') id: string, @CurrentUser() user: { id: string; role: Role }) {
    return this.vpsCloneService.listClones(id, user);
  }

  @Get(':id/console')
  @Roles(Role.USER, Role.ADMIN, Role.SUPER_ADMIN)
  console(@Param('id') id: string, @CurrentUser() user: { id: string; role: never }) {
    return this.vpsService.console(id, user);
  }

  @Post(':id/clone')
  @Roles(Role.USER, Role.ADMIN, Role.SUPER_ADMIN)
  clone(
    @Param('id') id: string,
    @Body() body: { name: string },
    @CurrentUser() user: { id: string; role: never },
  ) {
    return this.vpsService.clone(id, body.name, user);
  }

  @Get(':id/domains')
  @Roles(Role.USER, Role.ADMIN, Role.SUPER_ADMIN)
  listDomains(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: never },
  ) {
    return this.vpsService.listDomains(id, user);
  }

  @Post(':id/domains')
  @Roles(Role.USER, Role.ADMIN, Role.SUPER_ADMIN)
  addDomain(
    @Param('id') id: string,
    @Body() dto: { domain: string },
    @CurrentUser() user: { id: string; role: Role; impersonatedBy?: string },
  ) {
    return this.vpsService.addDomain(id, user.id, dto.domain);
  }

  @Post('domains/:domainId/verify')
  @Roles(Role.USER, Role.ADMIN, Role.SUPER_ADMIN)
  verifyDomain(
    @Param('domainId') domainId: string,
    @Body() dto: { dnsValue: string },
    @CurrentUser() user: { id: string; role: never },
  ) {
    return this.vpsService.verifyDomain(domainId, dto.dnsValue);
  }

  // ── Admin quota management (Prompt 2.2) ──────────────────────────────

  @Get('admin/quota/:tenantId')
  @Roles(Role.SUPER_ADMIN)
  adminQuota(@Param('tenantId') tenantId: string) {
    return this.vpsService.adminGetQuota(tenantId);
  }

  @Patch('admin/quota/:tenantId')
  @Roles(Role.SUPER_ADMIN)
  adminSetQuota(
    @Param('tenantId') tenantId: string,
    @Body() body: { maxCpu?: number; maxRamMb?: number; maxDiskGb?: number; maxVpsCount?: number },
  ) {
    return this.vpsService.adminSetQuota(tenantId, body);
  }

  @Get('admin/reconcile')
  @Roles(Role.SUPER_ADMIN)
  async adminReconcile() {
    return this.vpsService.reconcileAllQuotas();
  }

  /**
   * RabbitMQ consumer handler for async provisioning (Prompt 2.1).
   * The broker delivers { jobId } here; the worker runs the real Proxmox
   * provisioning and updates the job row. Best-effort ack (no rethrow) so a
   * transient failure records FAILED on the job rather than poisoning the queue.
    */
  @EventPattern(VPS_PROVISION_QUEUE)
  async onProvisionJob(msg: { jobId: string }) {
    if (msg?.jobId) {
      await this.vpsProvisionService.processJob(msg.jobId);
    }
  }

  @Get(':vpsId/apps/:appId/status')
  @Roles(Role.USER, Role.ADMIN, Role.SUPER_ADMIN)
  appStatus(@Param('vpsId') vpsId: string, @Param('appId') appId: string, @CurrentUser() user: { id: string; role: Role; impersonatedBy?: string }) {
    return this.vpsService.getAppStatus(vpsId, user, appId);
  }

  @Get('apps/catalog')
  catalog() {
    return this.vpsService.appCatalog();
  }

  @Post(':vpsId/apps/:appId/install')
  @Roles(Role.USER, Role.ADMIN, Role.SUPER_ADMIN)
  installApp(@Param('vpsId') vpsId: string, @Param('appId') appId: string, @CurrentUser() user: { id: string; role: Role; impersonatedBy?: string }) {
    return this.vpsService.installApp(vpsId, user, appId);
  }

  @Delete(':vpsId/apps/:appId')
  @Roles(Role.USER, Role.ADMIN, Role.SUPER_ADMIN)
  uninstallApp(@Param('vpsId') vpsId: string, @Param('appId') appId: string, @CurrentUser() user: { id: string; role: Role; impersonatedBy?: string }) {
    return this.vpsService.uninstallApp(vpsId, user, appId);
  }
}

