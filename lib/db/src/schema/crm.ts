import { pgTable, serial, text, timestamp, integer, numeric, pgEnum, jsonb } from "drizzle-orm/pg-core";

export const leadStatusEnum = pgEnum("lead_status", ["new", "contacted", "qualified", "converted", "lost"]);

export const contactsTable = pgTable("contacts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  company: text("company"),
  tenantId: integer("tenant_id").notNull(),
  tags: jsonb("tags").default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const leadsTable = pgTable("leads", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  status: leadStatusEnum("status").notNull().default("new"),
  source: text("source"),
  assignedTo: integer("assigned_to"),
  tenantId: integer("tenant_id").notNull(),
  notes: text("notes"),
  value: numeric("value", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Contact = typeof contactsTable.$inferSelect;
export type Lead = typeof leadsTable.$inferSelect;
