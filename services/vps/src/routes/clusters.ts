import { Router } from "express";
import { db } from "@workspace/db";
import { clustersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getUserFromToken } from "../lib/auth";

const router = Router();

// GET /api/clusters
router.get("/clusters", async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const clusters = await db.query.clustersTable.findMany();
    // Add mock resource data
    const result = clusters.map(c => ({
      ...c,
      nodeCount: Math.floor(Math.random() * 5) + 1,
      totalCpu: 64,
      totalRam: 131072,
      totalDisk: 4096,
      usedCpu: Math.floor(Math.random() * 40),
      usedRam: Math.floor(Math.random() * 65536),
      usedDisk: Math.floor(Math.random() * 2048),
      vmCount: Math.floor(Math.random() * 20),
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/clusters
router.post("/clusters", async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user || user.role !== "SUPER_ADMIN") return res.status(403).json({ error: "Forbidden" });

    const { name, host, port, username, password, tokenId, tokenSecret } = req.body;
    const [cluster] = await db.insert(clustersTable).values({
      name, host, port: port || 8006, username: username || "root",
      passwordHash: password || null, tokenId: tokenId || null, tokenSecret: tokenSecret || null,
      status: "online",
    }).returning();
    res.status(201).json({ ...cluster, nodeCount: 1, totalCpu: 64, totalRam: 131072, totalDisk: 4096, usedCpu: 0, usedRam: 0, usedDisk: 0, vmCount: 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/clusters/:id
router.get("/clusters/:id", async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const cluster = await db.query.clustersTable.findFirst({ where: eq(clustersTable.id, parseInt(req.params.id)) });
    if (!cluster) return res.status(404).json({ error: "Cluster not found" });
    res.json({ ...cluster, nodeCount: 2, totalCpu: 64, totalRam: 131072, totalDisk: 4096, usedCpu: 20, usedRam: 32768, usedDisk: 1024, vmCount: 8 });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/clusters/:id
router.patch("/clusters/:id", async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user || user.role !== "SUPER_ADMIN") return res.status(403).json({ error: "Forbidden" });

    const { name, host, port, username, password } = req.body;
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (name) updates.name = name;
    if (host) updates.host = host;
    if (port) updates.port = port;
    if (username) updates.username = username;
    if (password) updates.passwordHash = password;

    const [cluster] = await db.update(clustersTable).set(updates).where(eq(clustersTable.id, parseInt(req.params.id))).returning();
    if (!cluster) return res.status(404).json({ error: "Cluster not found" });
    res.json({ ...cluster, nodeCount: 2, totalCpu: 64, totalRam: 131072, totalDisk: 4096, usedCpu: 20, usedRam: 32768, usedDisk: 1024, vmCount: 8 });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/clusters/:id
router.delete("/clusters/:id", async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user || user.role !== "SUPER_ADMIN") return res.status(403).json({ error: "Forbidden" });

    await db.delete(clustersTable).where(eq(clustersTable.id, parseInt(req.params.id)));
    res.json({ message: "Cluster deleted" });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/clusters/:id/health
router.get("/clusters/:id/health", async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const clusterId = parseInt(req.params.id);
    res.json({
      clusterId,
      status: "online",
      cpuPercent: Math.random() * 60 + 10,
      ramPercent: Math.random() * 50 + 20,
      diskPercent: Math.random() * 40 + 15,
      nodes: [
        { id: "pve", name: "pve", status: "online", cpu: 0.35, mem: 8589934592, maxmem: 17179869184, disk: 107374182400, maxdisk: 214748364800, uptime: 86400 },
      ],
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/clusters/:id/nodes
router.get("/clusters/:id/nodes", async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    res.json([
      { id: "pve", name: "pve", status: "online", cpu: 0.35, mem: 8589934592, maxmem: 17179869184, disk: 107374182400, maxdisk: 214748364800, uptime: 86400 },
      { id: "pve2", name: "pve2", status: "online", cpu: 0.22, mem: 4294967296, maxmem: 17179869184, disk: 53687091200, maxdisk: 214748364800, uptime: 172800 },
    ]);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/clusters/:id/vms
router.get("/clusters/:id/vms", async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { vpsInstancesTable } = await import("@workspace/db");
    const vps = await db.query.vpsInstancesTable.findMany();
    const clusterVPS = vps.filter(v => v.clusterId === parseInt(req.params.id));
    res.json(clusterVPS.map(v => ({
      vmid: v.vmid || v.id + 100,
      name: v.name,
      status: v.status === "running" ? "running" : "stopped",
      cpu: v.cpu * 0.3,
      mem: v.ram * 1024 * 1024,
      maxmem: v.ram * 1024 * 1024,
      disk: v.disk * 1024 * 1024 * 1024,
      type: "lxc",
    })));
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
