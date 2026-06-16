import { pgTable, text, integer, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const stockAdjustmentsTable = pgTable("stock_adjustments", {
  id: uuid("id").primaryKey().defaultRandom(),
  batchId: uuid("batch_id").notNull(),
  branchId: uuid("branch_id").notNull(),
  adjustmentType: text("adjustment_type").notNull(),
  quantityChange: integer("quantity_change").notNull(),
  reason: text("reason").notNull(),
  reference: text("reference"),
  createdBy: uuid("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertStockAdjustmentSchema = createInsertSchema(stockAdjustmentsTable).omit({ id: true, createdAt: true });
export type InsertStockAdjustment = z.infer<typeof insertStockAdjustmentSchema>;
export type StockAdjustment = typeof stockAdjustmentsTable.$inferSelect;
