import { createHmac, randomBytes } from "crypto";
import { db } from "@workspace/db";
import { usersTable, sessionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { Request } from "express";

export function hashPassword(password: string): string {
  const salt = "voidcloud_salt_2026";
  return createHmac("sha256", salt).update(password).digest("hex");
}

export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export async function createSession(userId: number): Promise<string> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  await db.insert(sessionsTable).values({ userId, token, expiresAt });
  return token;
}

export async function getUserFromToken(req: Request) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  
  const session = await db.query.sessionsTable.findFirst({
    where: eq(sessionsTable.token, token),
  });
  if (!session || session.expiresAt < new Date()) return null;
  
  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, session.userId),
  });
  return user || null;
}

export async function logAudit(userId: number, action: string, resource: string, resourceId?: string, metadata?: object, ipAddress?: string) {
  const { auditLogsTable } = await import("@workspace/db");
  await db.insert(auditLogsTable).values({
    userId,
    action,
    resource,
    resourceId: resourceId || null,
    metadata: metadata || {},
    ipAddress: ipAddress || null,
  });
}
