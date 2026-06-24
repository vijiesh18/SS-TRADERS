import { Router } from "express";
import type { Response } from "express";
import prisma from "@/lib/prisma";
import { authenticate, authorize, type AuthRequest } from "@/middleware/auth";

const router = Router();

router.use(authenticate);
router.use(authorize("ADMIN"));

/**
 * GET /api/audit-logs?action=&userId=&from=&to=&page=&limit=
 */
router.get("/", async (req: AuthRequest, res: Response) => {
  const { action, userId, from, to } = req.query as Record<string, string>;
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 50, 200);

  const where: any = {};
  if (action) where.action = action;
  if (userId) where.userId = userId;
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to);
  }

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { name: true, email: true, role: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return res.json({ items, total, page, limit });
});

export default router;
