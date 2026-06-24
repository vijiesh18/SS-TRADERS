import { Router } from "express";
import type { Response } from "express";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { authenticate, authorize, type AuthRequest } from "@/middleware/auth";
import { recordAudit, AUDIT_ACTIONS } from "@/lib/audit";

const router = Router();

router.use(authenticate);

/**
 * GET /api/products/search?q=apex
 * Google-style autocomplete across name, barcode, product code, shade code, brand.
 * Used by Asian Paints product search and general billing search.
 */
router.get("/search", async (req: AuthRequest, res: Response) => {
  const q = (req.query.q as string)?.trim();
  if (!q || q.length < 1) {
    return res.json({ results: [] });
  }

  const products = await prisma.product.findMany({
    where: {
      isDeleted: false,
      isActive: true,
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { barcode: { contains: q, mode: "insensitive" } },
        { productCode: { contains: q, mode: "insensitive" } },
        { shadeCode: { contains: q, mode: "insensitive" } },
        { shadeName: { contains: q, mode: "insensitive" } },
        { brand: { name: { contains: q, mode: "insensitive" } } },
      ],
    },
    include: { brand: true, category: true, subcategory: true },
    take: 20,
    orderBy: { name: "asc" },
  });

  return res.json({ results: products });
});

/**
 * GET /api/products/barcode/:code
 * Lookup by exact barcode - used by barcode/camera scanner workflow.
 */
router.get("/barcode/:code", async (req: AuthRequest, res: Response) => {
  const product = await prisma.product.findFirst({
    where: { barcode: req.params.code, isDeleted: false },
    include: { brand: true, category: true, subcategory: true },
  });

  if (!product) {
    return res.status(404).json({ error: "Product not found for this barcode" });
  }

  return res.json(product);
});

/**
 * GET /api/products/:id/recommendations
 * Smart "Frequently Bought Together" recommendations.
 */
router.get("/:id/recommendations", async (req: AuthRequest, res: Response) => {
  const recommendations = await prisma.productRecommendation.findMany({
    where: { sourceProductId: req.params.id },
    include: { recommendedProduct: true },
    orderBy: { weight: "desc" },
    take: 10,
  });

  return res.json({
    results: recommendations.map((r) => r.recommendedProduct),
  });
});

/**
 * GET /api/products/categories
 * List all categories with subcategories (for product form dropdowns).
 */
router.get("/categories", async (_req: AuthRequest, res: Response) => {
  const categories = await prisma.category.findMany({
    include: { subcategories: true },
    orderBy: { name: "asc" },
  });
  return res.json({ items: categories });
});

/**
 * POST /api/products/categories
 */
