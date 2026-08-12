/**
 * Tier 9 — HTTP-layer guard execution (supertest integration).
 *
 * Every Tier 9 isolation suite so far proves the *service* enforces ownership.
 * This suite proves the *transport* rejects the request before the service is
 * ever constructed into the call path:
 *
 *   - no Authorization header            -> 401, service method never invoked
 *   - authenticated but wrong role       -> 403, service method never invoked
 *   - correct role                       -> reaches the service (sanity anchor)
 *
 * Each controller is mounted in a real Nest application with its own real
 * JwtAuthGuard/RolesGuard (or ApiKeyGuard for the public API); only the
 * downstream service is replaced by a recording spy.
 */
import 'reflect-metadata';
import { Injectable } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PassportModule, PassportStrategy } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';
import { ExtractJwt, Strategy } from 'passport-jwt';
import request from 'supertest';

import { ManagedDatabaseController } from '../../services/vps/src/managed/managed-database.controller';
import { ManagedDatabaseService } from '../../services/vps/src/managed/managed-database.service';
import { ObjectStorageController } from '../../services/vps/src/managed/object-storage.controller';
import { ObjectStorageService } from '../../services/vps/src/managed/object-storage.service';
import { ManagedK8sController } from '../../services/vps/src/managed/managed-k8s.controller';
import { ManagedK8sService } from '../../services/vps/src/managed/managed-k8s.service';
import { VmImportController } from '../../services/vps/src/managed/vm-import.controller';
import { VmImportService } from '../../services/vps/src/managed/vm-import.service';
import { FloatingIpController } from '../../services/vps/src/network/floating-ip.controller';
import { FloatingIpService } from '../../services/vps/src/network/floating-ip.service';
import { PublicApiController } from '../../services/vps/src/public-api/public-api.controller';
import { VpsService } from '../../services/vps/src/vps/vps.service';
import { PrismaService } from '../../services/vps/src/prisma/prisma.service';

import { BandwidthController } from '../../services/billing/src/billing/bandwidth.controller';
import { BandwidthService } from '../../services/billing/src/billing/bandwidth.service';
import { SlaCreditController } from '../../services/billing/src/billing/sla-credit.controller';
import { SlaCreditService } from '../../services/billing/src/billing/sla-credit.service';
import { EnterpriseBillingController } from '../../services/billing/src/billing/enterprise-billing.controller';
import { ConsolidatedInvoiceService } from '../../services/billing/src/billing/consolidated-invoice.service';
import { EtaInvoiceService } from '../../services/billing/src/billing/eta-invoice.service';

import { SupportController } from '../../services/crm/src/support/support.controller';
import { SupportService } from '../../services/crm/src/support/support.service';

import { CatalogController } from '../../services/tenant/src/catalog/catalog.controller';
import { CatalogService } from '../../services/tenant/src/catalog/catalog.service';

const SECRET = 'tier9-guard-test-secret';
const jwt = new JwtService({ secret: SECRET });
const tokenFor = (role: string, id = `user-${role}`) => jwt.sign({ sub: id, id, role, email: `${id}@test.local` });

@Injectable()
class TestJwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    super({ jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), secretOrKey: SECRET });
  }
  validate(payload: any) {
    return { id: payload.id ?? payload.sub, role: payload.role, email: payload.email };
  }
}

/** A service double whose every method records the call and returns `{ ok: true }`. */
function spyService() {
  const calls: string[] = [];
  const target: any = {};
  const proxy = new Proxy(target, {
    get(_t, prop: string) {
      if (prop === '__calls') return calls;
      if (typeof prop !== 'string' || prop === 'then') return undefined;
      return (...args: any[]) => {
        calls.push(prop);
        return Promise.resolve({ ok: true, args });
      };
    },
  });
  return proxy;
}

async function mount(controller: any, tokens: Array<[any, any]>) {
  const moduleRef = await Test.createTestingModule({
    imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
    controllers: [controller],
    providers: [TestJwtStrategy, ...tokens.map(([provide, useValue]) => ({ provide, useValue }))],
  }).compile();

  const app = moduleRef.createNestApplication();
  await app.init();
  return app;
}

type Case = {
  feature: string;
  controller: any;
  service: any; // primary service token asserted "never reached"
  extraProviders?: Array<[any, any]>;
  tenantRoute: { method: 'get' | 'post'; path: string };
  adminRoute?: { method: 'get' | 'post'; path: string };
};

