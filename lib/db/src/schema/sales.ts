import { pgTable, text, integer, numeric, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const salesTable = pgTable("sales", {
  id: uuid("id").primaryKey().defaultRandom(),
  invoiceNumber: text("invoice_number").notNull().unique(),
  branchId: uuid("branch_id").notNull(),
  patientId: uuid("patient_id"),
  prescriptionId: uuid("prescription_id"),
  saleType: text("sale_type").notNull().default("retail"),
  cashierId: uuid("cashier_id").notNull(),
  items: jsonb("items").notNull().default([]),
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
  discount: numeric("discount", { precision: 10, scale: 2 }).notNull().default("0"),
  tax: numeric("tax", { precision: 10, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").notNull().default("cash"),
  amountTendered: numeric("amount_tendered", { precision: 10, scale: 2 }),
  change: numeric("change", { precision: 10, scale: 2 }),
  status: text("status").notNull().default("completed"),
  notes: text("notes"),
  ward: text("ward"),
  encounterId: uuid("encounter_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSaleSchema = createInsertSchema(salesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSale = z.infer<typeof insertSaleSchema>;
export type Sale = typeof salesTable.$inferSelect;
