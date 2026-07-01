import { pgTable, serial, text, timestamp, integer, numeric, pgEnum } from "drizzle-orm/pg-core";

export const invoiceStatusEnum = pgEnum("invoice_status", ["paid", "unpaid", "overdue", "cancelled"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", ["active", "cancelled", "past_due", "trialing"]);

export const invoicesTable = pgTable("invoices", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  status: invoiceStatusEnum("status").notNull().default("unpaid"),
  dueDate: timestamp("due_date").notNull(),
  paidAt: timestamp("paid_at"),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const subscriptionsTable = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  planId: integer("plan_id").notNull(),
  status: subscriptionStatusEnum("status").notNull().default("trialing"),
  startDate: timestamp("start_date").notNull().defaultNow(),
  endDate: timestamp("end_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Invoice = typeof invoicesTable.$inferSelect;
export type Subscription = typeof subscriptionsTable.$inferSelect;
