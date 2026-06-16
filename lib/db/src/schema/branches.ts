import { pgTable, text, boolean, numeric, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const branchesTable = pgTable("branches", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  address: text("address"),
  phone: text("phone"),
  licenseNumber: text("license_number"),
  managerId: uuid("manager_id"),
  isActive: boolean("is_active").notNull().default(true),
  taxRate: numeric("tax_rate", { precision: 5, scale: 4 }).notNull().default("0.17"),
  mrpEnforcement: boolean("mrp_enforcement").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertBranchSchema = createInsertSchema(branchesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBranch = z.infer<typeof insertBranchSchema>;
export type Branch = typeof branchesTable.$inferSelect;
