import { Router } from "express";
import { db } from "@workspace/db";
import { suppliersTable, purchaseOrdersTable, grnsTable, salesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth";

const router = Router();

router.get("/suppliers", requireAuth, async (req, res) => {
  const { page = 1, per_page = 20, is_active } = req.query as Record<string, string>;
  const all = await db.select().from(suppliersTable);
  const filtered = is_active !== undefined ? all.filter((s) => String(s.isActive) === is_active) : all;
  const pg = Number(page), pp = Number(per_page);
  res.json({ data: filtered.slice((pg - 1) * pp, pg * pp), total: filtered.length, page: pg, per_page: pp, total_pages: Math.ceil(filtered.length / pp) });
});

router.post("/suppliers", requireAuth, requireRole("admin", "super_admin"), async (req, res) => {
  const body = req.body;
  const [supplier] = await db.insert(suppliersTable).values({
    name: body.name,
    contactPerson: body.contact_person ?? null,
    phone: body.phone ?? null,
    email: body.email ?? null,
    address: body.address ?? null,
    licenseNumber: body.license_number ?? null,
    ntn: body.ntn ?? null,
    creditDays: body.credit_days ?? 30,
    paymentTerms: body.payment_terms ?? null,
    notes: body.notes ?? null,
  }).returning();
  res.status(201).json(supplier);
});

router.get("/suppliers/:supplierId", requireAuth, async (req, res) => {
  const [supplier] = await db.select().from(suppliersTable).where(eq(suppliersTable.id, String(req.params.supplierId)));
  if (!supplier) { res.status(404).json({ error: "Supplier not found" }); return; }
  res.json(supplier);
});

router.put("/suppliers/:supplierId", requireAuth, requireRole("admin", "super_admin"), async (req, res) => {
  const body = req.body;
  const [supplier] = await db.update(suppliersTable).set({
    ...(body.name && { name: body.name }),
    ...(body.contact_person !== undefined && { contactPerson: body.contact_person }),
    ...(body.phone !== undefined && { phone: body.phone }),
    ...(body.email !== undefined && { email: body.email }),
    ...(body.is_active !== undefined && { isActive: body.is_active }),
    ...(body.credit_days !== undefined && { creditDays: body.credit_days }),
  }).where(eq(suppliersTable.id, String(req.params.supplierId))).returning();
  if (!supplier) { res.status(404).json({ error: "Supplier not found" }); return; }
  res.json(supplier);
});

router.get("/suppliers/purchase-orders", requireAuth, async (req, res) => {
  const { supplier_id, branch_id, status, page = 1, per_page = 20 } = req.query as Record<string, string>;
  const all = await db.select().from(purchaseOrdersTable);
  const filtered = all.filter((po) => {
    if (supplier_id && po.supplierId !== supplier_id) return false;
    if (branch_id && po.branchId !== branch_id) return false;
    if (status && po.status !== status) return false;
    return true;
  });
  const pg = Number(page), pp = Number(per_page);
  res.json({ data: filtered.slice((pg - 1) * pp, pg * pp), total: filtered.length, page: pg, per_page: pp, total_pages: Math.ceil(filtered.length / pp) });
});

router.post("/suppliers/purchase-orders", requireAuth, async (req, res) => {
  const body = req.body;
  const authUser = (req as typeof req & { user: { branchId: string | null } }).user;
  const poNumber = `PO-${new Date().getFullYear()}-${Math.floor(Math.random() * 100000).toString().padStart(5, "0")}`;
  const items = body.items ?? [];
  const totalAmount = items.reduce((s: number, i: { quantity: number; unit_price: number }) => s + (i.quantity * Number(i.unit_price)), 0);
  const [po] = await db.insert(purchaseOrdersTable).values({
    poNumber,
    supplierId: body.supplier_id,
    branchId: body.branch_id ?? authUser.branchId ?? "",
    status: "draft",
    orderDate: body.order_date ?? new Date().toISOString().split("T")[0],
    expectedDate: body.expected_date ?? null,
    items,
    totalAmount: totalAmount.toFixed(2),
    notes: body.notes ?? null,
  }).returning();
  res.status(201).json(po);
});

router.get("/suppliers/purchase-orders/:poId", requireAuth, async (req, res) => {
  const [po] = await db.select().from(purchaseOrdersTable).where(eq(purchaseOrdersTable.id, String(req.params.poId)));
  if (!po) { res.status(404).json({ error: "PO not found" }); return; }
  const [supplier] = await db.select({ name: suppliersTable.name }).from(suppliersTable).where(eq(suppliersTable.id, po.supplierId));
  res.json({ ...po, supplier_name: supplier?.name ?? null });
});

router.post("/suppliers/grns", requireAuth, async (req, res) => {
  const body = req.body;
  const authUser = (req as typeof req & { user: { id: string; branchId: string | null } }).user;
  const grnNumber = `GRN-${new Date().getFullYear()}-${Math.floor(Math.random() * 100000).toString().padStart(5, "0")}`;
  const items = body.items ?? [];
  const totalAmount = items.reduce((s: number, i: { quantity: number; unit_price: number }) => s + (i.quantity * Number(i.unit_price)), 0);
  const [grn] = await db.insert(grnsTable).values({
    grnNumber,
    poId: body.po_id ?? null,
    supplierId: body.supplier_id,
    branchId: body.branch_id ?? authUser.branchId ?? "",
    receivedDate: body.received_date ?? new Date().toISOString().split("T")[0],
    supplierInvoiceNumber: body.supplier_invoice_number ?? null,
    receivedBy: authUser.id,
    items,
    totalAmount: totalAmount.toFixed(2),
    notes: body.notes ?? null,
  }).returning();
  res.status(201).json(grn);
});

router.get("/suppliers/grns", requireAuth, async (req, res) => {
  const { supplier_id, branch_id, page = 1, per_page = 20 } = req.query as Record<string, string>;
  const all = await db.select().from(grnsTable);
  const filtered = all.filter((g) => {
    if (supplier_id && g.supplierId !== supplier_id) return false;
    if (branch_id && g.branchId !== branch_id) return false;
    return true;
  });
  const pg = Number(page), pp = Number(per_page);
  res.json({ data: filtered.slice((pg - 1) * pp, pg * pp), total: filtered.length, page: pg, per_page: pp, total_pages: Math.ceil(filtered.length / pp) });
});

router.get("/suppliers/payables-aging", requireAuth, async (req, res) => {
  const { branch_id } = req.query as Record<string, string>;
  const suppliers = await db.select().from(suppliersTable).where(eq(suppliersTable.isActive, true));
  const aging = suppliers.map((s) => ({
    supplier_id: s.id,
    supplier_name: s.name,
    current: 0,
    days_1_30: 0,
    days_31_60: 0,
    days_61_90: 0,
    over_90: 0,
    total: 0,
  }));
  res.json(aging);
});

export default router;
