import { Router } from "express";
import { db } from "@workspace/db";
import { batchesTable, medicinesTable, stockAdjustmentsTable } from "@workspace/db";
import { eq, and, sql, lte } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

router.get("/inventory/overview", requireAuth, async (req, res) => {
  const { branch_id } = req.query as Record<string, string>;
  const batches = await db.select({
    batchId: batchesTable.id,
    medicineId: batchesTable.medicineId,
    medicineName: medicinesTable.name,
    category: medicinesTable.category,
    batchNumber: batchesTable.batchNumber,
    quantity: batchesTable.quantity,
    expiryDate: batchesTable.expiryDate,
    sellingPrice: batchesTable.sellingPrice,
    purchasePrice: batchesTable.purchasePrice,
    branchId: batchesTable.branchId,
  }).from(batchesTable).leftJoin(medicinesTable, eq(batchesTable.medicineId, medicinesTable.id));

  const filtered = branch_id ? batches.filter((b) => b.branchId === branch_id) : batches;
  res.json(filtered);
});

router.get("/inventory/batches", requireAuth, async (req, res) => {
  const { medicine_id, branch_id, page = 1, per_page = 20 } = req.query as Record<string, string>;
  const batches = await db.select({
    id: batchesTable.id,
    medicineId: batchesTable.medicineId,
    medicineName: medicinesTable.name,
    batchNumber: batchesTable.batchNumber,
    expiryDate: batchesTable.expiryDate,
    quantity: batchesTable.quantity,
    purchasePrice: batchesTable.purchasePrice,
    sellingPrice: batchesTable.sellingPrice,
    branchId: batchesTable.branchId,
    createdAt: batchesTable.createdAt,
  }).from(batchesTable).leftJoin(medicinesTable, eq(batchesTable.medicineId, medicinesTable.id));

  const filtered = batches.filter((b) => {
    if (medicine_id && b.medicineId !== medicine_id) return false;
    if (branch_id && b.branchId !== branch_id) return false;
    return true;
  });
  const pg = Number(page), pp = Number(per_page);
  res.json({ data: filtered.slice((pg - 1) * pp, pg * pp), total: filtered.length, page: pg, per_page: pp, total_pages: Math.ceil(filtered.length / pp) });
});

router.post("/inventory/batches", requireAuth, async (req, res) => {
  const body = req.body;
  const [batch] = await db.insert(batchesTable).values({
    medicineId: body.medicine_id,
    branchId: body.branch_id,
    batchNumber: body.batch_number,
    expiryDate: body.expiry_date,
    manufacturingDate: body.manufacturing_date ?? null,
    quantity: body.quantity,
    purchasePrice: String(body.purchase_price),
    sellingPrice: String(body.selling_price),
    supplierId: body.supplier_id ?? null,
    grnId: body.grn_id ?? null,
  }).returning();
  res.status(201).json(batch);
});

router.post("/inventory/adjustments", requireAuth, async (req, res) => {
  const body = req.body;
  const authUser = (req as typeof req & { user: { id: string } }).user;
  const [batch] = await db.select().from(batchesTable).where(eq(batchesTable.id, body.batch_id));
  if (!batch) { res.status(404).json({ error: "Batch not found" }); return; }

  const newQty = batch.quantity + body.quantity_change;
  await db.update(batchesTable).set({ quantity: newQty }).where(eq(batchesTable.id, body.batch_id));

  const [adjustment] = await db.insert(stockAdjustmentsTable).values({
    batchId: body.batch_id,
    branchId: body.branch_id ?? batch.branchId,
    adjustmentType: body.adjustment_type,
    quantityChange: body.quantity_change,
    reason: body.reason,
    reference: body.reference ?? null,
    createdBy: authUser.id,
  }).returning();

  res.status(201).json({ ...adjustment, new_quantity: newQty });
});

router.get("/inventory/adjustments", requireAuth, async (req, res) => {
  const { branch_id, page = 1, per_page = 20 } = req.query as Record<string, string>;
  const adjustments = await db.select().from(stockAdjustmentsTable);
  const filtered = branch_id ? adjustments.filter((a) => a.branchId === branch_id) : adjustments;
  const pg = Number(page), pp = Number(per_page);
  res.json({ data: filtered.slice((pg - 1) * pp, pg * pp), total: filtered.length });
});

router.get("/inventory/valuation", requireAuth, async (req, res) => {
  const { branch_id } = req.query as Record<string, string>;
  const batches = await db.select({
    quantity: batchesTable.quantity,
    purchasePrice: batchesTable.purchasePrice,
    sellingPrice: batchesTable.sellingPrice,
    branchId: batchesTable.branchId,
  }).from(batchesTable);
  const filtered = branch_id ? batches.filter((b) => b.branchId === branch_id) : batches;

  const totalCost = filtered.reduce((s, b) => s + (b.quantity * Number(b.purchasePrice)), 0);
  const totalRetail = filtered.reduce((s, b) => s + (b.quantity * Number(b.sellingPrice)), 0);
  res.json({ total_cost_value: totalCost.toFixed(2), total_retail_value: totalRetail.toFixed(2), total_units: filtered.reduce((s, b) => s + b.quantity, 0) });
});

router.get("/inventory/reorder-suggestions", requireAuth, async (req, res) => {
  const { branch_id } = req.query as Record<string, string>;
  const batches = await db.select({
    medicineId: batchesTable.medicineId,
    medicineName: medicinesTable.name,
    category: medicinesTable.category,
    quantity: batchesTable.quantity,
    reorderPoint: medicinesTable.reorderPoint,
    minStockLevel: medicinesTable.minStockLevel,
    branchId: batchesTable.branchId,
  }).from(batchesTable).leftJoin(medicinesTable, eq(batchesTable.medicineId, medicinesTable.id));

  const filtered = batches.filter((b) => {
    if (branch_id && b.branchId !== branch_id) return false;
    const rp = b.reorderPoint ?? b.minStockLevel ?? 10;
    return (b.quantity ?? 0) <= rp;
  });

  const grouped = Object.values(filtered.reduce((acc, b) => {
    if (!acc[b.medicineId ?? ""]) acc[b.medicineId ?? ""] = { ...b, suggested_order_qty: 50 };
    return acc;
  }, {} as Record<string, typeof filtered[0] & { suggested_order_qty: number }>));

  res.json(grouped);
});

export default router;
