import { type Request, type Response, type NextFunction } from "express";
import * as jwt from "jsonwebtoken";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

const JWT_SECRET = process.env.SESSION_SECRET ?? "dev-secret-change-in-prod";

export function generateToken(userId: string, role: string, branchId: string | null): string {
  return jwt.sign({ userId, role, branchId }, JWT_SECRET, { expiresIn: "8h" });
}

export function verifyToken(token: string): { userId: string; role: string; branchId: string | null } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; role: string; branchId: string | null };
  } catch {
    return null;
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, payload.userId));
  if (!user || !user.isActive) {
    res.status(401).json({ error: "User not found or inactive" });
    return;
  }

  (req as Request & { user: typeof user }).user = user;
  next();
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as Request & { user: { role: string } }).user;
    if (!user || !roles.includes(user.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
}

export { logger };
