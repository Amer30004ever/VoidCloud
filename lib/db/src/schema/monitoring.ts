import { pgTable, serial, text, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";

export const alertSeverityEnum = pgEnum("alert_severity", ["critical", "warning", "info"]);
export const alertStatusEnum = pgEnum("alert_status", ["firing", "resolved"]);

export const alertsTable = pgTable("alerts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  severity: alertSeverityEnum("severity").notNull().default("info"),
  status: alertStatusEnum("status").notNull().default("firing"),
  message: text("message").notNull(),
  service: text("service"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

export const blockedIPsTable = pgTable("blocked_ips", {
  id: serial("id").primaryKey(),
  ip: text("ip").notNull().unique(),
  reason: text("reason"),
  duration: integer("duration"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Alert = typeof alertsTable.$inferSelect;
export type BlockedIP = typeof blockedIPsTable.$inferSelect;
