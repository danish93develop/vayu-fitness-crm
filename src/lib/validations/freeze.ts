import { z } from "zod";

export const FreezeRequestSchema = z
  .object({
    membershipId: z.string().min(1, "Membership is required"),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    reason: z.string().min(3, "Reason is required").max(500),
  })
  .refine((v) => new Date(v.endDate) >= new Date(v.startDate), {
    message: "End date must be on or after start date",
    path: ["endDate"],
  });

export type FreezeRequestInput = z.infer<typeof FreezeRequestSchema>;

export const FreezeRejectSchema = z.object({
  rejectionReason: z.string().min(1, "Rejection reason is required").max(500),
});

export type FreezeRejectInput = z.infer<typeof FreezeRejectSchema>;
