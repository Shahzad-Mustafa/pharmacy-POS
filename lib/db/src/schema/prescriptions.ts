import { pgTable, text, timestamp, uuid, date, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const prescriptionsTable = pgTable("prescriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: uuid("patient_id"),
  doctorId: uuid("doctor_id"),
  prescriberName: text("prescriber_name"),
  prescriberLicense: text("prescriber_license"),
  prescriptionDate: date("prescription_date", { mode: "string" }).notNull(),
  prescriptionNumber: text("prescription_number"),
  hospitalWard: text("hospital_ward"),
  status: text("status").notNull().default("received"),
  source: text("source").notNull().default("manual"),
  items: jsonb("items").notNull().default([]),
  notes: text("notes"),
  branchId: uuid("branch_id"),
  verifiedBy: uuid("verified_by"),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  dispensedAt: timestamp("dispensed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPrescriptionSchema = createInsertSchema(prescriptionsTable).omit({ id: true, createdAt: true, updatedAt: true, verifiedAt: true, dispensedAt: true });
export type InsertPrescription = z.infer<typeof insertPrescriptionSchema>;
export type Prescription = typeof prescriptionsTable.$inferSelect;
