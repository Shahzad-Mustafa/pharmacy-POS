import { Router } from "express";
import { db } from "@workspace/db";
import { patientsTable, salesTable } from "@workspace/db";
import { eq, ilike, or } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

router.get("/patients", requireAuth, async (req, res) => {
  const { page = 1, per_page = 20, customer_type } = req.query as Record<string, string>;
  const all = await db.select().from(patientsTable);
  const filtered = all.filter((p) => {
    if (customer_type && p.customerType !== customer_type) return false;
    return true;
  });
  const pg = Number(page), pp = Number(per_page);
  res.json({ data: filtered.slice((pg - 1) * pp, pg * pp), total: filtered.length, page: pg, per_page: pp, total_pages: Math.ceil(filtered.length / pp) });
});

router.post("/patients", requireAuth, async (req, res) => {
  const body = req.body;
  const [patient] = await db.insert(patientsTable).values({
    name: body.name,
    dob: body.dob ?? null,
    gender: body.gender ?? null,
    phone: body.phone ?? null,
    email: body.email ?? null,
    address: body.address ?? null,
    cnic: body.cnic ?? null,
    allergies: body.allergies ?? [],
    chronicConditions: body.chronic_conditions ?? [],
    chronicMedications: body.chronic_medications ?? [],
    customerType: body.customer_type ?? "retail",
    bloodGroup: body.blood_group ?? null,
    mrn: body.mrn ?? null,
    ward: body.ward ?? null,
  }).returning();
  res.status(201).json(patient);
});

router.get("/patients/search", requireAuth, async (req, res) => {
  const { q = "" } = req.query as Record<string, string>;
  if (!q) { res.json([]); return; }
  const patients = await db.select().from(patientsTable).where(
    or(ilike(patientsTable.name, `%${q}%`), ilike(patientsTable.phone ?? "", `%${q}%`))
  ).limit(20);
  res.json(patients);
});

router.get("/patients/:patientId", requireAuth, async (req, res) => {
  const [patient] = await db.select().from(patientsTable).where(eq(patientsTable.id, String(req.params.patientId)));
  if (!patient) { res.status(404).json({ error: "Patient not found" }); return; }
  res.json(patient);
});

router.put("/patients/:patientId", requireAuth, async (req, res) => {
  const body = req.body;
  const [patient] = await db.update(patientsTable).set({
    ...(body.name && { name: body.name }),
    ...(body.phone !== undefined && { phone: body.phone }),
    ...(body.email !== undefined && { email: body.email }),
    ...(body.allergies && { allergies: body.allergies }),
    ...(body.chronic_conditions && { chronicConditions: body.chronic_conditions }),
    ...(body.chronic_medications && { chronicMedications: body.chronic_medications }),
    ...(body.address !== undefined && { address: body.address }),
    ...(body.blood_group !== undefined && { bloodGroup: body.blood_group }),
    ...(body.ward !== undefined && { ward: body.ward }),
  }).where(eq(patientsTable.id, String(req.params.patientId))).returning();
  if (!patient) { res.status(404).json({ error: "Patient not found" }); return; }
  res.json(patient);
});

router.get("/patients/:patientId/history", requireAuth, async (req, res) => {
  const sales = await db.select().from(salesTable).where(eq(salesTable.patientId, String(req.params.patientId)));
  res.json({ patient_id: String(req.params.patientId), sales, total: sales.length });
});

export default router;
