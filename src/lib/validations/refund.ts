import { z } from "zod";

export const RefundPaymentSchema = z.object({
  reason: z.string().min(1, "Reason is required").max(500),
});

export type RefundPaymentInput = z.infer<typeof RefundPaymentSchema>;
