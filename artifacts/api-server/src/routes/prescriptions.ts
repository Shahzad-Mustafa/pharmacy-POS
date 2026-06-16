import { Router } from "express";
import { db } from "@workspace/db";
import { prescriptionsTable, patientsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

router.get("/prescriptions", requireAuth, async (req, res) => {
  const { status, patient_id, branch_id, page = 1, per_page = 20 } = req.query as Record<string, string>;
  const all = await db.select().from(prescriptionsTable);
  const filtered = all.filter((p) => {
    if (status && p.status !== status) return false;
    if (patient_id && p.patientId !== patient_id) return false;
    if (branch_id && p.branchId !== branch_id) return false;
    return true;
  });
  const pg = Number(page), pp = Number(per_page);
  const paginated = filtered.slice((pg - 1) * pp, pg * pp);

  const withPatient = await Promise.all(paginated.map(async (rx) => {
    let patientName = null;
    if (rx.patientId) {
      const [pt] = await db.select({ name: patientsTable.name }).from(patientsTable).where(eq(patientsTable.id, rx.patientId));
      patientName = pt?.name ?? null;
    }
    return { ...rx, patient_name: patientName };
  }));

  res.json({ data: withPatient, total: filtered.length, page: pg, per_page: pp, total_pages: Math.ceil(filtered.length / pp) });
});

router.post("/prescriptions", requireAuth, async (req, res) => {
  const body = req.body;
  const authUser = (req as typeof req & { user: { branchId: string | null } }).user;
  const [rx] = await db.insert(prescriptionsTable).values({
    patientId: body.patient_id ?? null,
    prescriberName: body.prescriber_name ?? null,
    prescriberLicense: body.prescriber_license ?? null,
    prescriptionDate: body.prescription_date ?? new Date().toISOString().split("T")[0],
    prescriptionNumber: body.prescription_number ?? null,
    hospitalWard: body.hospital_ward ?? null,
    status: "received",
    source: body.source ?? "manual",
    items: body.items ?? [],
    notes: body.notes ?? null,
    branchId: body.branch_id ?? authUser.branchId ?? null,
  }).returning();
  res.status(201).json(rx);
});

router.get("/prescriptions/stats", requireAuth, async (req, res) => {
  const { branch_id } = req.query as Record<string, string>;
  const all = await db.select().from(prescriptionsTable);
  const filtered = branch_id ? all.filter((p) => p.branchId === branch_id) : all;
  const byStatus = filtered.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  res.json({ total: filtered.length, by_status: byStatus });
});

router.get("/prescriptions/:prescriptionId", requireAuth, async (req, res) => {
  const [rx] = await db.select().from(prescriptionsTable).where(eq(prescriptionsTable.id, String(req.params.prescriptionId)));
  if (!rx) { res.status(404).json({ error: "Prescription not found" }); return; }
  let patientName = null;
  if (rx.patientId) {
    const [pt] = await db.select({ name: patientsTable.name }).from(patientsTable).where(eq(patientsTable.id, rx.patientId));
    patientName = pt?.name ?? null;
  }
  res.json({ ...rx, patient_name: patientName });
});

router.post("/prescriptions/:prescriptionId/verify", requireAuth, async (req, res) => {
  const authUser = (req as typeof req & { user: { id: string } }).user;
  const [rx] = await db.update(prescriptionsTable).set({
    status: "verified", verifiedBy: authUser.id, verifiedAt: new Date(),
  }).where(eq(prescriptionsTable.id, String(req.params.prescriptionId))).returning();
  if (!rx) { res.status(404).json({ error: "Prescription not found" }); return; }
  res.json(rx);
});

router.post("/prescriptions/:prescriptionId/dispense", requireAuth, async (req, res) => {
  const [rx] = await db.update(prescriptionsTable).set({
    status: "dispensed", dispensedAt: new Date(),
  }).where(eq(prescriptionsTable.id, String(req.params.prescriptionId))).returning();
  if (!rx) { res.status(404).json({ error: "Prescription not found" }); return; }
  res.json(rx);
});

export default router;
