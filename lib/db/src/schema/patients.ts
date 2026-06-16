import { pgTable, text, boolean, numeric, timestamp, uuid, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const patientsTable = pgTable("patients", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  dob: date("dob", { mode: "string" }),
  gender: text("gender"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  cnic: text("cnic").unique(),
  allergies: text("allergies").array().notNull().default([]),
  chronicConditions: text("chronic_conditions").array().notNull().default([]),
  chronicMedications: text("chronic_medications").array().notNull().default([]),
  customerType: text("customer_type").notNull().default("retail"),
  bloodGroup: text("blood_group"),
  insuranceProviderId: uuid("insurance_provider_id"),
  insuranceMemberId: text("insurance_member_id"),
  mrn: text("mrn"),
  ward: text("ward"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPatientSchema = createInsertSchema(patientsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type Patient = typeof patientsTable.$inferSelect;
