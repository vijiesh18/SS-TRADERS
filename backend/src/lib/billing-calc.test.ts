import { describe, it, expect } from "vitest";
import {
  computeLine,
  computeBillTotals,
  computeGrandTotal,
  computePaymentStatus,
} from "./billing-calc";

describe("computeLine", () => {
  it("computes taxable, GST and total for a simple line (no discount)", () => {
    // 2 × ₹100 = ₹200 taxable, 18% GST = ₹36, total ₹236
    const line = computeLine({ quantity: 2, rate: 100, discountPercent: 0, gstPercentage: 18 });
    expect(line.taxableAmount).toBe(200);
    expect(line.gstAmount).toBe(36);
    expect(line.totalAmount).toBe(236);
  });

  it("applies a percentage discount before GST", () => {
    // 1 × ₹1000, 10% discount → ₹900 taxable, 18% GST = ₹162, total ₹1062
    const line = computeLine({ quantity: 1, rate: 1000, discountPercent: 10, gstPercentage: 18 });
    expect(line.taxableAmount).toBe(900);
    expect(line.gstAmount).toBe(162);
    expect(line.totalAmount).toBe(1062);
  });

  it("handles a 0% GST item (exempt goods)", () => {
    const line = computeLine({ quantity: 5, rate: 50, discountPercent: 0, gstPercentage: 0 });
    expect(line.taxableAmount).toBe(250);
    expect(line.gstAmount).toBe(0);
    expect(line.totalAmount).toBe(250);
  });

  it("handles a 28% GST slab", () => {
    const line = computeLine({ quantity: 1, rate: 1000, discountPercent: 0, gstPercentage: 28 });
    expect(line.gstAmount).toBe(280);
    expect(line.totalAmount).toBe(1280);
  });

  it("handles fractional quantities (e.g. 2.5 litres)", () => {
    // 2.5 × ₹400 = ₹1000 taxable, 18% = ₹180
    const line = computeLine({ quantity: 2.5, rate: 400, discountPercent: 0, gstPercentage: 18 });
    expect(line.taxableAmount).toBe(1000);
    expect(line.gstAmount).toBe(180);
  });

  it("a 100% discount yields zero taxable and zero GST", () => {
    const line = computeLine({ quantity: 3, rate: 200, discountPercent: 100, gstPercentage: 18 });
    expect(line.taxableAmount).toBe(0);
    expect(line.gstAmount).toBe(0);
    expect(line.totalAmount).toBe(0);
  });
});

describe("computeBillTotals", () => {
  it("aggregates multiple lines and splits GST equally into CGST/SGST", () => {
    const totals = computeBillTotals([
      { quantity: 2, rate: 100, discountPercent: 0, gstPercentage: 18 }, // taxable 200, gst 36
      { quantity: 1, rate: 500, discountPercent: 0, gstPercentage: 18 }, // taxable 500, gst 90
    ]);
    expect(totals.subTotal).toBe(700);
    expect(totals.gstAmount).toBe(126);
    expect(totals.cgstAmount).toBe(63);
    expect(totals.sgstAmount).toBe(63);
    expect(totals.igstAmount).toBe(0);
    expect(totals.totalDiscount).toBe(0);
  });

  it("CGST + SGST always sum back to the total GST", () => {
    const totals = computeBillTotals([
      { quantity: 3, rate: 333, discountPercent: 5, gstPercentage: 12 },
      { quantity: 7, rate: 89, discountPercent: 0, gstPercentage: 28 },
    ]);
    expect(totals.cgstAmount + totals.sgstAmount).toBeCloseTo(totals.gstAmount, 10);
  });

  it("accumulates discount across lines", () => {
    const totals = computeBillTotals([
      { quantity: 1, rate: 1000, discountPercent: 10, gstPercentage: 18 }, // discount 100
      { quantity: 2, rate: 500, discountPercent: 20, gstPercentage: 18 }, // discount 200
    ]);
    expect(totals.totalDiscount).toBe(300);
    // subTotal = 900 + 800 = 1700
    expect(totals.subTotal).toBe(1700);
  });

  it("mixes different GST slabs correctly", () => {
    const totals = computeBillTotals([
      { quantity: 1, rate: 100, discountPercent: 0, gstPercentage: 5 },  // gst 5
      { quantity: 1, rate: 100, discountPercent: 0, gstPercentage: 18 }, // gst 18
      { quantity: 1, rate: 100, discountPercent: 0, gstPercentage: 28 }, // gst 28
    ]);
    expect(totals.subTotal).toBe(300);
    expect(totals.gstAmount).toBe(51);
  });

  it("returns zeroed totals for an empty bill", () => {
    const totals = computeBillTotals([]);
    expect(totals.subTotal).toBe(0);
    expect(totals.gstAmount).toBe(0);
    expect(totals.cgstAmount).toBe(0);
    expect(totals.sgstAmount).toBe(0);
    expect(totals.computedLines).toHaveLength(0);
  });
});

