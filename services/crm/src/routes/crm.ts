import { Router } from "express";
import { db } from "@workspace/db";
import { contactsTable, leadsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getUserFromToken } from "../lib/auth";

const router = Router();

router.get("/crm/contacts", async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { tenantId, search } = req.query as Record<string, string>;
    const contacts = await db.query.contactsTable.findMany();
    let filtered = contacts;
    if (user.role !== "SUPER_ADMIN" && user.tenantId) filtered = filtered.filter(c => c.tenantId === user.tenantId);
    if (tenantId) filtered = filtered.filter(c => c.tenantId === parseInt(tenantId));
    if (search) filtered = filtered.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search));

    res.json(filtered.map(c => ({ ...c, tags: Array.isArray(c.tags) ? c.tags : [], createdAt: c.createdAt.toISOString(), updatedAt: c.updatedAt.toISOString() })));
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/crm/contacts", async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { name, phone, email, company } = req.body;
    const [contact] = await db.insert(contactsTable).values({
      name, phone, email: email || null, company: company || null,
      tenantId: user.tenantId || 1,
    }).returning();
    res.status(201).json({ ...contact, tags: [], createdAt: contact.createdAt.toISOString() });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/crm/leads", async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { status, assignedTo, tenantId } = req.query as Record<string, string>;
    const [leads, users] = await Promise.all([db.query.leadsTable.findMany(), db.query.usersTable.findMany()]);
    const userMap = new Map(users.map(u => [u.id, u.name]));

    let filtered = leads;
    if (user.role === "AGENT") filtered = filtered.filter(l => l.assignedTo === user.id);
    else if (user.role !== "SUPER_ADMIN" && user.tenantId) filtered = filtered.filter(l => l.tenantId === user.tenantId);
    if (status) filtered = filtered.filter(l => l.status === status);
    if (assignedTo) filtered = filtered.filter(l => l.assignedTo === parseInt(assignedTo));
    if (tenantId) filtered = filtered.filter(l => l.tenantId === parseInt(tenantId));

    res.json(filtered.map(l => ({
      ...l,
      value: l.value ? parseFloat(l.value) : null,
      assignedName: l.assignedTo ? userMap.get(l.assignedTo) || null : null,
      createdAt: l.createdAt.toISOString(),
    })));
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/crm/leads", async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { name, phone, email, source, value, notes } = req.body;
    const [lead] = await db.insert(leadsTable).values({
      name, phone, email: email || null, source: source || null,
      value: value?.toString() || null, notes: notes || null,
      tenantId: user.tenantId || 1,
      assignedTo: user.role === "AGENT" ? user.id : null,
    }).returning();
    res.status(201).json({ ...lead, value: lead.value ? parseFloat(lead.value) : null, assignedName: null, createdAt: lead.createdAt.toISOString() });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/crm/leads/:id", async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { status, assignedTo, notes, value } = req.body;
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (status !== undefined) updates.status = status;
    if (assignedTo !== undefined) updates.assignedTo = assignedTo;
    if (notes !== undefined) updates.notes = notes;
    if (value !== undefined) updates.value = value?.toString();

    const [lead] = await db.update(leadsTable).set(updates).where(eq(leadsTable.id, parseInt(req.params.id))).returning();
    if (!lead) return res.status(404).json({ error: "Lead not found" });
    res.json({ ...lead, value: lead.value ? parseFloat(lead.value) : null, assignedName: null, createdAt: lead.createdAt.toISOString() });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
