import { pgTable, text, numeric, timestamp, uuid, date, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const grnsTable = pgTable("grns", {
  id: uuid("id").primaryKey().defaultRandom(),
  grnNumber: text("grn_number").notNull().unique(),
  poId: uuid("po_id"),
  supplierId: uuid("supplier_id").notNull(),
  branchId: uuid("branch_id").notNull(),
  receivedDate: date("received_date", { mode: "string" }).notNull(),
  supplierInvoiceNumber: text("supplier_invoice_number"),
  receivedBy: uuid("received_by"),
  items: jsonb("items").notNull().default([]),
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertGrnSchema = createInsertSchema(grnsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertGrn = z.infer<typeof insertGrnSchema>;
export type Grn = typeof grnsTable.$inferSelect;
