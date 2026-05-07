/**
 * Vayu Fitness brand constants — keep in one place so we can rebrand
 * (or white-label per gym in future) without grepping the codebase.
 */
// NOTE: replace contact details below with your gym's actual info before deploying.
// These are kept generic in source so the public repo doesn't expose private info.
export const BRAND = {
  name: "Vayu Fitness",
  shortName: "VF",
  tagline: "Stay consistent, stay strong.",
  phone: "+91 0000000000",
  email: "info@example.com",
  address: "Set your gym address here, City, State",
  invoicePrefix: "VF-INV",
  invoiceFooter: "Thank you for choosing Vayu Fitness. Stay consistent, stay strong.",
  invoiceTerms:
    "Fees once paid are non-refundable. Membership is non-transferable. Membership freeze requests are subject to approval. Please keep this receipt for your records.",
  defaultGstPercent: 18,
  expiryAlertDays: 7,
  colors: {
    primary: "#A3E635",
    dark: "#111827",
    background: "#F9FAFB",
    text: "#1F2937",
    accent: "#22C55E",
  },
} as const;
