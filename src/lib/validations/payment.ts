import { z } from "zod";

export const PaymentSchema = z
  .object({
    membershipId: z.string().min(1, "Membership is required"),
    amountRupees: z.coerce.number().positive("Amount must be greater than zero"),
    discountRupees: z.coerce.number().min(0).default(0),
    discountReason: z.string().max(500).optional().or(z.literal("")),
    mode: z.enum(["CASH", "UPI", "CARD", "BANK_TRANSFER", "OTHER"]),
    paymentDate: z.string().min(1, "Payment date is required"),
    reference: z.string().max(120).optional().or(z.literal("")),
    notes: z.string().max(1000).optional().or(z.literal("")),
    // Set true to split this payment as installment 1 of 2 for an annual plan
    asInstallment: z.boolean().default(false),
    secondInstallmentDueDate: z.string().optional().or(z.literal("")),
  })
  .refine(
    (v) => !v.asInstallment || !!v.secondInstallmentDueDate,
    {
      message: "Second installment due date is required when paying as installment 1",
      path: ["secondInstallmentDueDate"],
    },
  );

export type PaymentInput = z.infer<typeof PaymentSchema>;

export const VoidPaymentSchema = z.object({
  reason: z.string().min(1, "Reason is required").max(500),
});

export type VoidPaymentInput = z.infer<typeof VoidPaymentSchema>;
