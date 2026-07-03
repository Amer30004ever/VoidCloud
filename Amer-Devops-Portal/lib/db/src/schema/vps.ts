import { pgTable, serial, text, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";

export const vpsStatusEnum = pgEnum("vps_status", ["running", "stopped", "provisioning", "error", "deleted"]);

export const vpsInstancesTable = pgTable("vps_instances", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  status: vpsStatusEnum("status").notNull().default("provisioning"),
  cpu: integer("cpu").notNull(),
  ram: integer("ram").notNull(),
  disk: integer("disk").notNull(),
  os: text("os").notNull(),
  ip: text("ip").notNull().default(""),
  clusterId: integer("cluster_id").notNull(),
  tenantId: integer("tenant_id").notNull(),
  userId: integer("user_id").notNull(),
  vmid: integer("vmid"),
  node: text("node").notNull().default("pve"),
  planId: integer("plan_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const vpsSnapshotsTable = pgTable("vps_snapshots", {
  id: serial("id").primaryKey(),
  vpsId: integer("vps_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  size: integer("size").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type VpsInstance = typeof vpsInstancesTable.$inferSelect;
export type VpsSnapshot = typeof vpsSnapshotsTable.$inferSelect;
