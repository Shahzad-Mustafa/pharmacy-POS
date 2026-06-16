import { pgTable, text, boolean, integer, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const suppliersTable = pgTable("suppliers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  contactPerson: text("contact_person"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  licenseNumber: text("license_number"),
  ntn: text("ntn"),
  creditDays: integer("credit_days").default(30),
  paymentTerms: text("payment_terms"),
  isActive: boolean("is_active").notNull().default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSupplierSchema = createInsertSchema(suppliersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type Supplier = typeof suppliersTable.$inferSelect;
