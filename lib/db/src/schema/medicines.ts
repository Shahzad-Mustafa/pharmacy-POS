import { pgTable, text, boolean, numeric, integer, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const medicinesTable = pgTable("medicines", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  genericName: text("generic_name"),
  brand: text("brand"),
  composition: text("composition"),
  category: text("category"),
  manufacturer: text("manufacturer"),
  strength: text("strength"),
  form: text("form"),
  unit: text("unit"),
  packSize: integer("pack_size"),
  barcode: text("barcode").unique(),
  drapRegistrationNo: text("drap_registration_no"),
  mrp: numeric("mrp", { precision: 10, scale: 2 }).notNull(),
  requiresPrescription: boolean("requires_prescription").notNull().default(false),
  controlledSubstanceSchedule: text("controlled_substance_schedule"),
  isEssentialMedicine: boolean("is_essential_medicine").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  minStockLevel: integer("min_stock_level"),
  reorderPoint: integer("reorder_point"),
  storageConditions: text("storage_conditions"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertMedicineSchema = createInsertSchema(medicinesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMedicine = z.infer<typeof insertMedicineSchema>;
export type Medicine = typeof medicinesTable.$inferSelect;
