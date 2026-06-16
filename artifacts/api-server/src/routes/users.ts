import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable, branchesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth";

const router = Router();

router.get("/users", requireAuth, async (req, res) => {
  const { role, branch_id, page = 1, per_page = 20 } = req.query as Record<string, string>;
  const allUsers = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      role: usersTable.role,
      branchId: usersTable.branchId,
      phone: usersTable.phone,
      isActive: usersTable.isActive,
      permissions: usersTable.permissions,
      lastLogin: usersTable.lastLogin,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable);
  const filtered = allUsers.filter((u) => {
    if (role && u.role !== role) return false;
    if (branch_id && u.branchId !== branch_id) return false;
    return true;
  });

  const pg = Number(page);
  const pp = Number(per_page);
  const paginated = filtered.slice((pg - 1) * pp, pg * pp);

  const withBranch = await Promise.all(
    paginated.map(async (u) => {
      if (!u.branchId) return { ...u, branch_name: null };
      const [b] = await db.select({ name: branchesTable.name }).from(branchesTable).where(eq(branchesTable.id, u.branchId));
      return { ...u, branch_name: b?.name ?? null };
    })
  );

  res.json({
    data: withBranch,
    total: filtered.length,
    page: pg,
    per_page: pp,
    total_pages: Math.ceil(filtered.length / pp),
  });
});

router.post("/users", requireAuth, requireRole("admin", "super_admin"), async (req, res) => {
  const { name, email, password, role, branch_id, phone, permissions } = req.body;
  if (!name || !email || !password) {
    res.status(400).json({ error: "name, email, and password are required" });
    return;
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const [user] = await db.insert(usersTable).values({
    name,
    email,
    passwordHash,
    role: role ?? "cashier",
    branchId: branch_id ?? null,
    phone: phone ?? null,
    permissions: permissions ?? [],
  }).returning();
  res.status(201).json({ id: user.id, name: user.name, email: user.email, role: user.role, branch_id: user.branchId, is_active: user.isActive });
});

router.get("/users/:userId", requireAuth, async (req, res) => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, String(req.params.userId)));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  let branchName = null;
  if (user.branchId) {
    const [b] = await db.select({ name: branchesTable.name }).from(branchesTable).where(eq(branchesTable.id, user.branchId));
    branchName = b?.name ?? null;
  }
  res.json({ ...user, branch_name: branchName });
});

router.put("/users/:userId", requireAuth, requireRole("admin", "super_admin"), async (req, res) => {
  const { name, email, role, branch_id, phone, permissions } = req.body;
  const [user] = await db.update(usersTable).set({
    ...(name && { name }),
    ...(email && { email }),
    ...(role && { role }),
    ...(branch_id !== undefined && { branchId: branch_id }),
    ...(phone !== undefined && { phone }),
    ...(permissions && { permissions }),
  }).where(eq(usersTable.id, String(req.params.userId))).returning();
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
});

router.patch("/users/:userId/status", requireAuth, requireRole("admin", "super_admin"), async (req, res) => {
  const { is_active } = req.body;
  const [user] = await db.update(usersTable).set({ isActive: is_active }).where(eq(usersTable.id, String(req.params.userId))).returning();
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json({ id: user.id, is_active: user.isActive });
});

export default router;