describe("computeGrandTotal", () => {
  it("sums subtotal and GST", () => {
    expect(computeGrandTotal(700, 126)).toBe(826);
  });

  it("applies a positive round-off", () => {
    // 165.54 + 0.46 = 166
    expect(computeGrandTotal(140.29, 25.25, 0.46)).toBe(166);
  });

  it("applies a negative round-off", () => {
    // 166.54 - 0.54 = 166
    expect(computeGrandTotal(141, 25.54, -0.54)).toBe(166);
  });

  it("rounds to 2 decimal places", () => {
    // floating point: 0.1 + 0.2 = 0.30000000000000004 → 0.3
    expect(computeGrandTotal(0.1, 0.2)).toBe(0.3);
  });

  it("defaults round-off to zero when omitted", () => {
    expect(computeGrandTotal(100, 18)).toBe(118);
  });
});

describe("computePaymentStatus", () => {
  it("marks a fully paid CASH bill as PAID with zero pending", () => {
    const r = computePaymentStatus(236, 236, "CASH");
    expect(r.pendingAmount).toBe(0);
    expect(r.status).toBe("PAID");
  });

  it("clamps overpayment to zero pending for non-credit", () => {
    // paid more than total (e.g. tendered cash) → no negative balance
    const r = computePaymentStatus(236, 300, "CASH");
    expect(r.pendingAmount).toBe(0);
    expect(r.status).toBe("PAID");
  });

  it("marks a partial credit payment as PARTIAL", () => {
    const r = computePaymentStatus(1000, 400, "CREDIT");
    expect(r.pendingAmount).toBe(600);
    expect(r.status).toBe("PARTIAL");
  });

  it("marks a credit sale with nothing paid as UNPAID", () => {
    const r = computePaymentStatus(1000, 0, "CREDIT");
    expect(r.pendingAmount).toBe(1000);
    expect(r.status).toBe("UNPAID");
  });

  it("marks a fully settled credit sale as PAID", () => {
    const r = computePaymentStatus(1000, 1000, "CREDIT");
    expect(r.pendingAmount).toBe(0);
    expect(r.status).toBe("PAID");
  });

  it("UPI and CARD behave like CASH — overpayment clamped, underpayment kept", () => {
    expect(computePaymentStatus(500, 500, "UPI").status).toBe("PAID");
    expect(computePaymentStatus(500, 500, "CARD").status).toBe("PAID");
    // overpayment (tendered more than due) clamps to zero pending
    expect(computePaymentStatus(500, 600, "UPI").pendingAmount).toBe(0);
    // underpayment still leaves a balance and marks PARTIAL
    const partial = computePaymentStatus(500, 200, "CARD");
    expect(partial.pendingAmount).toBe(300);
    expect(partial.status).toBe("PARTIAL");
  });
});

describe("end-to-end: cart → invoice", () => {
  it("computes a realistic multi-item credit invoice end to end", () => {
    const items = [
      { quantity: 2, rate: 1200, discountPercent: 5, gstPercentage: 18 },  // taxable 2280, gst 410.4
      { quantity: 1, rate: 850, discountPercent: 0, gstPercentage: 28 },   // taxable 850, gst 238
      { quantity: 4, rate: 75, discountPercent: 0, gstPercentage: 18 },    // taxable 300, gst 54
    ];
    const totals = computeBillTotals(items);
    expect(totals.subTotal).toBeCloseTo(3430, 2);
    expect(totals.gstAmount).toBeCloseTo(702.4, 2);

    const grandTotal = computeGrandTotal(totals.subTotal, totals.gstAmount);
    expect(grandTotal).toBeCloseTo(4132.4, 2);

    // Customer pays ₹2000 now on credit
    const payment = computePaymentStatus(grandTotal, 2000, "CREDIT");
    expect(payment.pendingAmount).toBeCloseTo(2132.4, 2);
    expect(payment.status).toBe("PARTIAL");
  });
});
