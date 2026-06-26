/**
 * Realistic sample data for DEMO MODE.
 * Makes the app look like a thriving paint-shop business when a
 * prospective client explores it — without touching the real database.
 */

const PRODUCTS = [
  "Asian Paints Apex Ultima 20L", "Asian Paints Tractor Emulsion 10L",
  "Berger Silk Glamour 4L", "Nerolac Excel Total 20L",
  "Asian Paints Royale Luxury 1L", "Dulux Velvet Touch 10L",
  "Berger WeatherCoat 20L", "Asian Paints Primer 4L",
  "Wall Putty 40Kg", "Nerolac Beauty Gold 10L",
  "Thinner 5L", "Brush Set Premium", "Roller 9inch",
];

const CUSTOMERS = [
  "Ramesh Hardware", "Sri Lakshmi Paints", "Kumar Constructions",
  "Anand Traders", "Velan Borewells", "Murugan Motors",
  "Karthik Builders", "Priya Enterprises", "Selvam & Sons",
];

const HSN = ["3208", "3209", "3210", "3214", "9603"];
const PAYMENTS = ["CASH", "UPI", "CARD", "CREDIT"];

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick<T>(arr: T[]): T {
  return arr[rand(0, arr.length - 1)];
}

// Deterministic-ish daily total so charts look natural (weekend dips)
function dayTotal(daysAgo: number) {
  const base = 18000 + Math.sin(daysAgo / 3) * 6000;
  const weekendDip = [0, 6].includes((new Date(Date.now() - daysAgo * 864e5)).getDay()) ? 0.55 : 1;
  return Math.round((base + rand(-3000, 5000)) * weekendDip);
}

export function demoDashboardSummary() {
  let monthly = 0;
  for (let i = 0; i < 30; i++) monthly += dayTotal(i);
  const today = dayTotal(0);
  const weekly = [0, 1, 2, 3, 4, 5, 6].reduce((s, i) => s + dayTotal(i), 0);

  return {
    todaySales: today,
    weeklySales: weekly,
    monthlySales: monthly,
    yearlySales: monthly * 11 + rand(40000, 90000),
    totalRevenue: monthly * 11 + rand(40000, 90000),
    totalProfit: Math.round(monthly * 11 * 0.27),
    pendingCredits: 84500,
    pendingCreditCount: 6,
    overdueCredits: 2,
    lowStockProducts: 12,
    totalCustomers: 48,
    totalProducts: 439,
  };
}

export function demoDashboardCharts(period: string) {
  const points = period === "yearly" ? 12 : period === "weekly" ? 12 : period === "daily" ? 30 : 30;
  const revenueTrend = Array.from({ length: points }).map((_, i) => {
    const daysAgo = points - 1 - i;
    const d = new Date(Date.now() - daysAgo * 864e5);
    return { bucket: d.toISOString(), total: dayTotal(daysAgo) };
  });

  const categoryPerformance = [
    { category: "Exterior Paints", total: rand(180000, 240000) },
    { category: "Interior Paints", total: rand(140000, 200000) },
    { category: "Primers & Putty", total: rand(60000, 110000) },
    { category: "Tools & Brushes", total: rand(25000, 50000) },
    { category: "Thinners", total: rand(15000, 35000) },
  ];

  const productPerformance = PRODUCTS.slice(0, 8)
    .map((name) => ({ name, total: rand(20000, 95000) }))
    .sort((a, b) => b.total - a.total);

  return { revenueTrend, categoryPerformance, productPerformance, profitTrend: [], topProducts: productPerformance, salesByPayment: [] };
}

