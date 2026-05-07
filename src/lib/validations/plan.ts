import { z } from "zod";

export const PlanSchema = z
  .object({
    name: z.string().min(2, "Name is required").max(120),
    type: z.enum(["MAIN_MEMBERSHIP", "ADD_ON", "CLASS_PACKAGE", "PERSONAL_TRAINING"]),
    durationValue: z.coerce.number().int().min(1, "Duration must be at least 1"),
    durationUnit: z.enum(["DAY", "MONTH", "YEAR"]).default("MONTH"),
    // We accept rupees in the form (more user-friendly) and convert to paise in the action
    priceRupees: z.coerce.number().min(0, "Price can't be negative"),
    description: z.string().max(2000).optional().or(z.literal("")),
    allowsInstallments: z.boolean().default(false),
    maxInstallments: z.coerce.number().int().min(1).max(12).default(1),
    isActive: z.boolean().default(true),
    sortOrder: z.coerce.number().int().default(0),
  })
  .refine(
    (v) => {
      // Per spec: only annual or longer plans can use installments
      if (!v.allowsInstallments) return true;
      const months =
        v.durationUnit === "YEAR"
          ? v.durationValue * 12
          : v.durationUnit === "MONTH"
            ? v.durationValue
            : v.durationValue / 30;
      return months >= 12;
    },
    {
      message: "Installments are only allowed on plans of 12 months or longer.",
      path: ["allowsInstallments"],
    },
  )
  .refine((v) => !v.allowsInstallments || v.maxInstallments >= 2, {
    message: "Plans with installments must allow at least 2.",
    path: ["maxInstallments"],
  });

export type PlanInput = z.infer<typeof PlanSchema>;
