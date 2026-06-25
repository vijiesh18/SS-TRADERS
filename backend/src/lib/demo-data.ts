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
