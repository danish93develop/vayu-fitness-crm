import { z } from "zod";

export const SettingsSchema = z.object({
  name: z.string().min(2, "Gym name is required").max(120),
  legalName: z.string().max(120).optional().or(z.literal("")),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().max(20).optional().or(z.literal("")),
  address: z.string().max(500).optional().or(z.literal("")),
  gstNumber: z
    .string()
    .max(20)
    .optional()
    .or(z.literal("")),
  invoicePrefix: z.string().min(1, "Invoice prefix is required").max(10),
  invoiceFooter: z.string().max(500).optional().or(z.literal("")),
  invoiceTerms: z.string().max(2000).optional().or(z.literal("")),
  defaultGstPct: z.coerce.number().int().min(0).max(50),
  expiryAlertDays: z.coerce.number().int().min(1).max(60),
});

export type SettingsInput = z.infer<typeof SettingsSchema>;
