import { Router } from "express";
import type { Response } from "express";
import fs from "fs";
import path from "path";
import archiver from "archiver";
import unzipper from "unzipper";
import multer from "multer";
import prisma from "@/lib/prisma";
import { authenticate, authorize, type AuthRequest } from "@/middleware/auth";
import { recordAudit, AUDIT_ACTIONS } from "@/lib/audit";

const router = Router();

router.use(authenticate);
router.use(authorize("ADMIN")); // Backup Center - Admin only

const BACKUP_DIR = process.env.BACKUP_DIR || "./storage/backups";
const UPLOAD_DIR = process.env.UPLOAD_DIR || "./storage/uploads";

fs.mkdirSync(BACKUP_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({ dest: UPLOAD_DIR });

// Tables included in a full backup
const BACKUP_TABLES = [
  "products",
  "categories",
  "subcategories",
  "brands",
  "customers",
  "suppliers",
  "invoices",
  "bill_items",
  "estimates",
  "estimate_items",
  "credit_records",
  "credit_payments",
  "purchases",
  "purchase_items",
  "stock_movements",
  "expenses",
  "settings",
  "users", // password hashes excluded below
] as const;

/**
 * Serializes all backup tables to JSON files inside a ZIP archive.
 * Returns the path to the created ZIP file.
 */
async function createBackupZip(fileName: string): Promise<{ filePath: string; sizeBytes: number }> {
  const filePath = path.join(BACKUP_DIR, fileName);
  const output = fs.createWriteStream(filePath);
  const archive = archiver("zip", { zlib: { level: 9 } });

  return new Promise(async (resolve, reject) => {
    output.on("close", () => {
      resolve({ filePath, sizeBytes: archive.pointer() });
    });
    archive.on("error", reject);
    archive.pipe(output);

    for (const table of BACKUP_TABLES) {
      let data: unknown[];
      switch (table) {
        case "products":
          data = await prisma.product.findMany();
          break;
        case "categories":
          data = await prisma.category.findMany();
          break;
        case "subcategories":
          data = await prisma.subcategory.findMany();
          break;
        case "brands":
          data = await prisma.brand.findMany();
          break;
        case "customers":
          data = await prisma.customer.findMany();
          break;
        case "suppliers":
          data = await prisma.supplier.findMany();
          break;
        case "invoices":
          data = await prisma.invoice.findMany();
          break;
        case "bill_items":
          data = await prisma.billItem.findMany();
          break;
        case "estimates":
          data = await prisma.estimate.findMany();
          break;
        case "estimate_items":
          data = await prisma.estimateItem.findMany();
          break;
        case "credit_records":
          data = await prisma.creditRecord.findMany();
          break;
        case "credit_payments":
          data = await prisma.creditPayment.findMany();
          break;
        case "purchases":
          data = await prisma.purchase.findMany();
          break;
        case "purchase_items":
          data = await prisma.purchaseItem.findMany();
          break;
        case "stock_movements":
          data = await prisma.stockMovement.findMany();
          break;
        case "expenses":
          data = await prisma.expense.findMany();
          break;
        case "settings":
          data = await prisma.setting.findMany();
          break;
        case "users":
          // exclude passwordHash & reset tokens from backup for security
          data = (await prisma.user.findMany()).map(
            ({ passwordHash, resetToken, resetTokenExpiry, ...rest }) => rest
          );
          break;
        default:
          data = [];
      }

      archive.append(JSON.stringify(data, null, 2), { name: `${table}.json` });
    }

    archive.append(
      JSON.stringify({ createdAt: new Date().toISOString(), tables: BACKUP_TABLES }, null, 2),
      { name: "manifest.json" }
    );

    archive.finalize();
  });
}

/**
 * POST /api/backup/create
 * Creates a manual full database backup ZIP.
 */
router.post("/create", async (req: AuthRequest, res: Response) => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "_");
  const fileName = `SS_Traders_Backup_${dateStr}.zip`;

  const backupRecord = await prisma.backup.create({
    data: { fileName, filePath: "", type: "MANUAL", status: "PENDING", createdById: req.user!.userId },
  });

  try {
    const { filePath, sizeBytes } = await createBackupZip(fileName);

    const updated = await prisma.backup.update({
      where: { id: backupRecord.id },
      data: { filePath, status: "COMPLETED", sizeBytes },
    });

    await recordAudit({
      userId: req.user!.userId,
      action: AUDIT_ACTIONS.BACKUP_CREATE,
      entityType: "Backup",
      entityId: updated.id,
      details: { fileName, sizeBytes },
      ipAddress: req.ip,
    });

    return res.status(201).json(updated);
  } catch (err: any) {
    await prisma.backup.update({ where: { id: backupRecord.id }, data: { status: "FAILED" } });
    return res.status(500).json({ error: "Backup creation failed", details: err.message });
  }
});

