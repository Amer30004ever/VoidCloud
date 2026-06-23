/* eslint-disable @typescript-eslint/no-explicit-any */
import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { randomBytes } from 'crypto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

// In-memory stubs — replace with Prisma models in a follow-up migration.
const cicdStore = new Map<string, any>();
const dbStore = new Map<string, any>();
const lbStore = new Map<string, any>();

function defaultCicd(vpsId: string) {
  return {
    vpsId,
    githubRepo: null as string | null,
    githubBranch: 'main',
    autoDeployOnPush: false,
    prPreview: false,
    gitlabRepo: null as string | null,
    gitlabToken: null as string | null,
    gitlabBranch: 'main',
    gitlabAutoDeploy: false,
    webhookToken: randomBytes(16).toString('hex'),
    webhookSecret: randomBytes(24).toString('hex'),
    updatedAt: new Date().toISOString(),
  };
}

@ApiTags('cloud-cicd')
@UseGuards(JwtAuthGuard)
@Controller('cloud/vps/:vpsId/cicd')
export class CloudVpsCicdController {
  @Get()
  get(@Param('vpsId') vpsId: string) {
    if (!cicdStore.has(vpsId)) cicdStore.set(vpsId, defaultCicd(vpsId));
    return cicdStore.get(vpsId);
  }

  @Put()
  update(@Param('vpsId') vpsId: string, @Body() body: any) {
    const cur = cicdStore.get(vpsId) ?? defaultCicd(vpsId);
    const next = { ...cur, ...body, vpsId, updatedAt: new Date().toISOString() };
    cicdStore.set(vpsId, next);
    return next;
  }

  @Post('webhook/regenerate')
  regen(@Param('vpsId') vpsId: string) {
    const cur = cicdStore.get(vpsId) ?? defaultCicd(vpsId);
    const next = {
      ...cur,
      webhookToken: randomBytes(16).toString('hex'),
      webhookSecret: randomBytes(24).toString('hex'),
      updatedAt: new Date().toISOString(),
    };
    cicdStore.set(vpsId, next);
    return next;
  }
}

@ApiTags('cloud-databases')
@UseGuards(JwtAuthGuard)
@Controller('cloud/databases')
export class CloudDatabasesController {
  @Get('plans')
  plans() {
    return [
      { id: 'pg-1', engine: 'POSTGRES', name: 'PostgreSQL Starter', ramMB: 1024, storageGB: 10, priceUSD: 10 },
      { id: 'mysql-1', engine: 'MYSQL', name: 'MySQL Starter', ramMB: 1024, storageGB: 10, priceUSD: 10 },
      { id: 'redis-1', engine: 'REDIS', name: 'Redis Cache', ramMB: 512, storageGB: 1, priceUSD: 5 },
    ];
  }

  @Get()
  list() {
    return Array.from(dbStore.values());
  }

  @Get(':id')
  one(@Param('id') id: string) {
    return dbStore.get(id) ?? null;
  }

  @Post()
  create(@Body() body: { name: string; engine: 'POSTGRES' | 'MYSQL' | 'REDIS'; planId: string; pitr?: boolean }) {
    const id = randomBytes(8).toString('hex');
    const password = randomBytes(16).toString('hex');
    const port = body.engine === 'POSTGRES' ? 5432 : body.engine === 'MYSQL' ? 3306 : 6379;
    const host = `${id}.db.amercloud.internal`;
    const connectionString =
      body.engine === 'POSTGRES'
        ? `postgresql://amer:${password}@${host}:${port}/main`
        : body.engine === 'MYSQL'
        ? `mysql://amer:${password}@${host}:${port}/main`
        : `redis://:${password}@${host}:${port}`;
    const db = {
      id,
      name: body.name,
      engine: body.engine,
      planId: body.planId,
      host,
      port,
      username: 'amer',
      password,
      connectionString,
      status: 'PROVISIONING',
      pitrEnabled: !!body.pitr,
      backupsEnabled: true,
      readReplicas: 0,
      createdAt: new Date().toISOString(),
    };
    dbStore.set(id, db);
    setTimeout(() => {
      const cur = dbStore.get(id);
      if (cur) dbStore.set(id, { ...cur, status: 'RUNNING' });
    }, 1500);
    return db;
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: any) {
    const cur = dbStore.get(id);
    if (!cur) return null;
    const next = { ...cur, ...body, id };
    dbStore.set(id, next);
    return next;
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    dbStore.delete(id);
    return { ok: true };
  }

  @Get(':id/backups')
  backups(@Param('id') id: string) {
    return [
      { id: 'bk1', dbId: id, createdAt: new Date(Date.now() - 86400000).toISOString(), sizeMB: 120, status: 'COMPLETED' },
      { id: 'bk2', dbId: id, createdAt: new Date(Date.now() - 2 * 86400000).toISOString(), sizeMB: 118, status: 'COMPLETED' },
    ];
  }
}

@ApiTags('cloud-loadbalancer')
@UseGuards(JwtAuthGuard)
@Controller('cloud/load-balancers')
export class CloudLoadBalancerController {
  @Get()
  list() {
    return Array.from(lbStore.values());
  }

  @Post()
  create(@Body() body: { name: string; algorithm: 'ROUND_ROBIN' | 'LEAST_CONN'; backends: string[] }) {
    const id = randomBytes(8).toString('hex');
    const lb = {
      id,
      name: body.name,
      algorithm: body.algorithm,
      backends: body.backends ?? [],
      publicIp: `10.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 200)}`,
      status: 'ACTIVE',
      priceUSD: 5,
      createdAt: new Date().toISOString(),
    };
    lbStore.set(id, lb);
    return lb;
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: any) {
    const cur = lbStore.get(id);
    if (!cur) return null;
    const next = { ...cur, ...body, id };
    lbStore.set(id, next);
    return next;
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    lbStore.delete(id);
    return { ok: true };
  }
}

@ApiTags('cloud-vps-clone')
@UseGuards(JwtAuthGuard)
@Controller('cloud/vps/:vpsId/clone')
export class CloudVpsCloneController {
  @Post()
  clone(@Param('vpsId') vpsId: string, @Body() body: { suffix?: string; syncData?: boolean }) {
    // Stub: returns a pretend clone job. Real implementation would invoke ProxmoxService.
    return {
      jobId: randomBytes(8).toString('hex'),
      sourceVpsId: vpsId,
      newVpsName: `clone-${body.suffix ?? 'staging'}`,
      syncData: !!body.syncData,
      status: 'QUEUED',
      message: 'Clone queued. New VPS will appear in your list shortly.',
    };
  }
}
