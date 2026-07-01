import { Router } from "express";
import { db } from "@workspace/db";
import { vpsInstancesTable, vpsSnapshotsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getUserFromToken } from "../lib/auth";

const router = Router();

// GET /api/vps
router.get("/vps", async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { status, tenantId } = req.query as Record<string, string>;
    const [vpsList, clusters, plans] = await Promise.all([
      db.query.vpsInstancesTable.findMany(),
      db.query.clustersTable?.findMany() || [],
      db.query.plansTable?.findMany() || [],
    ]);

    let filtered = vpsList;
    // Role-based filtering
    if (user.role === "USER") filtered = filtered.filter(v => v.userId === user.id);
    else if (user.role === "ADMIN" && user.tenantId) filtered = filtered.filter(v => v.tenantId === user.tenantId);
    if (status) filtered = filtered.filter(v => v.status === status);
    if (tenantId && user.role === "SUPER_ADMIN") filtered = filtered.filter(v => v.tenantId === parseInt(tenantId));

    const clusterMap = new Map((clusters || []).map((c: any) => [c.id, c]));
    const planMap = new Map((plans || []).map((p: any) => [p.id, p]));

    res.json(filtered.map(v => ({
      ...v,
      clusterName: clusterMap.get(v.clusterId)?.name || null,
      planName: v.planId ? planMap.get(v.planId)?.name || null : null,
      uptime: v.status === "running" ? Math.floor(Math.random() * 86400 * 30) : null,
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/vps
router.post("/vps", async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { name, cpu, ram, disk, os, clusterId, planId, tenantId, userId, ip } = req.body;
    const effectiveTenantId = user.role === "SUPER_ADMIN" ? (tenantId || 1) : (user.tenantId || 1);
    const effectiveUserId = user.role === "SUPER_ADMIN" ? (userId || user.id) : user.id;

    const [vps] = await db.insert(vpsInstancesTable).values({
      name, cpu, ram, disk, os,
      clusterId: parseInt(clusterId),
      tenantId: effectiveTenantId,
      userId: effectiveUserId,
      planId: planId || null,
      ip: ip || `10.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}`,
      vmid: Math.floor(Math.random() * 900) + 100,
      status: "running",
    }).returning();

    res.status(201).json({ ...vps, clusterName: null, planName: null, uptime: 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/vps/:id
router.get("/vps/:id", async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const vps = await db.query.vpsInstancesTable.findFirst({ where: eq(vpsInstancesTable.id, parseInt(req.params.id)) });
    if (!vps) return res.status(404).json({ error: "VPS not found" });
    res.json({ ...vps, clusterName: null, planName: null, uptime: vps.status === "running" ? 86400 : null });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/vps/:id
router.delete("/vps/:id", async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    await db.delete(vpsInstancesTable).where(eq(vpsInstancesTable.id, parseInt(req.params.id)));
    res.json({ message: "VPS deleted" });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/vps/:id/start
router.post("/vps/:id/start", async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    await db.update(vpsInstancesTable).set({ status: "running", updatedAt: new Date() }).where(eq(vpsInstancesTable.id, parseInt(req.params.id)));
    res.json({ message: "VPS started" });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/vps/:id/stop
router.post("/vps/:id/stop", async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    await db.update(vpsInstancesTable).set({ status: "stopped", updatedAt: new Date() }).where(eq(vpsInstancesTable.id, parseInt(req.params.id)));
    res.json({ message: "VPS stopped" });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/vps/:id/restart
router.post("/vps/:id/restart", async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    await db.update(vpsInstancesTable).set({ status: "running", updatedAt: new Date() }).where(eq(vpsInstancesTable.id, parseInt(req.params.id)));
    res.json({ message: "VPS restarted" });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/vps/:id/snapshots
router.get("/vps/:id/snapshots", async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const snapshots = await db.query.vpsSnapshotsTable.findMany();
    res.json(snapshots.filter(s => s.vpsId === parseInt(req.params.id)));
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/vps/:id/snapshots
router.post("/vps/:id/snapshots", async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const { name, description } = req.body;
    const [snap] = await db.insert(vpsSnapshotsTable).values({
      vpsId: parseInt(req.params.id), name, description: description || null, size: Math.floor(Math.random() * 10240),
    }).returning();
    res.status(201).json(snap);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/vps/:id/stats
router.get("/vps/:id/stats", async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    res.json({
      cpuPercent: Math.random() * 80,
      ramPercent: Math.random() * 70,
      diskPercent: Math.random() * 60,
      networkIn: Math.random() * 1000000,
      networkOut: Math.random() * 500000,
      uptime: Math.floor(Math.random() * 86400 * 30),
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
