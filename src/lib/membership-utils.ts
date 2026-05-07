import { addDays, addMonths, addYears } from "date-fns";
import type { PlanDurationUnit } from "@prisma/client";

/**
 * Compute a membership end date given a start date + plan duration.
 * Subtract 1 day so a "1-month" membership starting on the 1st ends on the
 * 31st (not the 1st of next month) — the customer paid for 30/31 days,
 * not 31/32.
 */
export function computeEndDate(
  startDate: Date,
  durationValue: number,
  durationUnit: PlanDurationUnit,
): Date {
  let end: Date;
  switch (durationUnit) {
    case "DAY":
      end = addDays(startDate, durationValue);
      break;
    case "MONTH":
      end = addMonths(startDate, durationValue);
      break;
    case "YEAR":
      end = addYears(startDate, durationValue);
      break;
  }
  return addDays(end, -1);
}

/** Pretty label for a plan duration */
export function formatDuration(value: number, unit: PlanDurationUnit): string {
  const word = unit === "DAY" ? "day" : unit === "MONTH" ? "month" : "year";
  return `${value} ${word}${value !== 1 ? "s" : ""}`;
}

/** Days between two dates, inclusive of start, exclusive of end + 1 */
export function inclusiveDays(startDate: Date, endDate: Date): number {
  const ms = endDate.getTime() - startDate.getTime();
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)) + 1);
}
