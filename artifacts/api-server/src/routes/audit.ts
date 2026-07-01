import { Router } from "express";
import { db } from "@workspace/db";
import { auditLogsTable, usersTable } from "@workspace/db";
import { getUserFromToken } from "../lib/auth";

const router = Router();

router.get("/audit", async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user || !["SUPER_ADMIN", "ADMIN"].includes(user.role)) return res.status(403).json({ error: "Forbidden" });

    const { userId, action, resource, from, to } = req.query as Record<string, string>;
    const [logs, users] = await Promise.all([db.query.auditLogsTable.findMany(), db.query.usersTable.findMany()]);
    const userMap = new Map(users.map(u => [u.id, u.name]));

    let filtered = logs;
    if (userId) filtered = filtered.filter(l => l.userId === parseInt(userId));
    if (action) filtered = filtered.filter(l => l.action.toLowerCase().includes(action.toLowerCase()));
    if (resource) filtered = filtered.filter(l => l.resource.toLowerCase().includes(resource.toLowerCase()));
    if (from) filtered = filtered.filter(l => l.createdAt >= new Date(from));
    if (to) filtered = filtered.filter(l => l.createdAt <= new Date(to));

    res.json(filtered.slice(0, 100).map(l => ({
      ...l,
      userName: userMap.get(l.userId) || "Unknown",
      createdAt: l.createdAt.toISOString(),
    })));
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
