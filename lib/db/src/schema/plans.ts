import { pgTable, serial, text, timestamp, integer, numeric, boolean, jsonb } from "drizzle-orm/pg-core";

export const plansTable = pgTable("plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  cpu: integer("cpu").notNull(),
  ram: integer("ram").notNull(),
  disk: integer("disk").notNull(),
  bandwidth: integer("bandwidth").notNull(),
  features: jsonb("features").default([]),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Plan = typeof plansTable.$inferSelect;