router.post("/categories", authorize("ADMIN"), async (req: AuthRequest, res: Response) => {
  const parsed = z.object({ name: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const category = await prisma.category.create({ data: parsed.data as any });
  return res.status(201).json(category);
});

/**
 * POST /api/products/categories/:id/subcategories
 */
router.post("/categories/:id/subcategories", authorize("ADMIN"), async (req: AuthRequest, res: Response) => {
  const parsed = z.object({ name: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const subcategory = await prisma.subcategory.create({
    data: { name: parsed.data.name, categoryId: req.params.id },
  });
  return res.status(201).json(subcategory);
});

/**
 * GET /api/products/brands
 * List all brands (for product form dropdowns and Asian Paints filter).
 */
router.get("/brands", async (_req: AuthRequest, res: Response) => {
  const brands = await prisma.brand.findMany({ orderBy: { name: "asc" } });
  return res.json({ items: brands });
});

/**
 * POST /api/products/brands
 */
router.post("/brands", authorize("ADMIN"), async (req: AuthRequest, res: Response) => {
  const parsed = z.object({ name: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const brand = await prisma.brand.upsert({
    where: { name: parsed.data.name },
    update: {},
    create: { name: parsed.data.name },
  });
  return res.status(201).json(brand);
});

const importRowSchema = z.object({
  productCode: z.string().min(1),
  barcode: z.string().optional().nullable(),
  name: z.string().min(1),
  brand: z.string().optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  hsnCode: z.string().optional(),
  gstPercentage: z.coerce.number().min(0).max(100).default(18),
  unit: z.string().default("PCS"),
  variant: z.string().optional(),
  shadeCode: z.string().optional(),
  shadeName: z.string().optional(),
  purchasePrice: z.coerce.number().min(0).default(0),
  sellingPrice: z.coerce.number().min(0).default(0),
  stockQuantity: z.coerce.number().min(0).default(0),
  minimumStock: z.coerce.number().min(0).default(5),
});

/**
 * POST /api/products/import
 * Bulk import products (e.g. Asian Paints catalog) from a JSON array of rows
 * (parsed client-side from CSV/Excel). Brand/category/subcategory are
 * resolved or created automatically by name.
 */
router.post("/import", authorize("ADMIN"), async (req: AuthRequest, res: Response) => {
  const parsed = z.object({ rows: z.array(importRowSchema).min(1) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const results = { created: 0, updated: 0, failed: 0, errors: [] as { row: number; error: string }[] };

  for (let i = 0; i < parsed.data.rows.length; i++) {
    const row = parsed.data.rows[i];
    try {
      let brandId: string | undefined;
      if (row.brand) {
        const brand = await prisma.brand.upsert({
          where: { name: row.brand },
          update: {},
          create: { name: row.brand },
        });
        brandId = brand.id;
      }

      let categoryId: string | undefined;
      let subcategoryId: string | undefined;
      if (row.category) {
        const category = await prisma.category.upsert({
          where: { name: row.category },
          update: {},
          create: { name: row.category },
        });
        categoryId = category.id;

        if (row.subcategory) {
          const subcategory = await prisma.subcategory.upsert({
            where: { categoryId_name: { categoryId: category.id, name: row.subcategory } },
            update: {},
            create: { categoryId: category.id, name: row.subcategory },
          });
          subcategoryId = subcategory.id;
        }
      }

      const existing = await prisma.product.findUnique({ where: { productCode: row.productCode } });

      const data = {
        productCode: row.productCode,
        barcode: row.barcode || undefined,
        name: row.name,
        brandId,
        categoryId,
        subcategoryId,
        hsnCode: row.hsnCode,
        gstPercentage: row.gstPercentage,
        unit: row.unit,
        variant: row.variant,
        shadeCode: row.shadeCode,
        shadeName: row.shadeName,
        purchasePrice: row.purchasePrice,
        sellingPrice: row.sellingPrice,
        stockQuantity: row.stockQuantity,
        minimumStock: row.minimumStock,
      };

      if (existing) {
        await prisma.product.update({ where: { id: existing.id }, data });
        results.updated++;
      } else {
        await prisma.product.create({ data });
        results.created++;
      }
    } catch (err: any) {
      results.failed++;
      results.errors.push({ row: i + 1, error: err.message });
    }
  }

  await recordAudit({
    userId: req.user!.userId,
    action: AUDIT_ACTIONS.PRODUCT_CREATE,
    entityType: "Product",
    details: { bulkImport: true, ...results },
    ipAddress: req.ip,
  });

  return res.json(results);
});


router.get("/", async (req: AuthRequest, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 25, 200);
  const categoryId = req.query.categoryId as string | undefined;
  const lowStock = req.query.lowStock === "true";
  const search = req.query.search as string | undefined;

  const where: any = { isDeleted: false };
  if (categoryId) where.categoryId = categoryId;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { productCode: { contains: search, mode: "insensitive" } },
      { barcode: { contains: search } },
    ];
  }

  if (lowStock) {
    const lowStockRows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM products WHERE "isDeleted" = false AND "stockQuantity" <= "minimumStock"
    `;
    where.id = { in: lowStockRows.map((r) => r.id) };
  }

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { brand: true, category: true, subcategory: true },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { name: "asc" },
    }),
    prisma.product.count({ where }),
  ]);

  return res.json({ items, total, page, limit });
});

const productSchema = z.object({
  productCode: z.string().min(1),
  barcode: z.string().optional(),
  name: z.string().min(1),
  brandId: z.string().optional(),
  categoryId: z.string().optional(),
  subcategoryId: z.string().optional(),
  hsnCode: z.string().optional(),
  gstPercentage: z.number().min(0).max(100).default(18),
  unit: z.string().default("PCS"),
  variant: z.string().optional(),
  shadeCode: z.string().optional(),
  shadeName: z.string().optional(),
  purchasePrice: z.number().min(0).default(0),
  sellingPrice: z.number().min(0).default(0),
  stockQuantity: z.number().min(0).default(0),
  minimumStock: z.number().min(0).default(5),
  imageUrl: z.string().optional(),
});

/**
 * POST /api/products
 * Add product. Admin & Staff (per inventory access) can add.
 */
router.post("/", authorize("ADMIN"), async (req: AuthRequest, res: Response) => {
  const parsed = productSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const product = await prisma.product.create({ data: parsed.data as any });

  await recordAudit({
    userId: req.user!.userId,
    action: AUDIT_ACTIONS.PRODUCT_CREATE,
    entityType: "Product",
    entityId: product.id,
    details: { name: product.name },
    ipAddress: req.ip,
  });

  return res.status(201).json(product);
});

/**
 * PUT /api/products/:id
 * Update product.
 */
router.put("/:id", authorize("ADMIN"), async (req: AuthRequest, res: Response) => {
  const parsed = productSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const product = await prisma.product.update({
    where: { id: req.params.id },
    data: parsed.data,
  });

  await recordAudit({
    userId: req.user!.userId,
    action: AUDIT_ACTIONS.PRODUCT_UPDATE,
    entityType: "Product",
    entityId: product.id,
    details: { changes: parsed.data },
    ipAddress: req.ip,
  });

  return res.json(product);
});

/**
 * DELETE /api/products/:id
 * Soft delete - Admin only.
 */
router.delete("/:id", authorize("ADMIN"), async (req: AuthRequest, res: Response) => {
  const { reason } = req.body;

  const product = await prisma.product.update({
    where: { id: req.params.id },
    data: {
      isDeleted: true,
      isActive: false,
      deletedAt: new Date(),
      deletedBy: req.user!.userId,
      deleteReason: reason || "No reason provided",
    },
  });

  await recordAudit({
    userId: req.user!.userId,
    action: AUDIT_ACTIONS.PRODUCT_DELETE,
    entityType: "Product",
    entityId: product.id,
    details: { reason },
    ipAddress: req.ip,
  });

  return res.json({ message: "Product soft-deleted", product });
});

export default router;
