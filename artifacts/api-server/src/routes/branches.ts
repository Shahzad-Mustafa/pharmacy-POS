import { Router } from "express";
import { db } from "@workspace/db";
import { branchesTable, usersTable, medicinesTable, batchesTable } from "@workspace/db";
import { eq, and, lt, lte, sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth";

const router = Router();

router.get("/branches", requireAuth, async (req, res) => {
  const { is_active } = req.query as Record<string, string>;
  const branches = await db.select().from(branchesTable);
  const filtered = is_active !== undefined ? branches.filter((b) => String(b.isActive) === is_active) : branches;
  res.json(filtered.map((b) => ({
    id: b.id, name: b.name, code: b.code, address: b.address, phone: b.phone, is_active: b.isActive,
    license_number: b.licenseNumber, manager_id: b.managerId, tax_rate: b.taxRate,
  })));
});

router.post("/branches", requireAuth, requireRole("admin", "super_admin"), async (req, res) => {
  const { name, code, address, phone, license_number, manager_id, tax_rate } = req.body;
  if (!name || !code) { res.status(400).json({ error: "name and code required" }); return; }
  const [branch] = await db.insert(branchesTable).values({
    name, code, address, phone, licenseNumber: license_number, managerId: manager_id,
    taxRate: tax_rate ? String(tax_rate) : "0.17",
  }).returning();
  res.status(201).json({ id: branch.id, name: branch.name, code: branch.code });
});

router.get("/branches/:branchId", requireAuth, async (req, res) => {
  const [branch] = await db.select().from(branchesTable).where(eq(branchesTable.id, String(req.params.branchId)));
  if (!branch) { res.status(404).json({ error: "Branch not found" }); return; }
  res.json({ id: branch.id, name: branch.name, code: branch.code, address: branch.address, phone: branch.phone,
    is_active: branch.isActive, license_number: branch.licenseNumber, tax_rate: branch.taxRate });
});

router.get("/branches/:branchId/dashboard", requireAuth, async (req, res) => {
  const branchId = String(req.params.branchId);

  const today = new Date().toISOString().split("T")[0];
  const [branch] = await db.select().from(branchesTable).where(eq(branchesTable.id, branchId));
  if (!branch) { res.status(404).json({ error: "Branch not found" }); return; }

  const expiryThreshold = new Date();
  expiryThreshold.setDate(expiryThreshold.getDate() + 90);
  const expiryStr = expiryThreshold.toISOString().split("T")[0];

  const [lowStockResult] = await db.select({ count: sql<number>`count(*)` })
    .from(batchesTable)
    .where(and(eq(batchesTable.branchId, branchId), lte(batchesTable.quantity, sql`5`)));

  const [expiringResult] = await db.select({ count: sql<number>`count(*)` })
    .from(batchesTable)
    .where(and(eq(batchesTable.branchId, branchId), lte(batchesTable.expiryDate, expiryStr), lt(sql`'${today}'`, batchesTable.expiryDate)));

  res.json({
    branch_id: branchId,
    branch_name: branch.name,
    total_revenue_today: 0,
    transactions_today: 0,
    active_patients: 0,
    pending_prescriptions: 0,
    low_stock_count: Number(lowStockResult?.count ?? 0),
    expiring_soon_count: Number(expiringResult?.count ?? 0),
  });
});

router.get("/branches/:branchId/stock-summary", requireAuth, async (req, res) => {
  const branchId = String(req.params.branchId);
  const batches = await db
    .select({
      batchId: batchesTable.id,
      medicineId: batchesTable.medicineId,
      medicineName: medicinesTable.name,
      batchNumber: batchesTable.batchNumber,
      quantity: batchesTable.quantity,
      expiryDate: batchesTable.expiryDate,
      sellingPrice: batchesTable.sellingPrice,
    })
    .from(batchesTable)
    .leftJoin(medicinesTable, eq(batchesTable.medicineId, medicinesTable.id))
    .where(eq(batchesTable.branchId, branchId));

  res.json({
    branch_id: branchId,
    total_skus: batches.length,
    total_units: batches.reduce((s, b) => s + (b.quantity ?? 0), 0),
    items: batches,
  });
});

export default router;
