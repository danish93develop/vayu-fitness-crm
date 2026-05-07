/**
 * Money helpers — all money in the DB is stored as Int paise (₹×100).
 * NEVER use floats for currency. Use these helpers at the I/O boundary only.
 */

export const PAISE_PER_RUPEE = 100;

export function rupeesToPaise(rupees: number): number {
  // Round to avoid 12.999999 drift from JS float math
  return Math.round(rupees * PAISE_PER_RUPEE);
}

export function paiseToRupees(paise: number): number {
  return paise / PAISE_PER_RUPEE;
}

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

/** Format paise as a localized INR string, e.g. ₹2,000.00 */
export function formatPaise(paise: number): string {
  return inrFormatter.format(paiseToRupees(paise));
}

/** Same as formatPaise but with no fractional part for whole-rupee amounts */
export function formatPaiseShort(paise: number): string {
  if (paise % PAISE_PER_RUPEE === 0) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(paiseToRupees(paise));
  }
  return formatPaise(paise);
}

/**
 * Apply a percentage (basis: integer percent, e.g. 18 = 18%) and return
 * the tax amount in paise, rounded.
 */
export function gstAmountPaise(taxablePaise: number, gstPercent: number): number {
  return Math.round((taxablePaise * gstPercent) / 100);
}

/**
 * Same as `formatPaiseShort` but uses "Rs." instead of ₹. The default PDF
 * fonts (Helvetica family) don't bundle the rupee glyph, so the unicode
 * character renders as a placeholder square. "Rs." is safe everywhere.
 */
export function formatPaiseForPdf(paise: number): string {
  const rupees = paiseToRupees(paise);
  const fractional = paise % PAISE_PER_RUPEE !== 0;
  const formatted = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: fractional ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(rupees);
  return `Rs. ${formatted}`;
}
