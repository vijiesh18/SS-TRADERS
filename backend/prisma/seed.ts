import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding S.S Traders Smart POS database...");

  // ── Users ──────────────────────────────────
  const adminPassword = await bcrypt.hash("Admin@123", 10);
  const staffPassword = await bcrypt.hash("Staff@123", 10);
  const accountantPassword = await bcrypt.hash("Account@123", 10);

  await prisma.user.upsert({
    where: { email: "admin@sstraders.com" },
    update: {},
    create: {
      name: "Vijiesh (Admin)",
      email: "admin@sstraders.com",
      phone: "6383019535",
      passwordHash: adminPassword,
      role: "ADMIN",
    },
  });

  await prisma.user.upsert({
    where: { email: "staff@sstraders.com" },
    update: {},
    create: {
      name: "Staff User",
      email: "staff@sstraders.com",
      passwordHash: staffPassword,
      role: "STAFF",
    },
  });

  await prisma.user.upsert({
    where: { email: "accounts@sstraders.com" },
    update: {},
    create: {
      name: "Accountant User",
      email: "accounts@sstraders.com",
      passwordHash: accountantPassword,
      role: "ACCOUNTANT",
    },
  });

  // ── Categories & Subcategories ───────────────
  const paintCategory = await prisma.category.upsert({
    where: { name: "Paints" },
    update: {},
    create: { name: "Paints" },
  });

  const hardwareCategory = await prisma.category.upsert({
    where: { name: "Hardware" },
    update: {},
    create: { name: "Hardware" },
  });

  const motorsCategory = await prisma.category.upsert({
    where: { name: "Motors" },
    update: {},
    create: { name: "Motors" },
  });

  const borewellCategory = await prisma.category.upsert({
    where: { name: "Borewell Materials" },
    update: {},
    create: { name: "Borewell Materials" },
  });

  await prisma.subcategory.upsert({
    where: { categoryId_name: { categoryId: paintCategory.id, name: "Exterior Emulsion" } },
    update: {},
    create: { categoryId: paintCategory.id, name: "Exterior Emulsion" },
  });

  await prisma.subcategory.upsert({
    where: { categoryId_name: { categoryId: paintCategory.id, name: "Interior Emulsion" } },
    update: {},
    create: { categoryId: paintCategory.id, name: "Interior Emulsion" },
  });

  await prisma.subcategory.upsert({
    where: { categoryId_name: { categoryId: hardwareCategory.id, name: "Tools & Accessories" } },
    update: {},
    create: { categoryId: hardwareCategory.id, name: "Tools & Accessories" },
  });

  // ── Brands ────────────────────────────────────
  const asianPaints = await prisma.brand.upsert({
    where: { name: "Asian Paints" },
    update: {},
    create: { name: "Asian Paints" },
  });

  await prisma.brand.upsert({
    where: { name: "Generic" },
    update: {},
    create: { name: "Generic" },
  });

  // ── Sample Asian Paints Catalog ───────────────
  const exteriorSub = await prisma.subcategory.findFirst({
    where: { categoryId: paintCategory.id, name: "Exterior Emulsion" },
  });

  const asianPaintsCatalog = [
    {
      productCode: "AP-APEX-ULT-20L",
      barcode: "8901234500201",
      name: "Asian Paints Apex Ultima 20L",
      variant: "20L",
      hsnCode: "32091010",
      gstPercentage: 18,
      unit: "CAN",
      purchasePrice: 7200,
      sellingPrice: 8500,
      stockQuantity: 15,
      minimumStock: 5,
    },
    {
      productCode: "AP-APEX-ULT-10L",
      barcode: "8901234500202",
      name: "Asian Paints Apex Ultima 10L",
      variant: "10L",
      hsnCode: "32091010",
      gstPercentage: 18,
      unit: "CAN",
      purchasePrice: 3700,
      sellingPrice: 4400,
      stockQuantity: 20,
      minimumStock: 5,
    },
    {
      productCode: "AP-APEX-SHY-20L",
      barcode: "8901234500203",
      name: "Asian Paints Apex Shyne 20L",
      variant: "20L",
      hsnCode: "32091010",
      gstPercentage: 18,
      unit: "CAN",
      purchasePrice: 6800,
      sellingPrice: 8000,
      stockQuantity: 10,
      minimumStock: 5,
    },
    {
      productCode: "AP-APEX-ADV-20L",
      barcode: "8901234500204",
      name: "Asian Paints Apex Advanced 20L",
      variant: "20L",
      hsnCode: "32091010",
      gstPercentage: 18,
      unit: "CAN",
      purchasePrice: 6200,
      sellingPrice: 7300,
      stockQuantity: 12,
      minimumStock: 5,
    },
    {
      productCode: "AP-APEX-DUR-20L",
      barcode: "8901234500205",
      name: "Asian Paints Apex Duracast 20L",
      variant: "20L",
      hsnCode: "32091010",
      gstPercentage: 18,
      unit: "CAN",
      purchasePrice: 7500,
      sellingPrice: 8900,
      stockQuantity: 8,
      minimumStock: 5,
    },
    {
      productCode: "AP-TRACTOR-EMU-20L",
      barcode: "8901234500301",
      name: "Asian Paints Tractor Emulsion",
      variant: "20L",
      hsnCode: "32091010",
      gstPercentage: 18,
      unit: "CAN",
      purchasePrice: 2200,
      sellingPrice: 2700,
      stockQuantity: 25,
      minimumStock: 8,
    },
    {
      productCode: "AP-TRACTOR-UNO-20L",
      barcode: "8901234500302",
      name: "Asian Paints Tractor Uno",
      variant: "20L",
      hsnCode: "32091010",
      gstPercentage: 18,
      unit: "CAN",
      purchasePrice: 1800,
      sellingPrice: 2200,
      stockQuantity: 30,
      minimumStock: 8,
    },
    {
      productCode: "AP-TRACTOR-SHY-20L",
      barcode: "8901234500303",
      name: "Asian Paints Tractor Shyne",
      variant: "20L",
      hsnCode: "32091010",
      gstPercentage: 18,
      unit: "CAN",
      purchasePrice: 2000,
      sellingPrice: 2450,
      stockQuantity: 2, // low stock example
      minimumStock: 5,
    },
  ];

  for (const item of asianPaintsCatalog) {
    await prisma.product.upsert({
      where: { productCode: item.productCode },
      update: {},
      create: {
        ...item,
        brandId: asianPaints.id,
        categoryId: paintCategory.id,
        subcategoryId: exteriorSub?.id,
      },
    });
  }

  // ── Accessories for "frequently bought together" ──
  const accessories = [
    {
      productCode: "ACC-PRIMER-5L",
      barcode: "8901234500401",
      name: "Wall Primer 5L",
      variant: "5L",
      hsnCode: "32091010",
      gstPercentage: 18,
      unit: "CAN",
      purchasePrice: 850,
      sellingPrice: 1100,
      stockQuantity: 40,
      minimumStock: 10,
    },
    {
      productCode: "ACC-PUTTY-5KG",
      barcode: "8901234500402",
      name: "Wall Putty 5KG",
      variant: "5KG",
      hsnCode: "32149090",
      gstPercentage: 18,
      unit: "BAG",
      purchasePrice: 250,
      sellingPrice: 350,
      stockQuantity: 60,
      minimumStock: 15,
    },
    {
      productCode: "ACC-ROLLER-9IN",
      barcode: "8901234500403",
      name: 'Paint Roller 9"',
      variant: '9"',
      hsnCode: "96039000",
      gstPercentage: 12,
      unit: "PCS",
      purchasePrice: 60,
      sellingPrice: 100,
      stockQuantity: 50,
      minimumStock: 10,
    },
    {
      productCode: "ACC-BRUSH-3IN",
      barcode: "8901234500404",
      name: 'Paint Brush 3"',
      variant: '3"',
      hsnCode: "96039000",
      gstPercentage: 12,
      unit: "PCS",
      purchasePrice: 30,
      sellingPrice: 60,
      stockQuantity: 80,
      minimumStock: 20,
    },
    {
      productCode: "ACC-THINNER-1L",
      barcode: "8901234500405",
      name: "Thinner 1L",
      variant: "1L",
      hsnCode: "38140000",
      gstPercentage: 18,
      unit: "CAN",
      purchasePrice: 120,
      sellingPrice: 180,
      stockQuantity: 35,
      minimumStock: 10,
    },
  ];

  for (const item of accessories) {
    await prisma.product.upsert({
      where: { productCode: item.productCode },
      update: {},
      create: {
        ...item,
        brandId: undefined,
        categoryId: hardwareCategory.id,
      },
    });
  }

  // ── Smart Recommendations (Frequently Bought Together) ──
  const apexUltima20 = await prisma.product.findUnique({ where: { productCode: "AP-APEX-ULT-20L" } });
  const accessoryProducts = await prisma.product.findMany({
    where: { productCode: { in: accessories.map((a) => a.productCode) } },
  });

  if (apexUltima20) {
    for (const acc of accessoryProducts) {
      await prisma.productRecommendation.upsert({
        where: {
          sourceProductId_recommendedProductId: {
            sourceProductId: apexUltima20.id,
            recommendedProductId: acc.id,
          },
        },
        update: {},
        create: {
          sourceProductId: apexUltima20.id,
          recommendedProductId: acc.id,
          weight: 1,
        },
      });
    }
  }

  // ── Sample Customer & Supplier ─────────────────
  await prisma.customer.upsert({
    where: { phone: "9876543210" },
    update: {},
    create: {
      name: "Ramesh Kumar",
      phone: "9876543210",
      address: "12, Main Road, Erode",
    },
  });

  await prisma.supplier.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Asian Paints Distributor - Erode",
      phone: "9000011111",
      gstNumber: "33AAAPL1234C1Z5",
    },
  });

  // ── Default Settings ───────────────────────────
  await prisma.setting.upsert({
    where: { key: "business" },
    update: {},
    create: {
      key: "business",
      value: {
        name: "S.S Traders",
        gstin: "33NQAPS4337D1ZS",
        phone: "6383019535",
        types: ["Paint Shop", "Motors", "Borewell Materials", "Hardware Items"],
        footer: "© 2026 S.S Traders Smart POS | Designed & Curated by Vijiesh",
      },
    },
  });

  console.log("Seeding complete.");
  console.log("Login credentials:");
  console.log("  Admin:      admin@sstraders.com / Admin@123");
  console.log("  Staff:      staff@sstraders.com / Staff@123");
  console.log("  Accountant: accounts@sstraders.com / Account@123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
