import { Router } from "express";
import { db } from "@workspace/db";
import { salesTable, batchesTable, medicinesTable, prescriptionsTable, patientsTable } from "@workspace/db";
import { eq, lte, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

router.get("/dashboard/overview", requireAuth, async (req, res) => {
  const { branch_id } = req.query as Record<string, string>;
  const today = new Date().toISOString().split("T")[0];

  const allSales = await db.select().from(salesTable);
  const todaySales = allSales.filter((s) => {
    const sDate = s.createdAt.toISOString().split("T")[0];
    if (sDate !== today) return false;
    if (branch_id && s.branchId !== branch_id) return false;
    return true;
  });
  const revenue = todaySales.reduce((s, sale) => s + Number(sale.total), 0);

  const allPatients = await db.select().from(patientsTable);
  const allPrescriptions = await db.select().from(prescriptionsTable);
  const pendingRx = allPrescriptions.filter((rx) => rx.status === "received" || rx.status === "verified");

  res.json({
    revenue_today: revenue.toFixed(2),
    transactions_today: todaySales.length,
    total_patients: allPatients.length,
    pending_prescriptions: pendingRx.length,
    avg_transaction: todaySales.length ? (revenue / todaySales.length).toFixed(2) : "0",
  });
});

router.get("/dashboard/alerts", requireAuth, async (req, res) => {
  const { branch_id } = req.query as Record<string, string>;

  const expiryThreshold = new Date();
  expiryThreshold.setDate(expiryThreshold.getDate() + 90);
  const expiryStr = expiryThreshold.toISOString().split("T")[0];
  const today = new Date().toISOString().split("T")[0];

  const batches = await db.select({
    id: batchesTable.id,
    medicineId: batchesTable.medicineId,
    medicineName: medicinesTable.name,
    quantity: batchesTable.quantity,
    expiryDate: batchesTable.expiryDate,
    minStockLevel: medicinesTable.minStockLevel,
    branchId: batchesTable.branchId,
  }).from(batchesTable).leftJoin(medicinesTable, eq(batchesTable.medicineId, medicinesTable.id));

  const filtered = branch_id ? batches.filter((b) => b.branchId === branch_id) : batches;

  const lowStock = filtered.filter((b) => (b.quantity ?? 0) <= (b.minStockLevel ?? 10));
  const expiring = filtered.filter((b) => b.expiryDate && b.expiryDate <= expiryStr && b.expiryDate >= today);
  const expired = filtered.filter((b) => b.expiryDate && b.expiryDate < today);

  const allRx = await db.select().from(prescriptionsTable);
  const pending = allRx.filter((rx) => rx.status === "received");

  res.json({
    low_stock_count: lowStock.length,
    expiring_soon_count: expiring.length,
    expired_count: expired.length,
    pending_prescriptions: pending.length,
    low_stock_items: lowStock.slice(0, 10),
    expiring_items: expiring.slice(0, 10),
  });
});

router.get("/dashboard/top-medicines", requireAuth, async (req, res) => {
  const { branch_id, limit = 10 } = req.query as Record<string, string>;
  const allSales = await db.select().from(salesTable);
  const filtered = branch_id ? allSales.filter((s) => s.branchId === branch_id) : allSales;

  const medicineCount: Record<string, { name: string; quantity: number; revenue: number }> = {};
  for (const sale of filtered) {
    const items = Array.isArray(sale.items) ? sale.items as Array<{ medicine_id?: string; medicine_name?: string; quantity?: number; line_total?: number }> : [];
    for (const item of items) {
      const id = item.medicine_id ?? "unknown";
      if (!medicineCount[id]) medicineCount[id] = { name: item.medicine_name ?? "Unknown", quantity: 0, revenue: 0 };
      medicineCount[id].quantity += item.quantity ?? 0;
      medicineCount[id].revenue += Number(item.line_total ?? 0);
    }
  }

  const sorted = Object.entries(medicineCount)
    .map(([id, v]) => ({ medicine_id: id, medicine_name: v.name, quantity_sold: v.quantity, revenue: v.revenue.toFixed(2) }))
    .sort((a, b) => b.quantity_sold - a.quantity_sold)
    .slice(0, Number(limit));

  res.json(sorted);
});

router.get("/dashboard/revenue-trend", requireAuth, async (req, res) => {
  const { branch_id, days = 30 } = req.query as Record<string, string>;
  const numDays = Number(days);

  const trend = [];
  for (let i = numDays - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    trend.push({ date: d.toISOString().split("T")[0], revenue: 0, transactions: 0 });
  }

  const allSales = await db.select().from(salesTable);
  const filtered = branch_id ? allSales.filter((s) => s.branchId === branch_id) : allSales;

  for (const sale of filtered) {
    const sDate = sale.createdAt.toISOString().split("T")[0];
    const day = trend.find((t) => t.date === sDate);
    if (day) { day.revenue += Number(sale.total); day.transactions += 1; }
  }

  res.json(trend.map((t) => ({ ...t, revenue: t.revenue.toFixed(2) })));
});

export default router;
