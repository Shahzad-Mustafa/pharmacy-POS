import { pgTable, text, integer, numeric, timestamp, uuid, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const batchesTable = pgTable("batches", {
  id: uuid("id").primaryKey().defaultRandom(),
  medicineId: uuid("medicine_id").notNull(),
  branchId: uuid("branch_id").notNull(),
  batchNumber: text("batch_number").notNull(),
  expiryDate: date("expiry_date", { mode: "string" }).notNull(),
  manufacturingDate: date("manufacturing_date", { mode: "string" }),
  quantity: integer("quantity").notNull().default(0),
  purchasePrice: numeric("purchase_price", { precision: 10, scale: 2 }).notNull(),
  sellingPrice: numeric("selling_price", { precision: 10, scale: 2 }).notNull(),
  supplierId: uuid("supplier_id"),
  grnId: uuid("grn_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertBatchSchema = createInsertSchema(batchesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBatch = z.infer<typeof insertBatchSchema>;
export type Batch = typeof batchesTable.$inferSelect;
