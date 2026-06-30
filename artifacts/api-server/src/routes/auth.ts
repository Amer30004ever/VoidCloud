import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET ?? "voidcloud-dev-secret-change-in-prod";
const JWT_EXPIRES = "7d";

function signToken(user: typeof usersTable.$inferSelect) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

function verifyToken(token: string) {
  return jwt.verify(token, JWT_SECRET) as { sub: string; email: string; role: string };
}

function safeUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    emailVerified: user.emailVerified,
    mustChangePassword: user.mustChangePassword,
    twoFactorEnabled: user.twoFactorEnabled,
    createdAt: user.createdAt,
  };
}

// POST /v1/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ message: "Email and password are required" });
      return;
    }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase().trim()));
    if (!user) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }
    const access_token = signToken(user);
    res.json({ access_token, user: safeUser(user) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// POST /v1/auth/register
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      res.status(400).json({ message: "Name, email and password are required" });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ message: "Password must be at least 8 characters" });
      return;
    }
    const existing = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email.toLowerCase().trim()));
    if (existing.length > 0) {
      res.status(409).json({ message: "An account with this email already exists" });
      return;
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const [user] = await db.insert(usersTable).values({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role: "USER",
      emailVerified: true,
    }).returning();
    const access_token = signToken(user);
    res.status(201).json({ access_token, user: safeUser(user) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// GET /v1/auth/me  (requires Bearer token)
router.get("/me", async (req, res) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const decoded = verifyToken(header.slice(7));
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, decoded.sub));
    if (!user) {
      res.status(401).json({ message: "User not found" });
      return;
    }
    res.json(safeUser(user));
  } catch {
    res.status(401).json({ message: "Unauthorized" });
  }
});

// POST /v1/auth/forgot-password  (stub — no email service yet)
router.post("/forgot-password", async (_req, res) => {
  res.json({ message: "If that email exists, a reset link has been sent." });
});

// POST /v1/auth/reset-password  (stub)
router.post("/reset-password", async (_req, res) => {
  res.status(501).json({ message: "Password reset via email is not configured in this environment." });
});

// POST /v1/auth/resend-verification (stub)
router.post("/resend-verification", async (_req, res) => {
  res.json({ message: "Verification email resent (if the address exists)." });
});

export default router;
