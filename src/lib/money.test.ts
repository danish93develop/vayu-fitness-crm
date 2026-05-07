import { describe, it, expect } from "vitest";
import { rupeesToPaise, paiseToRupees, gstAmountPaise, formatPaise } from "./money";

describe("money helpers", () => {
  it("rupees → paise round-trips correctly", () => {
    expect(rupeesToPaise(100)).toBe(10_000);
    expect(rupeesToPaise(0.5)).toBe(50);
    expect(rupeesToPaise(2_000)).toBe(200_000);
    expect(paiseToRupees(rupeesToPaise(123.45))).toBeCloseTo(123.45, 2);
  });

  it("avoids float drift on tricky rupee values", () => {
    // Naive multiplication: 0.1 + 0.2 = 0.30000000000000004
    expect(rupeesToPaise(0.1 + 0.2)).toBe(30);
  });

  it("computes GST correctly at 18% (the standard)", () => {
    expect(gstAmountPaise(200_000, 18)).toBe(36_000); // 18% of ₹2,000 = ₹360
    expect(gstAmountPaise(1_800_000, 18)).toBe(324_000); // 18% of ₹18,000 = ₹3,240
    expect(gstAmountPaise(1_000_000, 18)).toBe(180_000); // 18% of ₹10,000 = ₹1,800
  });

  it("rounds GST to nearest paisa (no fractional paise)", () => {
    // 7% of ₹100 = ₹7.00 exactly
    expect(gstAmountPaise(10_000, 7)).toBe(700);
    // 18% of ₹1.01 = 18.18 paise → rounds to 18 paise
    expect(gstAmountPaise(101, 18)).toBe(18);
  });

  it("handles zero edge cases", () => {
    expect(gstAmountPaise(0, 18)).toBe(0);
    expect(gstAmountPaise(100, 0)).toBe(0);
  });

  it("formats Indian currency with proper grouping", () => {
    expect(formatPaise(2_000_00)).toContain("2,000");
    expect(formatPaise(18_000_00)).toContain("18,000");
    expect(formatPaise(1_00_000_00)).toContain("1,00,000"); // Indian lakh format
  });
});