/**
 * GET /api/backup
 * List all backups.
 */
router.get("/", async (_req: AuthRequest, res: Response) => {
  const backups = await prisma.backup.findMany({
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { name: true } } },
  });
  return res.json({ items: backups });
});

/**
 * GET /api/backup/:id/download
 * Downloads the backup ZIP file.
 */
router.get("/:id/download", async (req: AuthRequest, res: Response) => {
  const backup = await prisma.backup.findUnique({ where: { id: req.params.id } });
  if (!backup || backup.status !== "COMPLETED") {
    return res.status(404).json({ error: "Backup not found or not completed" });
  }

  if (!fs.existsSync(backup.filePath)) {
    return res.status(404).json({ error: "Backup file missing from storage" });
  }

  res.download(backup.filePath, backup.fileName);
});

/**
 * POST /api/backup/restore
 * Upload a backup ZIP and restore the database from it.
 * WARNING: This is a destructive operation - it should run within a
 * maintenance window. Restoration order respects foreign key dependencies.
 */
router.post("/restore", upload.single("backupFile"), async (req: AuthRequest, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: "backupFile is required (multipart/form-data)" });
  }

  const extractDir = path.join(UPLOAD_DIR, `restore_${Date.now()}`);
  fs.mkdirSync(extractDir, { recursive: true });

  try {
    await fs
      .createReadStream(req.file.path)
      .pipe(unzipper.Extract({ path: extractDir }))
      .promise();

    const readJson = (table: string) => {
      const filePath = path.join(extractDir, `${table}.json`);
      if (!fs.existsSync(filePath)) return [];
      return JSON.parse(fs.readFileSync(filePath, "utf-8"));
    };

    // Restore in dependency order. Existing data for these tables is replaced.
    await prisma.$transaction(async (tx) => {
      // Independent/lookup tables first
      const brands = readJson("brands");
      const categories = readJson("categories");
      const subcategories = readJson("subcategories");
      const suppliers = readJson("suppliers");
      const customers = readJson("customers");
      const products = readJson("products");

      for (const b of brands) await tx.brand.upsert({ where: { id: b.id }, update: b, create: b });
      for (const c of categories) await tx.category.upsert({ where: { id: c.id }, update: c, create: c });
      for (const sc of subcategories) await tx.subcategory.upsert({ where: { id: sc.id }, update: sc, create: sc });
      for (const s of suppliers) await tx.supplier.upsert({ where: { id: s.id }, update: s, create: s });
      for (const c of customers) await tx.customer.upsert({ where: { id: c.id }, update: c, create: c });
      for (const p of products) await tx.product.upsert({ where: { id: p.id }, update: p, create: p });

      const expenses = readJson("expenses");
      for (const e of expenses) await tx.expense.upsert({ where: { id: e.id }, update: e, create: e });

      const settings = readJson("settings");
      for (const s of settings) await tx.setting.upsert({ where: { id: s.id }, update: s, create: s });

      // Note: invoices, bill_items, purchases, estimates, credit records
      // reference users/products and should be restored carefully in
      // production via a dedicated migration script with FK validation.
    });

    const updated = await prisma.backup.create({
      data: {
        fileName: req.file.originalname,
        filePath: req.file.path,
        type: "MANUAL",
        status: "RESTORED",
        createdById: req.user!.userId,
      },
    });

    await recordAudit({
      userId: req.user!.userId,
      action: AUDIT_ACTIONS.BACKUP_RESTORE,
      entityType: "Backup",
      entityId: updated.id,
      details: { fileName: req.file.originalname },
      ipAddress: req.ip,
    });

    return res.json({ message: "Database restored successfully (core tables)", backup: updated });
  } catch (err: any) {
    return res.status(500).json({ error: "Restore failed", details: err.message });
  } finally {
    fs.rmSync(extractDir, { recursive: true, force: true });
  }
});

export default router;