const CASES: Case[] = [
  {
    feature: '9.x Managed Databases',
    controller: ManagedDatabaseController,
    service: ManagedDatabaseService,
    tenantRoute: { method: 'get', path: '/managed/databases' },
  },
  {
    feature: '9.x Object Storage',
    controller: ObjectStorageController,
    service: ObjectStorageService,
    tenantRoute: { method: 'get', path: '/managed/object-storage/buckets' },
  },
  {
    feature: '9.x Managed Kubernetes',
    controller: ManagedK8sController,
    service: ManagedK8sService,
    tenantRoute: { method: 'get', path: '/managed/kubernetes/clusters' },
  },
  {
    feature: '9.x VM Import',
    controller: VmImportController,
    service: VmImportService,
    tenantRoute: { method: 'get', path: '/managed/vm-imports' },
  },
  {
    feature: '9.x Floating IPs',
    controller: FloatingIpController,
    service: FloatingIpService,
    tenantRoute: { method: 'get', path: '/floating-ips' },
    adminRoute: { method: 'get', path: '/floating-ips/pool/inventory' },
  },
  {
    feature: '9.x Bandwidth metering',
    controller: BandwidthController,
    service: BandwidthService,
    tenantRoute: { method: 'get', path: '/bandwidth/usage' },
    adminRoute: { method: 'post', path: '/bandwidth/samples' },
  },
  {
    feature: '9.x SLA credits',
    controller: SlaCreditController,
    service: SlaCreditService,
    tenantRoute: { method: 'get', path: '/sla-credits' },
    adminRoute: { method: 'post', path: '/sla-credits/run' },
  },
  {
    feature: '9.x Enterprise billing / ETA',
    controller: EnterpriseBillingController,
    service: ConsolidatedInvoiceService,
    extraProviders: [[EtaInvoiceService, spyService()]],
    tenantRoute: { method: 'get', path: '/billing/enterprise/organizations/org-1/consolidated' },
    adminRoute: { method: 'get', path: '/billing/enterprise/eta/submissions' },
  },
  {
    feature: '9.9 Support ticketing / SLA',
    controller: SupportController,
    service: SupportService,
    tenantRoute: { method: 'get', path: '/crm/support/tickets' },
    adminRoute: { method: 'post', path: '/crm/support/tickets/sla/sweep' },
  },
  {
    feature: '9.x Reseller catalog',
    controller: CatalogController,
    service: CatalogService,
    tenantRoute: { method: 'get', path: '/catalog/submissions/mine' },
    adminRoute: { method: 'get', path: '/catalog/submissions/pending' },
  },
];

describe('Tier 9 — controller guards reject before the service layer', () => {
  for (const c of CASES) {
    describe(c.feature, () => {
      let app: any;
      let svc: any;

      beforeEach(async () => {
        svc = spyService();
        app = await mount(c.controller, [[c.service, svc], ...(c.extraProviders ?? [])]);
      });

      afterEach(async () => {
        await app?.close();
      });

      it('rejects an unauthenticated request with 401 and never calls the service', async () => {
        const res = await (request(app.getHttpServer()) as any)[c.tenantRoute.method](c.tenantRoute.path);
        expect(res.status).toBe(401);
        expect(svc.__calls).toEqual([]);
      });

      it('rejects a token signed with the wrong key with 401', async () => {
        const bogus = new JwtService({ secret: 'attacker-secret' }).sign({ id: 'x', role: 'SUPER_ADMIN' });
        const res = await (request(app.getHttpServer()) as any)
          [c.tenantRoute.method](c.tenantRoute.path)
          .set('Authorization', `Bearer ${bogus}`);
        expect(res.status).toBe(401);
        expect(svc.__calls).toEqual([]);
      });

      it('lets an authenticated tenant through to the service', async () => {
        const res = await (request(app.getHttpServer()) as any)
          [c.tenantRoute.method](c.tenantRoute.path)
          .set('Authorization', `Bearer ${tokenFor('USER')}`)
          .send({});
        expect([200, 201]).toContain(res.status);
        expect(svc.__calls.length).toBeGreaterThan(0);
      });

      if (c.adminRoute) {
        it('rejects a normal USER on the admin-only route with 403 and never calls the service', async () => {
          const res = await (request(app.getHttpServer()) as any)
            [c.adminRoute!.method](c.adminRoute!.path)
            .set('Authorization', `Bearer ${tokenFor('USER')}`)
            .send({});
          expect(res.status).toBe(403);
          expect(svc.__calls).toEqual([]);
        });

        it('rejects the admin-only route without auth with 401', async () => {
          const res = await (request(app.getHttpServer()) as any)
            [c.adminRoute!.method](c.adminRoute!.path)
            .send({});
          expect(res.status).toBe(401);
          expect(svc.__calls).toEqual([]);
        });
      }
    });
  }
});

describe('9.1 Public API — ApiKeyGuard rejects before the service layer', () => {
  let app: any;
  let vps: any;
  let prisma: any;

  beforeEach(async () => {
    vps = spyService();
    prisma = {
      apiKey: {
        findFirst: jest.fn(async () => null),
        update: jest.fn(),
      },
    };
    app = await mount(PublicApiController, [
      [VpsService, vps],
      [PrismaService, prisma],
    ]);
  });

  afterEach(async () => {
    await app?.close();
  });

  it('401s with no Authorization header', async () => {
    const res = await request(app.getHttpServer()).get('/public/v1/vps');
    expect(res.status).toBe(401);
    expect(vps.__calls).toEqual([]);
    expect(prisma.apiKey.findFirst).not.toHaveBeenCalled();
  });

  it('401s on a bearer token that is not a vc_ API key (no DB lookup at all)', async () => {
    const res = await request(app.getHttpServer())
      .get('/public/v1/vps')
      .set('Authorization', `Bearer ${tokenFor('SUPER_ADMIN')}`);
    expect(res.status).toBe(401);
    expect(prisma.apiKey.findFirst).not.toHaveBeenCalled();
    expect(vps.__calls).toEqual([]);
  });

  it('401s on an unknown vc_ key and never reaches the VPS service', async () => {
    const res = await request(app.getHttpServer())
      .get('/public/v1/vps')
      .set('Authorization', 'Bearer vc_not_a_real_key');
    expect(res.status).toBe(401);
    expect(prisma.apiKey.findFirst).toHaveBeenCalled();
    expect(vps.__calls).toEqual([]);
  });
});
