import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, sessionsTable, passwordResetTokensTable } from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";
import { hashPassword, createSession, getUserFromToken, generateToken } from "../lib/auth";

const router = Router();

// POST /api/auth/login
router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });

    const user = await db.query.usersTable.findFirst({ where: eq(usersTable.email, email.toLowerCase()) });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    if (user.status === "suspended") return res.status(403).json({ error: "Account suspended" });

    const hash = hashPassword(password);
    if (user.passwordHash !== hash) return res.status(401).json({ error: "Invalid credentials" });

    // Update last login
    await db.update(usersTable).set({ lastLogin: new Date() }).where(eq(usersTable.id, user.id));

    const token = await createSession(user.id);
    const { passwordHash, twoFaSecret, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/auth/register
router.post("/auth/register", async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) return res.status(400).json({ error: "All fields required" });

    const existing = await db.query.usersTable.findFirst({ where: eq(usersTable.email, email.toLowerCase()) });
    if (existing) return res.status(409).json({ error: "Email already registered" });

    const [user] = await db.insert(usersTable).values({
      email: email.toLowerCase(),
      name,
      passwordHash: hashPassword(password),
      role: "USER",
      status: "active",
    }).returning();

    const token = await createSession(user.id);
    const { passwordHash, twoFaSecret, ...safeUser } = user;
    res.status(201).json({ token, user: safeUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/auth/logout
router.post("/auth/logout", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      await db.delete(sessionsTable).where(eq(sessionsTable.token, token));
    }
    res.json({ message: "Logged out" });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/auth/forgot-password
router.post("/auth/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await db.query.usersTable.findFirst({ where: eq(usersTable.email, email?.toLowerCase()) });
    if (user) {
      const token = generateToken();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await db.insert(passwordResetTokensTable).values({ userId: user.id, token, expiresAt });
      // In production, send email with token
    }
    res.json({ message: "If that email exists, a reset link was sent" });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/auth/reset-password
router.post("/auth/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body;
    const resetToken = await db.query.passwordResetTokensTable.findFirst({
      where: and(eq(passwordResetTokensTable.token, token), gt(passwordResetTokensTable.expiresAt, new Date())),
    });
    if (!resetToken || resetToken.usedAt) return res.status(400).json({ error: "Invalid or expired token" });

    await db.update(usersTable).set({ passwordHash: hashPassword(password) }).where(eq(usersTable.id, resetToken.userId));
    await db.update(passwordResetTokensTable).set({ usedAt: new Date() }).where(eq(passwordResetTokensTable.id, resetToken.id));
    res.json({ message: "Password reset successfully" });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/auth/me
router.get("/auth/me", async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const { passwordHash, twoFaSecret, ...safeUser } = user;
    res.json(safeUser);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/auth/2fa/setup
router.post("/auth/2fa/setup", async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const secret = generateToken().slice(0, 32).toUpperCase();
    await db.update(usersTable).set({ twoFaSecret: secret }).where(eq(usersTable.id, user.id));
    res.json({
      secret,
      qrCodeUrl: `otpauth://totp/VoidCloud:${user.email}?secret=${secret}&issuer=VoidCloud`,
      recoveryCodes: Array.from({ length: 8 }, () => generateToken().slice(0, 8).toUpperCase()),
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/auth/2fa/verify
router.post("/auth/2fa/verify", async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    await db.update(usersTable).set({ twoFaEnabled: true }).where(eq(usersTable.id, user.id));
    res.json({ message: "2FA enabled successfully" });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