function makeInvoice(i: number) {
  const daysAgo = rand(0, 29);
  const date = new Date(Date.now() - daysAgo * 864e5);
  const grandTotal = rand(1500, 28000);
  const status = pick(["PAID", "PAID", "PAID", "PARTIAL", "UNPAID"]);
  const paid = status === "PAID" ? grandTotal : status === "PARTIAL" ? Math.round(grandTotal * 0.5) : 0;
  return {
    id: `demo-inv-${i}`,
    invoiceNumber: `SST-2026-${String(1000 - i).padStart(6, "0")}`,
    createdAt: date.toISOString(),
    customer: { name: pick(CUSTOMERS), phone: `98${rand(40000000, 49999999)}` },
    customerName: pick(CUSTOMERS),
    itemCount: rand(1, 6),
    items: rand(1, 6),
    paymentMethod: pick(PAYMENTS),
    status,
    grandTotal,
    gstAmount: Math.round(grandTotal * 0.18 / 1.18),
    paidAmount: paid,
    pendingAmount: grandTotal - paid,
    isCancelled: false,
    isDeleted: false,
  };
}

export function demoInvoices() {
  const items = Array.from({ length: 24 }).map((_, i) => makeInvoice(i))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return { items, total: 24, page: 1, limit: 25 };
}

export function demoCustomers() {
  const items = CUSTOMERS.map((name, i) => ({
    id: `demo-cust-${i}`,
    name,
    phone: `98${rand(40000000, 49999999)}`,
    address: pick(["Nagercoil", "Kanyakumari", "Thuckalay", "Marthandam"]),
    gstNumber: i % 3 === 0 ? `33ABCDE${rand(1000, 9999)}F1Z${rand(1, 9)}` : null,
    totalOrders: rand(2, 24),
    totalSpent: rand(8000, 180000),
    creditBalance: i % 4 === 0 ? rand(2000, 25000) : 0,
  }));
  return { items, total: items.length, page: 1, limit: 25 };
}

export function demoSuppliers() {
  const names = ["Asian Paints Distributor", "Berger Depot", "Nerolac Wholesale", "Dulux Agency", "Hardware Imports"];
  const items = names.map((name, i) => ({
    id: `demo-sup-${i}`,
    name,
    phone: `94${rand(40000000, 49999999)}`,
    address: pick(["Chennai", "Madurai", "Coimbatore"]),
    gstNumber: `33XYZAB${rand(1000, 9999)}K1Z${rand(1, 9)}`,
    totalPurchases: rand(120000, 800000),
  }));
  return { items, total: items.length, page: 1, limit: 25 };
}

export function demoCredit() {
  const items = CUSTOMERS.slice(0, 6).map((name, i) => {
    const totalAmount = rand(8000, 45000);
    const paidAmount = Math.round(totalAmount * (rand(20, 70) / 100));
    return {
      id: `demo-cr-${i}`,
      customer: { name, phone: `98${rand(40000000, 49999999)}` },
      invoice: { invoiceNumber: `SST-2026-${String(900 - i).padStart(6, "0")}` },
      totalAmount, paidAmount,
      pendingAmount: totalAmount - paidAmount,
      dueDate: new Date(Date.now() + rand(-5, 20) * 864e5).toISOString(),
      isSettled: false,
      payments: [],
    };
  });
  return { items, pendingInvoices: [] };
}

export function demoCreditSummary() {
  return { totalPending: 84500, pendingCount: 6, dueTodayCount: 1, overdueCount: 2 };
}

export function demoSalesReport() {
  const inv = demoInvoices().items;
  const rows = inv.map((r) => ({
    invoiceNumber: r.invoiceNumber,
    date: r.createdAt,
    customer: r.customer.name,
    paymentMethod: r.paymentMethod,
    gst: r.gstAmount,
    grandTotal: r.grandTotal,
  }));
  const totalSales = rows.reduce((s, r) => s + r.grandTotal, 0);
  return { totalSales, count: rows.length, rows };
}

export function demoProfitReport() {
  const rows = PRODUCTS.slice(0, 10).map((product, i) => {
    const revenue = rand(8000, 45000);
    return {
      invoiceNumber: `SST-2026-${String(990 - i).padStart(6, "0")}`,
      date: new Date(Date.now() - rand(0, 29) * 864e5).toISOString(),
      product, quantity: rand(2, 30),
      revenue, profit: Math.round(revenue * (rand(18, 35) / 100)),
    };
  });
  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
  const totalProfit = rows.reduce((s, r) => s + r.profit, 0);
  return { totalRevenue, totalProfit, rows };
}

