import { pgTable, text, numeric, timestamp, uuid, date, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const purchaseOrdersTable = pgTable("purchase_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  poNumber: text("po_number").notNull().unique(),
  supplierId: uuid("supplier_id").notNull(),
  branchId: uuid("branch_id").notNull(),
  status: text("status").notNull().default("draft"),
  orderDate: date("order_date", { mode: "string" }).notNull(),
  expectedDate: date("expected_date", { mode: "string" }),
  items: jsonb("items").notNull().default([]),
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPurchaseOrderSchema = createInsertSchema(purchaseOrdersTable).omit({ id: true, createdAt: true, updatedAt: true, sentAt: true });
export type InsertPurchaseOrder = z.infer<typeof insertPurchaseOrderSchema>;
export type PurchaseOrder = typeof purchaseOrdersTable.$inferSelect;
