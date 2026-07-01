import { pgTable, serial, text, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";

export const clusterStatusEnum = pgEnum("cluster_status", ["online", "offline", "degraded"]);

export const clustersTable = pgTable("clusters", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  host: text("host").notNull(),
  port: integer("port").notNull().default(8006),
  username: text("username").notNull().default("root"),
  passwordHash: text("password_hash"),
  tokenId: text("token_id"),
  tokenSecret: text("token_secret"),
  status: clusterStatusEnum("status").notNull().default("offline"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Cluster = typeof clustersTable.$inferSelect;
