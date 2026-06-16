import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable, branchesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { generateToken, requireAuth } from "../lib/auth";
import { logger } from "../lib/logger";

const router = Router();

router.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Email and password required" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!user || !user.isActive) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  await db.update(usersTable).set({ lastLogin: new Date() }).where(eq(usersTable.id, user.id));

  let branchName = null;
  if (user.branchId) {
    const [branch] = await db.select({ name: branchesTable.name }).from(branchesTable).where(eq(branchesTable.id, user.branchId));
    branchName = branch?.name ?? null;
  }

  const token = generateToken(user.id, user.role, user.branchId ?? null);
  logger.info({ userId: user.id, role: user.role }, "User logged in");

  res.json({
    access_token: token,
    token_type: "Bearer",
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      branch_id: user.branchId,
      branch_name: branchName,
      permissions: user.permissions,
    },
  });
});

router.post("/auth/logout", requireAuth, async (req, res) => {
  res.json({ message: "Logged out successfully" });
});

router.get("/auth/me", requireAuth, async (req, res) => {
  const user = (req as typeof req & { user: typeof usersTable.$inferSelect }).user;
  let branchName = null;
  if (user.branchId) {
    const [branch] = await db.select({ name: branchesTable.name }).from(branchesTable).where(eq(branchesTable.id, user.branchId));
    branchName = branch?.name ?? null;
  }
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    branch_id: user.branchId,
    branch_name: branchName,
    permissions: user.permissions,
    last_login: user.lastLogin,
  });
});

export default router;
