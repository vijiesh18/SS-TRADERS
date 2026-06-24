import { Router } from "express";
import type { Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { authenticate, authorize, ROLE_PERMISSIONS, type AuthRequest } from "@/middleware/auth";
import { recordAudit, AUDIT_ACTIONS } from "@/lib/audit";

const router = Router();

router.use(authenticate);
router.use(authorize("ADMIN"));

/**
 * GET /api/users
 */
router.get("/", async (_req: AuthRequest, res: Response) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, phone: true, role: true, isActive: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  return res.json({ items: users });
});

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(6),
  role: z.enum(["ADMIN", "STAFF", "ACCOUNTANT"]),
});

/**
 * POST /api/users
 */
router.post("/", async (req: AuthRequest, res: Response) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) return res.status(409).json({ error: "Email already in use" });

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      passwordHash,
      role: parsed.data.role,
    },
    select: { id: true, name: true, email: true, phone: true, role: true, isActive: true, createdAt: true },
  });

  await recordAudit({
    userId: req.user!.userId,
    action: AUDIT_ACTIONS.USER_CREATE,
    entityType: "User",
    entityId: user.id,
    details: { email: user.email, role: user.role },
    ipAddress: req.ip,
  });

  return res.status(201).json({ ...user, permissions: ROLE_PERMISSIONS[user.role] });
});

const updateUserSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  role: z.enum(["ADMIN", "STAFF", "ACCOUNTANT"]).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(6).optional(),
});

/**
 * PUT /api/users/:id
 */
router.put("/:id", async (req: AuthRequest, res: Response) => {
  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const data: any = { ...parsed.data };
  if (parsed.data.password) {
    data.passwordHash = await bcrypt.hash(parsed.data.password, 10);
    delete data.password;
  }

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data,
    select: { id: true, name: true, email: true, phone: true, role: true, isActive: true },
  });

  await recordAudit({
    userId: req.user!.userId,
    action: AUDIT_ACTIONS.USER_UPDATE,
    entityType: "User",
    entityId: user.id,
    details: { changes: { ...parsed.data, password: parsed.data.password ? "[changed]" : undefined } },
    ipAddress: req.ip,
  });

  return res.json(user);
});

/**
 * DELETE /api/users/:id
 * Deactivates (does not hard-delete) a user account.
 */
router.delete("/:id", async (req: AuthRequest, res: Response) => {
  if (req.params.id === req.user!.userId) {
    return res.status(400).json({ error: "You cannot deactivate your own account" });
  }

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { isActive: false },
    select: { id: true, name: true, email: true },
  });

  await prisma.session.deleteMany({ where: { userId: user.id } });

  await recordAudit({
    userId: req.user!.userId,
    action: AUDIT_ACTIONS.USER_DEACTIVATE,
    entityType: "User",
    entityId: user.id,
    ipAddress: req.ip,
  });

  return res.json({ message: "User deactivated", user });
});

export default router;
