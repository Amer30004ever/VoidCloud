import { pgTable, serial, text, timestamp, boolean } from "drizzle-orm/pg-core";

export const maintenanceModeTable = pgTable("maintenance_mode", {
  id: serial("id").primaryKey(),
  enabled: boolean("enabled").notNull().default(false),
  message: text("message").notNull().default("Platform is undergoing scheduled maintenance."),
  estimatedEnd: timestamp("estimated_end"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type MaintenanceMode = typeof maintenanceModeTable.$inferSelect;
