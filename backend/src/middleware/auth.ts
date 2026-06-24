import type { Request, Response, NextFunction } from "express";
import type { Role } from "@prisma/client";
import { verifyAccessToken, type JwtPayload } from "@/lib/jwt";
import prisma from "@/lib/prisma";

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

/**
 * Verifies the JWT access token from the Authorization header.
 * Attaches the decoded payload to req.user.
 */
export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing or invalid Authorization header" });
    }

    const token = header.split(" ")[1];
    const payload = verifyAccessToken(token);

    // Ensure user still exists & active
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || !user.isActive) {
      return res.status(401).json({ error: "User not found or inactive" });
    }

    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

/**
 * Role-based access control middleware.
 * Usage: authorize("ADMIN"), authorize("ADMIN", "ACCOUNTANT")
 */
export function authorize(...allowedRoles: Role[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthenticated" });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden: insufficient role permissions" });
    }
    next();
  };
}

/**
 * Permission map - documents which roles can perform which actions.
 * Used for reference and for frontend permission syncing via /api/auth/permissions
 */
export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  ADMIN: [
    "*", // full access
  ],
  STAFF: [
    "billing:read",
    "billing:create",
    "customers:read",
    "customers:create",
    "customers:update",
    "inventory:read",
    "estimates:read",
    "estimates:create",
    "estimates:update",
    "products:read",
  ],
  ACCOUNTANT: [
    "reports:read",
    "gst-reports:read",
    "credit:read",
    "credit:update",
    "profit-reports:read",
    "customers:read",
    "products:read",
    "inventory:read",
  ],
};

export function hasPermission(role: Role, permission: string): boolean {
  const perms = ROLE_PERMISSIONS[role];
  return perms.includes("*") || perms.includes(permission);
}
