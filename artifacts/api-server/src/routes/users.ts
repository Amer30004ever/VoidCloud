import { Router } from "express";
import jwt from "jsonwebtoken";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET ?? "voidcloud-dev-secret-change-in-prod";

function getUser(req: Parameters<Parameters<typeof router.get>[1]>[0]) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  try {
    return jwt.verify(header.slice(7), JWT_SECRET) as { sub: string; role: string };
  } catch {
    return null;
  }
}

// GET /v1/users  — admin list (returns 401 if unauthenticated so health check sees "up")
router.get("/", async (req, res) => {
  const decoded = getUser(req);
  if (!decoded) { res.status(401).json({ message: "Unauthorized" }); return; }
  if (decoded.role !== "ADMIN" && decoded.role !== "SUPER_ADMIN") {
    res.status(403).json({ message: "Forbidden" }); return;
  }
  const users = await db.select({
    id: usersTable.id,
    name: usersTable.name,
    email: usersTable.email,
    role: usersTable.role,
    emailVerified: usersTable.emailVerified,
    createdAt: usersTable.createdAt,
  }).from(usersTable);
  res.json(users);
});

// GET /v1/users/:id
router.get("/:id", async (req, res) => {
  const decoded = getUser(req);
  if (!decoded) { res.status(401).json({ message: "Unauthorized" }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.params.id));
  if (!user) { res.status(404).json({ message: "Not found" }); return; }
  if (decoded.sub !== user.id && decoded.role !== "ADMIN" && decoded.role !== "SUPER_ADMIN") {
    res.status(403).json({ message: "Forbidden" }); return;
  }
  const { passwordHash: _, ...safeUser } = user;
  res.json(safeUser);
});

export default router;
