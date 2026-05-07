import { describe, it, expect } from "vitest";
import { computeEndDate, formatDuration, inclusiveDays } from "./membership-utils";

describe("computeEndDate", () => {
  it("1-month membership starting 1 Jan ends 31 Jan (not 1 Feb)", () => {
    const end = computeEndDate(new Date("2026-01-01"), 1, "MONTH");
    expect(end.toISOString().slice(0, 10)).toBe("2026-01-31");
  });

  it("12-month membership starting 1 Jan ends 31 Dec (full year)", () => {
    const end = computeEndDate(new Date("2026-01-01"), 12, "MONTH");
    expect(end.toISOString().slice(0, 10)).toBe("2026-12-31");
  });

  it("3-month plan starting mid-month aligns to date", () => {
    const end = computeEndDate(new Date("2026-03-15"), 3, "MONTH");
    expect(end.toISOString().slice(0, 10)).toBe("2026-06-14");
  });

  it("1-year plan ends day before anniversary", () => {
    const end = computeEndDate(new Date("2026-05-03"), 1, "YEAR");
    expect(end.toISOString().slice(0, 10)).toBe("2027-05-02");
  });

  it("day-based plans", () => {
    const end = computeEndDate(new Date("2026-05-01"), 7, "DAY");
    expect(end.toISOString().slice(0, 10)).toBe("2026-05-07");
  });
});

describe("formatDuration", () => {
  it("singular vs plural", () => {
    expect(formatDuration(1, "MONTH")).toBe("1 month");
    expect(formatDuration(3, "MONTH")).toBe("3 months");
    expect(formatDuration(1, "YEAR")).toBe("1 year");
    expect(formatDuration(2, "YEAR")).toBe("2 years");
    expect(formatDuration(1, "DAY")).toBe("1 day");
    expect(formatDuration(15, "DAY")).toBe("15 days");
  });
});

describe("inclusiveDays", () => {
  it("counts both start and end days", () => {
    // 1 Jan to 1 Jan = 1 day
    expect(inclusiveDays(new Date("2026-01-01"), new Date("2026-01-01"))).toBe(1);
    // 1 Jan to 15 Jan = 15 days
    expect(inclusiveDays(new Date("2026-01-01"), new Date("2026-01-15"))).toBe(15);
  });

  it("handles 30-day freeze span correctly", () => {
    // Two 15-day freezes should sum to exactly 30 days (the spec cap)
    const phase1 = inclusiveDays(new Date("2026-06-01"), new Date("2026-06-15"));
    const phase2 = inclusiveDays(new Date("2026-07-01"), new Date("2026-07-15"));
    expect(phase1 + phase2).toBe(30);
  });
});
