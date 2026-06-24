import { Router } from "express";
import type { Response } from "express";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { authenticate, authorize, type AuthRequest } from "@/middleware/auth";

const router = Router();

router.use(authenticate);

const DEFAULT_SETTINGS: Record<string, unknown> = {
  business: {
    name: "S.S Traders",
    gstin: "33NQAPS4337D1ZS",
    phone: "6383019535",
    types: ["Paint Shop", "Motors", "Borewell Materials", "Hardware Items"],
  },
  invoice: {
    prefix: "SST",
    nextResetYearly: true,
  },
  estimate: {
    prefix: "EST",
    nextResetYearly: true,
  },
  gst: {
    defaultRate: 18,
    intraState: true, // CGST + SGST split for Tamil Nadu
  },
  backup: {
    dailyEnabled: true,
    weeklyEnabled: true,
    retentionDays: 90,
  },
};

/**
 * GET /api/settings
 * Returns all settings, falling back to defaults for missing keys.
 */
router.get("/", async (_req: AuthRequest, res: Response) => {
  const rows = await prisma.setting.findMany();
  const stored: Record<string, unknown> = {};
  for (const row of rows) stored[row.key] = row.value;

  return res.json({ ...DEFAULT_SETTINGS, ...stored });
});

/**
 * GET /api/settings/:key
 */
router.get("/:key", async (req: AuthRequest, res: Response) => {
  const row = await prisma.setting.findUnique({ where: { key: req.params.key } });
  if (row) return res.json(row.value);

  if (DEFAULT_SETTINGS[req.params.key] !== undefined) {
    return res.json(DEFAULT_SETTINGS[req.params.key]);
  }

  return res.status(404).json({ error: "Setting not found" });
});

const settingSchema = z.object({
  value: z.any(),
});

/**
 * PUT /api/settings/:key
 * Admin only - update a settings key (e.g. business, invoice, gst, backup).
 */
router.put("/:key", authorize("ADMIN"), async (req: AuthRequest, res: Response) => {
  const parsed = settingSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const setting = await prisma.setting.upsert({
    where: { key: req.params.key },
    update: { value: parsed.data.value },
    create: { key: req.params.key, value: parsed.data.value },
  });

  return res.json(setting);
});

export default router;