export function demoGstReport() {
  const rows = HSN.map((hsnCode) => {
    const taxable = rand(40000, 180000);
    const gst = Math.round(taxable * 0.18);
    return { hsnCode, gstPercentage: 18, taxable, cgst: gst / 2, sgst: gst / 2 };
  });
  return { rows };
}

export function demoInventoryReport() {
  const rows = PRODUCTS.map((product, i) => {
    const stock = rand(0, 60);
    const purchasePrice = rand(200, 4000);
    const sellingPrice = Math.round(purchasePrice * 1.25);
    return {
      product, productCode: `AP-${String(i + 100).padStart(3, "0")}`,
      stock, purchasePrice, sellingPrice, stockValue: stock * purchasePrice,
    };
  });
  const totalStockValue = rows.reduce((s, r) => s + r.stockValue, 0);
  return { totalStockValue, rows };
}

export function demoExpenses() {
  const cats = ["RENT", "SALARY", "ELECTRICITY", "TRANSPORT", "MISC"];
  const items = Array.from({ length: 8 }).map((_, i) => ({
    id: `demo-exp-${i}`,
    category: pick(cats),
    description: pick(["Monthly shop rent", "Staff salary", "EB bill", "Delivery charges", "Tea & misc"]),
    amount: rand(500, 35000),
    date: new Date(Date.now() - rand(0, 29) * 864e5).toISOString(),
    enteredBy: { name: "Demo User" },
  }));
  const totalAmount = items.reduce((s, r) => s + r.amount, 0);
  return { items, totalAmount, total: items.length, page: 1, limit: 25 };
}

// ── Sample product catalogue for DEMO MODE ──────────────────────
export const DEMO_CATEGORIES = [
  { id: "demo-cat-paints", name: "Paints" },
  { id: "demo-cat-accessories", name: "Accessories" },
  { id: "demo-cat-borewell", name: "Borewell Materials" },
  { id: "demo-cat-pumps", name: "Motors" },
  { id: "demo-cat-hardware", name: "Hardware" },
];

interface CatalogItem {
  name: string; code: string; cat: string; unit: string;
  buy: number; sell: number; stock: number; min: number; hsn: string; gst: number;
}

