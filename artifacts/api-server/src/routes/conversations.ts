import { Router } from "express";
import { db } from "@workspace/db";
import { conversationsTable, messagesTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getUserFromToken } from "../lib/auth";

const router = Router();

router.get("/conversations", async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { status, assignedTo, tenantId } = req.query as Record<string, string>;
    const [convos, users] = await Promise.all([db.query.conversationsTable.findMany(), db.query.usersTable.findMany()]);
    const userMap = new Map(users.map(u => [u.id, u.name]));

    let filtered = convos;
    if (user.role === "AGENT") filtered = filtered.filter(c => c.assignedTo === user.id);
    else if (user.role !== "SUPER_ADMIN" && user.tenantId) filtered = filtered.filter(c => c.tenantId === user.tenantId);
    if (status) filtered = filtered.filter(c => c.status === status);
    if (assignedTo) filtered = filtered.filter(c => c.assignedTo === parseInt(assignedTo));
    if (tenantId) filtered = filtered.filter(c => c.tenantId === parseInt(tenantId));

    res.json(filtered.map(c => ({
      ...c,
      assignedName: c.assignedTo ? userMap.get(c.assignedTo) || null : null,
      lastMessageAt: c.lastMessageAt?.toISOString() || null,
      createdAt: c.createdAt.toISOString(),
    })));
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/conversations/:id/messages", async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const msgs = await db.query.messagesTable.findMany();
    res.json(msgs.filter(m => m.conversationId === parseInt(req.params.id)).map(m => ({
      ...m, createdAt: m.createdAt.toISOString(),
    })));
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/conversations/:id/messages", async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { content } = req.body;
    const convId = parseInt(req.params.id);
    const [msg] = await db.insert(messagesTable).values({
      conversationId: convId,
      content,
      direction: "outbound",
      senderName: user.name,
    }).returning();

    await db.update(conversationsTable).set({ lastMessage: content, lastMessageAt: new Date(), updatedAt: new Date() }).where(eq(conversationsTable.id, convId));
    res.status(201).json({ ...msg, createdAt: msg.createdAt.toISOString() });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/whatsapp/broadcast", async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user || !["SUPER_ADMIN", "ADMIN"].includes(user.role)) return res.status(403).json({ error: "Forbidden" });
    // In production, queue broadcast messages via WhatsApp API
    res.json({ message: "Broadcast queued successfully" });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
