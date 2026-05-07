import { z } from "zod";

export const AssignMembershipSchema = z.object({
  memberId: z.string().min(1, "Member is required"),
  planId: z.string().min(1, "Plan is required"),
  startDate: z.string().min(1, "Start date is required"),
  // Discount in rupees (converted to paise in the action)
  discountRupees: z.coerce.number().min(0).default(0),
  discountReason: z.string().max(500).optional().or(z.literal("")),
  // Quick activate without payment record (for historical entries / testing)
  // — actual payment workflow lands in Phase 6
  markAsPaid: z.boolean().default(false),
  notes: z.string().max(1000).optional().or(z.literal("")),
});

export type AssignMembershipInput = z.infer<typeof AssignMembershipSchema>;

export const RenewMembershipSchema = z.object({
  planId: z.string().min(1, "Plan is required"),
  startDate: z.string().min(1, "Start date is required"),
  discountRupees: z.coerce.number().min(0).default(0),
  discountReason: z.string().max(500).optional().or(z.literal("")),
  markAsPaid: z.boolean().default(false),
  notes: z.string().max(1000).optional().or(z.literal("")),
});

export type RenewMembershipInput = z.infer<typeof RenewMembershipSchema>;

export const CancelMembershipSchema = z.object({
  reason: z.string().min(1, "Reason is required").max(500),
});

export type CancelMembershipInput = z.infer<typeof CancelMembershipSchema>;
