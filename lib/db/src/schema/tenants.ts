import { pgTable, serial, text, timestamp, integer, numeric, pgEnum, jsonb } from "drizzle-orm/pg-core";

export const tenantStatusEnum = pgEnum("tenant_status", ["active", "suspended", "trial"]);

export const tenantsTable = pgTable("tenants", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  subdomain: text("subdomain").notNull().unique(),
  status: tenantStatusEnum("status").notNull().default("trial"),
  plan: text("plan").notNull().default("starter"),
  adminEmail: text("admin_email"),
  monthlyRevenue: numeric("monthly_revenue", { precision: 10, scale: 2 }).notNull().default("0"),
  settings: jsonb("settings").default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const tenantQuotasTable = pgTable("tenant_quotas", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().unique(),
  cpuLimit: integer("cpu_limit").notNull().default(8),
  ramLimit: integer("ram_limit").notNull().default(16384),
  diskLimit: integer("disk_limit").notNull().default(200),
  vpsLimit: integer("vps_limit").notNull().default(5),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Tenant = typeof tenantsTable.$inferSelect;
export type TenantQuota = typeof tenantQuotasTable.$inferSelect;
