import { Router } from "express";
import { db } from "@workspace/db";
import { salesTable, patientsTable, batchesTable } from "@workspace/db";
import { eq, and, gte, lte } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

function generateInvoice(): string {
  const date = new Date();
  const ymd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  return `INV-${ymd}-${Math.floor(Math.random() * 100000).toString().padStart(5, "0")}`;
}

router.post("/sales", requireAuth, async (req, res) => {
  const body = req.body;
  const authUser = (req as typeof req & { user: { id: string; branchId: string | null } }).user;

  const items = body.items ?? [];
  let subtotal = 0;
  const processedItems = [];

  for (const item of items) {
    const qty = item.quantity ?? 1;
    const price = Number(item.unit_price ?? 0);
    const discount = Number(item.discount ?? 0);
    const lineTotal = qty * price - discount;
    subtotal += lineTotal;
    processedItems.push({ ...item, line_total: lineTotal });

    if (item.batch_id) {
      const [batch] = await db.select().from(batchesTable).where(eq(batchesTable.id, item.batch_id));
      if (batch) {
        await db.update(batchesTable).set({ quantity: Math.max(0, batch.quantity - qty) }).where(eq(batchesTable.id, item.batch_id));
      }
    }
  }

  const discount = Number(body.discount ?? 0);
  const taxRate = 0;
  const tax = (subtotal - discount) * taxRate;
  const total = subtotal - discount + tax;
  const amountTendered = Number(body.amount_tendered ?? total);
  const change = Math.max(0, amountTendered - total);

  const [sale] = await db.insert(salesTable).values({
    invoiceNumber: generateInvoice(),
    branchId: body.branch_id ?? authUser.branchId ?? "",
    patientId: body.patient_id ?? null,
    prescriptionId: body.prescription_id ?? null,
    saleType: body.sale_type ?? "retail",
    cashierId: authUser.id,
    items: processedItems,
    subtotal: subtotal.toFixed(2),
    discount: discount.toFixed(2),
    tax: tax.toFixed(2),
    total: total.toFixed(2),
    paymentMethod: body.payment_method ?? "cash",
    amountTendered: amountTendered.toFixed(2),
    change: change.toFixed(2),
    status: "completed",
    notes: body.notes ?? null,
    ward: body.ward ?? null,
  }).returning();

  res.status(201).json(sale);
});

router.get("/sales", requireAuth, async (req, res) => {
  const { branch_id, patient_id, date_from, date_to, page = 1, per_page = 20, status, sale_type } = req.query as Record<string, string>;
  const all = await db.select().from(salesTable);
  const filtered = all.filter((s) => {
    if (branch_id && s.branchId !== branch_id) return false;
    if (patient_id && s.patientId !== patient_id) return false;
    if (status && s.status !== status) return false;
    if (sale_type && s.saleType !== sale_type) return false;
    if (date_from && new Date(s.createdAt) < new Date(date_from)) return false;
    if (date_to && new Date(s.createdAt) > new Date(date_to + "T23:59:59")) return false;
    return true;
  });
  const pg = Number(page), pp = Number(per_page);
  res.json({ data: filtered.slice((pg - 1) * pp, pg * pp), total: filtered.length, page: pg, per_page: pp, total_pages: Math.ceil(filtered.length / pp) });
});

router.post("/sales/calculate", requireAuth, async (req, res) => {
  const { items = [], discount = 0, tax_rate = 0 } = req.body;
  let subtotal = 0;
  for (const item of items) {
    subtotal += (item.quantity ?? 1) * Number(item.unit_price ?? 0) - Number(item.discount ?? 0);
  }
  const discountAmt = Number(discount);
  const tax = (subtotal - discountAmt) * Number(tax_rate);
  const total = subtotal - discountAmt + tax;
  res.json({ subtotal: subtotal.toFixed(2), discount: discountAmt.toFixed(2), tax: tax.toFixed(2), total: total.toFixed(2) });
});

router.get("/sales/kpis", requireAuth, async (req, res) => {
  const { branch_id, date } = req.query as Record<string, string>;
  const today = date ?? new Date().toISOString().split("T")[0];
  const all = await db.select().from(salesTable);
  const todaySales = all.filter((s) => {
    const sDate = s.createdAt.toISOString().split("T")[0];
    if (sDate !== today) return false;
    if (branch_id && s.branchId !== branch_id) return false;
    return true;
  });
  const revenue = todaySales.reduce((s, sale) => s + Number(sale.total), 0);
  res.json({ revenue_today: revenue.toFixed(2), transactions_today: todaySales.length, avg_transaction: todaySales.length ? (revenue / todaySales.length).toFixed(2) : "0" });
});

router.get("/sales/daily-summary", requireAuth, async (req, res) => {
  const { branch_id, date } = req.query as Record<string, string>;
  const today = date ?? new Date().toISOString().split("T")[0];
  const all = await db.select().from(salesTable);
  const todaySales = all.filter((s) => {
    const sDate = s.createdAt.toISOString().split("T")[0];
    if (sDate !== today) return false;
    if (branch_id && s.branchId !== branch_id) return false;
    return true;
  });
  const revenue = todaySales.reduce((s, sale) => s + Number(sale.total), 0);
  const byMethod = todaySales.reduce((acc, s) => {
    acc[s.paymentMethod] = (acc[s.paymentMethod] ?? 0) + Number(s.total);
    return acc;
  }, {} as Record<string, number>);
  res.json({ date: today, total_revenue: revenue.toFixed(2), total_transactions: todaySales.length, by_payment_method: byMethod });
});

router.get("/sales/held", requireAuth, async (req, res) => {
  const { branch_id } = req.query as Record<string, string>;
  const all = await db.select().from(salesTable).where(eq(salesTable.status, "held"));
  const filtered = branch_id ? all.filter((s) => s.branchId === branch_id) : all;
  res.json({ data: filtered, total: filtered.length });
});

router.get("/sales/:saleId", requireAuth, async (req, res) => {
  const [sale] = await db.select().from(salesTable).where(eq(salesTable.id, String(req.params.saleId)));
  if (!sale) { res.status(404).json({ error: "Sale not found" }); return; }
  let patientName = null;
  if (sale.patientId) {
    const [pt] = await db.select({ name: patientsTable.name }).from(patientsTable).where(eq(patientsTable.id, sale.patientId));
    patientName = pt?.name ?? null;
  }
  res.json({ ...sale, patient_name: patientName });
});

router.post("/sales/:saleId/refund", requireAuth, async (req, res) => {
  const [sale] = await db.update(salesTable).set({ status: "refunded" }).where(eq(salesTable.id, String(req.params.saleId))).returning();
  if (!sale) { res.status(404).json({ error: "Sale not found" }); return; }
  res.json({ message: "Sale refunded", id: sale.id, status: sale.status });
});

router.post("/sales/:saleId/hold", requireAuth, async (req, res) => {
  const [sale] = await db.update(salesTable).set({ status: "held" }).where(eq(salesTable.id, String(req.params.saleId))).returning();
  if (!sale) { res.status(404).json({ error: "Sale not found" }); return; }
  res.json({ message: "Sale put on hold", id: sale.id, status: sale.status });
});

export default router;
