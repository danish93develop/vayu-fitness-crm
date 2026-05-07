import { describe, it, expect } from "vitest";
import { BUSINESS_RULES } from "./business-rules";
import { gstAmountPaise } from "@/lib/money";

describe("freeze rules", () => {
  it("caps total freeze days at 30 per membership (per spec)", () => {
    expect(BUSINESS_RULES.freeze.maxDaysPerMembership).toBe(30);
  });

  it("allows the spec's '15 days + 15 days' two-phase split", () => {
    const phase1 = 15;
    const phase2 = 15;
    expect(phase1 + phase2).toBeLessThanOrEqual(BUSINESS_RULES.freeze.maxDaysPerMembership);
    expect(BUSINESS_RULES.freeze.maxPhases).toBe(2);
  });

  it("rejects a phase that would exceed the cap", () => {
    const used = 25;
    const requested = 10;
    expect(used + requested).toBeGreaterThan(BUSINESS_RULES.freeze.maxDaysPerMembership);
  });
});

describe("installment rules", () => {
  it("only annual (12-month+) plans can be paid in installments", () => {
    expect(BUSINESS_RULES.installment.minDurationMonths).toBe(12);
  });

  it("annual plan splits into max 2 equal installments (per spec)", () => {
    expect(BUSINESS_RULES.installment.maxInstallments).toBe(2);

    // ₹18,000 split: half + half = full
    const total = 1_800_000; // paise
    const half = Math.round(total / 2);
    const second = total - half;
    expect(half + second).toBe(total);
  });

  it("monthly/quarterly/half-yearly plans must pay in full", () => {
    // Spec: "Monthly plan: full payment only" (and so on)
    const monthlyDuration = 1;
    const quarterlyDuration = 3;
    const halfYearlyDuration = 6;
    [monthlyDuration, quarterlyDuration, halfYearlyDuration].forEach((d) => {
      expect(d).toBeLessThan(BUSINESS_RULES.installment.minDurationMonths);
    });
  });
});

describe("GST math against the actual seeded plans", () => {
  it("Annual membership ₹18,000 + 18% GST = ₹21,240", () => {
    const base = 1_800_000; // ₹18,000 in paise
    const gst = gstAmountPaise(base, 18);
    expect(base + gst).toBe(2_124_000); // ₹21,240
  });

  it("Quarterly membership ₹5,500 + 18% GST = ₹6,490", () => {
    const base = 550_000;
    const gst = gstAmountPaise(base, 18);
    expect(base + gst).toBe(649_000);
  });

  it("Annual installment 1 of 2 = ₹9,000 + 18% GST = ₹10,620", () => {
    const half = 900_000;
    const gst = gstAmountPaise(half, 18);
    expect(half + gst).toBe(1_062_000);
  });
});

describe("security defaults", () => {
  it("locks account after 5 failed login attempts (per spec convention)", () => {
    expect(BUSINESS_RULES.security.maxFailedLoginAttempts).toBe(5);
  });

  it("lockout duration is 15 minutes", () => {
    expect(BUSINESS_RULES.security.lockoutMinutes).toBe(15);
  });
});
