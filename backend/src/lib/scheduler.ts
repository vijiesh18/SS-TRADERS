import cron from "node-cron";
import fs from "fs";
import path from "path";
import archiver from "archiver";
import prisma from "@/lib/prisma";

const BACKUP_DIR = process.env.BACKUP_DIR || "./storage/backups";

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
  "users",
] as const;

async function createScheduledBackup(type: "DAILY" | "WEEKLY") {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "_");
  const fileName = `SS_Traders_Backup_${type}_${dateStr}.zip`;
  const filePath = path.join(BACKUP_DIR, fileName);

  const record = await prisma.backup.create({
    data: { fileName, filePath: "", type, status: "PENDING" },
  });

  try {
    await new Promise<void>((resolve, reject) => {
      const output = fs.createWriteStream(filePath);
      const archive = archiver("zip", { zlib: { level: 9 } });

      output.on("close", () => resolve());
      archive.on("error", reject);
      archive.pipe(output);

      (async () => {
        for (const table of BACKUP_TABLES) {
          let data: unknown[] = [];
          switch (table) {
            case "products": data = await prisma.product.findMany(); break;
            case "categories": data = await prisma.category.findMany(); break;
            case "subcategories": data = await prisma.subcategory.findMany(); break;
            case "brands": data = await prisma.brand.findMany(); break;
            case "customers": data = await prisma.customer.findMany(); break;
            case "suppliers": data = await prisma.supplier.findMany(); break;
            case "invoices": data = await prisma.invoice.findMany(); break;
            case "bill_items": data = await prisma.billItem.findMany(); break;
            case "estimates": data = await prisma.estimate.findMany(); break;
            case "estimate_items": data = await prisma.estimateItem.findMany(); break;
            case "credit_records": data = await prisma.creditRecord.findMany(); break;
            case "credit_payments": data = await prisma.creditPayment.findMany(); break;
            case "purchases": data = await prisma.purchase.findMany(); break;
            case "purchase_items": data = await prisma.purchaseItem.findMany(); break;
            case "stock_movements": data = await prisma.stockMovement.findMany(); break;
            case "expenses": data = await prisma.expense.findMany(); break;
            case "settings": data = await prisma.setting.findMany(); break;
            case "users":
              data = (await prisma.user.findMany()).map(
                ({ passwordHash, resetToken, resetTokenExpiry, ...rest }) => rest
              );
              break;
          }
          archive.append(JSON.stringify(data, null, 2), { name: `${table}.json` });
        }
        archive.append(
          JSON.stringify({ createdAt: new Date().toISOString(), type, tables: BACKUP_TABLES }, null, 2),
          { name: "manifest.json" }
        );
        archive.finalize();
      })();
    });

    const stats = fs.statSync(filePath);
    await prisma.backup.update({
      where: { id: record.id },
      data: { filePath, status: "COMPLETED", sizeBytes: stats.size },
    });

    console.log(`[backup] ${type} backup completed: ${fileName}`);
  } catch (err) {
    console.error(`[backup] ${type} backup failed:`, err);
    await prisma.backup.update({ where: { id: record.id }, data: { status: "FAILED" } });
  }
}

/**
 * Registers cron jobs for automated daily and weekly backups.
 * Daily: every day at 2:00 AM IST server time.
 * Weekly: every Sunday at 3:00 AM IST server time.
 */
export function registerBackupSchedules() {
  cron.schedule("0 2 * * *", () => {
    createScheduledBackup("DAILY").catch((e) => console.error(e));
  });

  cron.schedule("0 3 * * 0", () => {
    createScheduledBackup("WEEKLY").catch((e) => console.error(e));
  });

  console.log("[backup] Daily (02:00) and weekly (Sun 03:00) backup schedules registered");
}
