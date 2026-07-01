import { Router } from "express";
import { db } from "@workspace/db";
import { notificationsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { getUserFromToken } from "../lib/auth";

const router = Router();

router.get("/notifications", async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const notifs = await db.query.notificationsTable.findMany();
    res.json(notifs.filter(n => n.userId === user.id).map(n => ({ ...n, createdAt: n.createdAt.toISOString() })));
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/notifications/:id/read", async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    await db.update(notificationsTable).set({ read: true }).where(
      and(eq(notificationsTable.id, parseInt(req.params.id)), eq(notificationsTable.userId, user.id))
    );
    res.json({ message: "Marked as read" });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
