import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq, ilike, or, and, SQL } from "drizzle-orm";
import { getUserFromToken, hashPassword, createSession, generateToken } from "../lib/auth";

const router = Router();

// GET /api/users
router.get("/users", async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { role, status, search, tenantId } = req.query as Record<string, string>;
    
    const users = await db.query.usersTable.findMany();
    let filtered = users;
    if (role) filtered = filtered.filter(u => u.role === role);
    if (status) filtered = filtered.filter(u => u.status === status);
    if (search) filtered = filtered.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()));
    if (tenantId) filtered = filtered.filter(u => u.tenantId === parseInt(tenantId));

    const safe = filtered.map(({ passwordHash, twoFaSecret, ...u }) => u);
    res.json(safe);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/users
router.post("/users", async (req, res) => {
  try {
    const currentUser = await getUserFromToken(req);
    if (!currentUser || currentUser.role !== "SUPER_ADMIN") return res.status(403).json({ error: "Forbidden" });

    const { email, name, role, password, tenantId } = req.body;
    const [user] = await db.insert(usersTable).values({
      email: email.toLowerCase(),
      name,
      role,
      passwordHash: hashPassword(password),
      tenantId: tenantId || null,
      status: "active",
    }).returning();

    const { passwordHash, twoFaSecret, ...safe } = user;
    res.status(201).json(safe);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/users/:id
router.get("/users/:id", async (req, res) => {
  try {
    const currentUser = await getUserFromToken(req);
    if (!currentUser) return res.status(401).json({ error: "Unauthorized" });

    const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, parseInt(req.params.id)) });
    if (!user) return res.status(404).json({ error: "User not found" });
    const { passwordHash, twoFaSecret, ...safe } = user;
    res.json(safe);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/users/:id
router.patch("/users/:id", async (req, res) => {
  try {
    const currentUser = await getUserFromToken(req);
    if (!currentUser) return res.status(401).json({ error: "Unauthorized" });

    const targetId = parseInt(req.params.id);
    const isSelf = currentUser.id === targetId;
    const isSuperAdmin = currentUser.role === "SUPER_ADMIN";

    // Only SUPER_ADMIN can modify other users or change privileged fields
    if (!isSelf && !isSuperAdmin) return res.status(403).json({ error: "Forbidden" });

    const { name, role, status, tenantId } = req.body;
    const updates: Record<string, unknown> = {};
    // Non-admins can only update their own name
    if (name) updates.name = name;
    if (isSuperAdmin) {
      if (role) updates.role = role;
      if (status) updates.status = status;
      if (tenantId !== undefined) updates.tenantId = tenantId;
    }
    updates.updatedAt = new Date();

    const [user] = await db.update(usersTable).set(updates).where(eq(usersTable.id, targetId)).returning();
    if (!user) return res.status(404).json({ error: "User not found" });
    const { passwordHash, twoFaSecret, ...safe } = user;
    res.json(safe);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/users/:id
router.delete("/users/:id", async (req, res) => {
  try {
    const currentUser = await getUserFromToken(req);
    if (!currentUser || currentUser.role !== "SUPER_ADMIN") return res.status(403).json({ error: "Forbidden" });

    await db.delete(usersTable).where(eq(usersTable.id, parseInt(req.params.id)));
    res.json({ message: "User deleted" });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/users/:id/impersonate
router.post("/users/:id/impersonate", async (req, res) => {
  try {
    const currentUser = await getUserFromToken(req);
    if (!currentUser || currentUser.role !== "SUPER_ADMIN") return res.status(403).json({ error: "Forbidden" });

    const targetUser = await db.query.usersTable.findFirst({ where: eq(usersTable.id, parseInt(req.params.id)) });
    if (!targetUser) return res.status(404).json({ error: "User not found" });

    const token = await createSession(targetUser.id);
    const { passwordHash, twoFaSecret, ...safe } = targetUser;
    res.json({ token, user: safe });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
