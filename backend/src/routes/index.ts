import { Router } from "express";
import authRoutes from "@/routes/auth.routes";
import productRoutes from "@/routes/products.routes";
import inventoryRoutes from "@/routes/inventory.routes";
import billingRoutes from "@/routes/billing.routes";
import estimateRoutes from "@/routes/estimates.routes";
import customerRoutes from "@/routes/customers.routes";
import supplierRoutes from "@/routes/suppliers.routes";
import purchaseRoutes from "@/routes/purchases.routes";
import creditRoutes from "@/routes/credit.routes";
import expenseRoutes from "@/routes/expenses.routes";
import reportRoutes from "@/routes/reports.routes";
import exportRoutes from "@/routes/export.routes";
import backupRoutes from "@/routes/backup.routes";
import dashboardRoutes from "@/routes/dashboard.routes";
import userRoutes from "@/routes/users.routes";
import settingsRoutes from "@/routes/settings.routes";
import auditRoutes from "@/routes/audit.routes";
import { demoGuard } from "@/middleware/demo";

const router = Router();

// Auth routes first (no demo guard needed — login must work)
router.use("/auth", authRoutes);

// Demo guard — intercepts all subsequent routes for demo users
router.use(demoGuard);
router.use("/products", productRoutes);
router.use("/inventory", inventoryRoutes);
router.use("/billing", billingRoutes);
router.use("/estimates", estimateRoutes);
router.use("/customers", customerRoutes);
router.use("/suppliers", supplierRoutes);
router.use("/purchases", purchaseRoutes);
router.use("/credit", creditRoutes);
router.use("/expenses", expenseRoutes);
router.use("/reports", reportRoutes);
router.use("/export", exportRoutes);
router.use("/backup", backupRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/users", userRoutes);
router.use("/settings", settingsRoutes);
router.use("/audit-logs", auditRoutes);

export default router;
