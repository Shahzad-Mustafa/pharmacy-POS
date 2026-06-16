import { Router } from "express";
import { db } from "@workspace/db";
import { medicinesTable, batchesTable } from "@workspace/db";
import { eq, ilike, sql, and, lte } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth";

const router = Router();

router.get("/medicines", requireAuth, async (req, res) => {
  const { page = 1, per_page = 20, category, requires_prescription, q } = req.query as Record<string, string>;
  const all = await db.select().from(medicinesTable);
  const filtered = all.filter((m) => {
    if (category && m.category !== category) return false;
    if (requires_prescription !== undefined && String(m.requiresPrescription) !== requires_prescription) return false;
    if (q && !m.name.toLowerCase().includes(q.toLowerCase()) && !m.genericName?.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });
  const pg = Number(page), pp = Number(per_page);
  const paginated = filtered.slice((pg - 1) * pp, pg * pp);
  res.json({ data: paginated, total: filtered.length, page: pg, per_page: pp, total_pages: Math.ceil(filtered.length / pp) });
});

router.post("/medicines", requireAuth, requireRole("admin", "pharmacist", "super_admin"), async (req, res) => {
  const body = req.body;
  const [med] = await db.insert(medicinesTable).values({
    name: body.name,
    genericName: body.generic_name,
    brand: body.brand,
    composition: body.composition,
    category: body.category,
    manufacturer: body.manufacturer,
    strength: body.strength,
    form: body.form,
    unit: body.unit,
    packSize: body.pack_size,
    barcode: body.barcode,
    mrp: String(body.mrp),
    requiresPrescription: body.requires_prescription ?? false,
    isEssentialMedicine: body.is_essential_medicine ?? false,
    minStockLevel: body.min_stock_level,
    reorderPoint: body.reorder_point,
    storageConditions: body.storage_conditions,
  }).returning();
  res.status(201).json(med);
});

router.get("/medicines/search", requireAuth, async (req, res) => {
  const { q = "", branch_id } = req.query as Record<string, string>;
  if (!q) { res.json([]); return; }

  const meds = await db.select().from(medicinesTable).where(
    and(eq(medicinesTable.isActive, true), ilike(medicinesTable.name, `%${q}%`))
  ).limit(20);

  const results = await Promise.all(meds.map(async (m) => {
    const [batch] = branch_id
      ? await db.select({ quantity: batchesTable.quantity, sellingPrice: batchesTable.sellingPrice })
          .from(batchesTable).where(and(eq(batchesTable.medicineId, m.id), eq(batchesTable.branchId, branch_id))).limit(1)
      : [];
    return { id: m.id, name: m.name, generic_name: m.genericName, brand: m.brand, strength: m.strength,
      form: m.form, mrp: m.mrp, requires_prescription: m.requiresPrescription, current_stock: batch?.quantity ?? 0,
      selling_price: batch?.sellingPrice ?? m.mrp, category: m.category, barcode: m.barcode };
  }));
  res.json(results);
});

router.get("/medicines/low-stock", requireAuth, async (req, res) => {
  const { branch_id, threshold = 10 } = req.query as Record<string, string>;
  const batches = await db.select({
    medicineId: batchesTable.medicineId,
    medicineName: medicinesTable.name,
    genericName: medicinesTable.genericName,
    quantity: batchesTable.quantity,
    minStockLevel: medicinesTable.minStockLevel,
    category: medicinesTable.category,
    branchId: batchesTable.branchId,
  }).from(batchesTable).leftJoin(medicinesTable, eq(batchesTable.medicineId, medicinesTable.id));

  const filtered = batches.filter((b) => {
    if (branch_id && b.branchId !== branch_id) return false;
    const limit = b.minStockLevel ?? Number(threshold);
    return (b.quantity ?? 0) <= limit;
  });
  res.json(filtered);
});

router.get("/medicines/expiring", requireAuth, async (req, res) => {
  const { days = 90, branch_id } = req.query as Record<string, string>;
  const threshold = new Date();
  threshold.setDate(threshold.getDate() + Number(days));
  const thresholdStr = threshold.toISOString().split("T")[0];

  const batches = await db.select({
    batchId: batchesTable.id,
    medicineId: batchesTable.medicineId,
    medicineName: medicinesTable.name,
    batchNumber: batchesTable.batchNumber,
    expiryDate: batchesTable.expiryDate,
    quantity: batchesTable.quantity,
    branchId: batchesTable.branchId,
  }).from(batchesTable).leftJoin(medicinesTable, eq(batchesTable.medicineId, medicinesTable.id))
    .where(lte(batchesTable.expiryDate, thresholdStr));

  const filtered = branch_id ? batches.filter((b) => b.branchId === branch_id) : batches;
  res.json(filtered);
});

router.get("/medicines/categories", requireAuth, async (req, res) => {
  const meds = await db.select({ category: medicinesTable.category }).from(medicinesTable);
  const cats = [...new Set(meds.map((m) => m.category).filter(Boolean))];
  res.json(cats.map((c) => ({ name: c, medicine_count: meds.filter((m) => m.category === c).length })));
});

router.get("/medicines/:medicineId", requireAuth, async (req, res) => {
  const [med] = await db.select().from(medicinesTable).where(eq(medicinesTable.id, String(req.params.medicineId)));
  if (!med) { res.status(404).json({ error: "Medicine not found" }); return; }
  res.json(med);
});

router.put("/medicines/:medicineId", requireAuth, requireRole("admin", "pharmacist", "super_admin"), async (req, res) => {
  const body = req.body;
  const [med] = await db.update(medicinesTable).set({
    ...(body.name && { name: body.name }),
    ...(body.generic_name !== undefined && { genericName: body.generic_name }),
    ...(body.brand !== undefined && { brand: body.brand }),
    ...(body.mrp !== undefined && { mrp: String(body.mrp) }),
    ...(body.requires_prescription !== undefined && { requiresPrescription: body.requires_prescription }),
    ...(body.category !== undefined && { category: body.category }),
    ...(body.is_active !== undefined && { isActive: body.is_active }),
    ...(body.min_stock_level !== undefined && { minStockLevel: body.min_stock_level }),
    ...(body.reorder_point !== undefined && { reorderPoint: body.reorder_point }),
  }).where(eq(medicinesTable.id, String(req.params.medicineId))).returning();
  if (!med) { res.status(404).json({ error: "Medicine not found" }); return; }
  res.json(med);
});

router.delete("/medicines/:medicineId", requireAuth, requireRole("admin", "super_admin"), async (req, res) => {
  const [med] = await db.update(medicinesTable).set({ isActive: false }).where(eq(medicinesTable.id, String(req.params.medicineId))).returning();
  if (!med) { res.status(404).json({ error: "Medicine not found" }); return; }
  res.json({ message: "Medicine deactivated", id: med.id });
});

export default router;
