import { pgTable, serial, text, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";

export const conversationStatusEnum = pgEnum("conversation_status", ["open", "resolved", "pending", "spam"]);
export const messageDirectionEnum = pgEnum("message_direction", ["inbound", "outbound"]);

export const conversationsTable = pgTable("conversations", {
  id: serial("id").primaryKey(),
  contactName: text("contact_name").notNull(),
  phone: text("phone").notNull(),
  status: conversationStatusEnum("status").notNull().default("open"),
  assignedTo: integer("assigned_to"),
  tenantId: integer("tenant_id").notNull(),
  lastMessage: text("last_message"),
  lastMessageAt: timestamp("last_message_at"),
  unreadCount: integer("unread_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const messagesTable = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull(),
  content: text("content").notNull(),
  direction: messageDirectionEnum("direction").notNull(),
  status: text("status").notNull().default("delivered"),
  senderName: text("sender_name"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Conversation = typeof conversationsTable.$inferSelect;
export type Message = typeof messagesTable.$inferSelect;
