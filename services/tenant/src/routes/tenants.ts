import { Router } from "express";
import { db } from "@workspace/db";
import { tenantsTable, tenantQuotasTable, usersTable, vpsInstancesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getUserFromToken } from "../lib/auth";

const router = Router();

// GET /api/tenants
router.get("/tenants", async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { status, search } = req.query as Record<string, string>;
    const tenants = await db.query.tenantsTable.findMany();
    const users = await db.query.usersTable.findMany();
    const vpsList = await db.query.vpsInstancesTable.findMany();

    let filtered = tenants;
    if (status) filtered = filtered.filter(t => t.status === status);
    if (search) filtered = filtered.filter(t => t.name.toLowerCase().includes(search.toLowerCase()) || t.subdomain.toLowerCase().includes(search.toLowerCase()));

    const result = filtered.map(t => ({
      ...t,
      userCount: users.filter(u => u.tenantId === t.id).length,
      vpsCount: vpsList.filter(v => v.tenantId === t.id).length,
      monthlyRevenue: parseFloat(t.monthlyRevenue),
    }));
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/tenants
router.post("/tenants", async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user || user.role !== "SUPER_ADMIN") return res.status(403).json({ error: "Forbidden" });

    const { name, subdomain, plan, adminEmail } = req.body;
    const [tenant] = await db.insert(tenantsTable).values({ name, subdomain: subdomain.toLowerCase(), plan, adminEmail }).returning();
    await db.insert(tenantQuotasTable).values({ tenantId: tenant.id });
    res.status(201).json({ ...tenant, userCount: 0, vpsCount: 0, monthlyRevenue: 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/tenants/:id
router.get("/tenants/:id", async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const tenant = await db.query.tenantsTable.findFirst({ where: eq(tenantsTable.id, parseInt(req.params.id)) });
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });
    const users = await db.query.usersTable.findMany();
    const vpsList = await db.query.vpsInstancesTable.findMany();
    res.json({
      ...tenant,
      userCount: users.filter(u => u.tenantId === tenant.id).length,
      vpsCount: vpsList.filter(v => v.tenantId === tenant.id).length,
      monthlyRevenue: parseFloat(tenant.monthlyRevenue),
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/tenants/:id
router.patch("/tenants/:id", async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user || user.role !== "SUPER_ADMIN") return res.status(403).json({ error: "Forbidden" });

    const { name, status, plan, settings } = req.body;
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (name) updates.name = name;
    if (status) updates.status = status;
    if (plan) updates.plan = plan;
    if (settings) updates.settings = settings;

    const [tenant] = await db.update(tenantsTable).set(updates).where(eq(tenantsTable.id, parseInt(req.params.id))).returning();
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });
    res.json({ ...tenant, monthlyRevenue: parseFloat(tenant.monthlyRevenue) });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/tenants/:id
router.delete("/tenants/:id", async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user || user.role !== "SUPER_ADMIN") return res.status(403).json({ error: "Forbidden" });

    await db.delete(tenantsTable).where(eq(tenantsTable.id, parseInt(req.params.id)));
    res.json({ message: "Tenant deleted" });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/tenants/:id/quota
router.get("/tenants/:id/quota", async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const tenantId = parseInt(req.params.id);
    let quota = await db.query.tenantQuotasTable.findFirst({ where: eq(tenantQuotasTable.tenantId, tenantId) });
    if (!quota) {
      const [q] = await db.insert(tenantQuotasTable).values({ tenantId }).returning();
      quota = q;
    }
    const vpsList = await db.query.vpsInstancesTable.findMany();
    const tenantVPS = vpsList.filter(v => v.tenantId === tenantId);
    const cpuUsed = tenantVPS.reduce((s, v) => s + v.cpu, 0);
    const ramUsed = tenantVPS.reduce((s, v) => s + v.ram, 0);
    const diskUsed = tenantVPS.reduce((s, v) => s + v.disk, 0);

    res.json({ ...quota, cpuUsed, ramUsed, diskUsed, vpsCount: tenantVPS.length });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/tenants/:id/quota
router.patch("/tenants/:id/quota", async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user || user.role !== "SUPER_ADMIN") return res.status(403).json({ error: "Forbidden" });

    const tenantId = parseInt(req.params.id);
    const { cpuLimit, ramLimit, diskLimit, vpsLimit } = req.body;
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (cpuLimit !== undefined) updates.cpuLimit = cpuLimit;
    if (ramLimit !== undefined) updates.ramLimit = ramLimit;
    if (diskLimit !== undefined) updates.diskLimit = diskLimit;
    if (vpsLimit !== undefined) updates.vpsLimit = vpsLimit;

    let [quota] = await db.update(tenantQuotasTable).set(updates).where(eq(tenantQuotasTable.tenantId, tenantId)).returning();
    if (!quota) {
      const [q] = await db.insert(tenantQuotasTable).values({ tenantId, ...updates }).returning();
      quota = q;
    }
    const vpsList = await db.query.vpsInstancesTable.findMany();
    const tenantVPS = vpsList.filter(v => v.tenantId === tenantId);
    res.json({ ...quota, cpuUsed: tenantVPS.reduce((s, v) => s + v.cpu, 0), ramUsed: tenantVPS.reduce((s, v) => s + v.ram, 0), diskUsed: tenantVPS.reduce((s, v) => s + v.disk, 0), vpsCount: tenantVPS.length });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