const DEMO_CATALOG: CatalogItem[] = [
  { name: "Asian Paints Apex Ultima Exterior 20L", code: "AP-001", cat: "demo-cat-paints", unit: "LTR", buy: 3850, sell: 4750, stock: 24, min: 5, hsn: "3209", gst: 18 },
  { name: "Asian Paints Royale Luxury 4L", code: "AP-002", cat: "demo-cat-paints", unit: "LTR", buy: 1180, sell: 1499, stock: 18, min: 5, hsn: "3209", gst: 18 },
  { name: "Berger Silk Glamour Interior 10L", code: "BG-101", cat: "demo-cat-paints", unit: "LTR", buy: 2100, sell: 2650, stock: 4, min: 6, hsn: "3209", gst: 18 },
  { name: "Nerolac Excel Total 20L", code: "NL-220", cat: "demo-cat-paints", unit: "LTR", buy: 3400, sell: 4200, stock: 12, min: 5, hsn: "3209", gst: 18 },
  { name: "Asian Paints Wall Primer 10L", code: "AP-310", cat: "demo-cat-paints", unit: "LTR", buy: 850, sell: 1150, stock: 30, min: 8, hsn: "3209", gst: 18 },
  { name: "JK Wall Putty 40Kg", code: "PT-400", cat: "demo-cat-paints", unit: "KG", buy: 760, sell: 980, stock: 22, min: 10, hsn: "3214", gst: 18 },
  { name: "Paint Brush Set (4pc)", code: "AC-501", cat: "demo-cat-accessories", unit: "PCS", buy: 120, sell: 220, stock: 60, min: 15, hsn: "9603", gst: 18 },
  { name: "Roller 9 inch with Tray", code: "AC-502", cat: "demo-cat-accessories", unit: "PCS", buy: 95, sell: 180, stock: 3, min: 10, hsn: "9603", gst: 18 },
  { name: "Masking Tape 1 inch", code: "AC-503", cat: "demo-cat-accessories", unit: "PCS", buy: 22, sell: 45, stock: 120, min: 25, hsn: "9603", gst: 18 },
  { name: "Sand Paper Sheet (120 grit)", code: "AC-504", cat: "demo-cat-accessories", unit: "PCS", buy: 8, sell: 18, stock: 200, min: 40, hsn: "6805", gst: 18 },
  { name: "PVC Pipe 4 inch (per ft)", code: "BW-601", cat: "demo-cat-borewell", unit: "PCS", buy: 180, sell: 240, stock: 45, min: 12, hsn: "3917", gst: 18 },
  { name: "Borewell Casing Pipe 6 inch", code: "BW-602", cat: "demo-cat-borewell", unit: "PCS", buy: 520, sell: 680, stock: 8, min: 10, hsn: "3917", gst: 18 },
  { name: "Submersible Pump 1HP", code: "PM-701", cat: "demo-cat-pumps", unit: "PCS", buy: 7800, sell: 9500, stock: 6, min: 3, hsn: "8413", gst: 18 },
  { name: "Submersible Pump 2HP", code: "PM-702", cat: "demo-cat-pumps", unit: "PCS", buy: 12500, sell: 15200, stock: 2, min: 2, hsn: "8413", gst: 18 },
  { name: "GI Nail 3 inch (1Kg)", code: "HW-801", cat: "demo-cat-hardware", unit: "KG", buy: 75, sell: 120, stock: 40, min: 10, hsn: "7317", gst: 18 },
  { name: "Door Hinge Set", code: "HW-802", cat: "demo-cat-hardware", unit: "PCS", buy: 60, sell: 110, stock: 5, min: 8, hsn: "8302", gst: 18 },
];

function buildProduct(c: CatalogItem) {
  const cat = DEMO_CATEGORIES.find((x) => x.id === c.cat) || null;
  return {
    id: `demo-prod-${c.code}`,
    productCode: c.code,
    name: c.name,
    unit: c.unit,
    variant: null as string | null,
    hsnCode: c.hsn,
    gstPercentage: String(c.gst),
    sellingPrice: c.sell.toFixed(2),
    purchasePrice: c.buy.toFixed(2),
    stockQuantity: String(c.stock),
    minimumStock: String(c.min),
    barcode: null as string | null,
    shadeCode: null as string | null,
    category: cat,
    brand: null as { id: string; name: string } | null,
  };
}

export function demoCategoriesList() {
  return { items: DEMO_CATEGORIES.map((c) => ({ ...c, subcategories: [] })) };
}

export function demoProducts(search?: string, page = 1, limit = 30) {
  let all = DEMO_CATALOG.map(buildProduct);
  if (search) {
    const q = search.toLowerCase();
    all = all.filter((p) => p.name.toLowerCase().includes(q) || p.productCode.toLowerCase().includes(q));
  }
  const total = all.length;
  const items = all.slice((page - 1) * limit, page * limit);
  return { items, total, page, limit };
}

export function demoProductSearch(q?: string) {
  if (!q) return { results: [] };
  const query = q.toLowerCase();
  const results = DEMO_CATALOG
    .map(buildProduct)
    .filter((p) => p.name.toLowerCase().includes(query) || p.productCode.toLowerCase().includes(query) || (p.barcode || "").includes(query))
    .slice(0, 12);
  return { results };
}

export function demoLowStock() {
  const items = DEMO_CATALOG
    .filter((c) => c.stock <= c.min)
    .map(buildProduct);
  return { items };
}
