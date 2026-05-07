import { z } from "zod";

export const LeadSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(120),
  phone: z.string().min(7, "Phone is required").max(20),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  gender: z.enum(["MALE", "FEMALE", "OTHER", "UNSPECIFIED"]).default("UNSPECIFIED"),
  source: z
    .enum([
      "WALK_IN",
      "REFERRAL",
      "INSTAGRAM",
      "FACEBOOK",
      "GOOGLE",
      "WHATSAPP",
      "WEBSITE",
      "OTHER",
    ])
    .default("WALK_IN"),
  interestedPlanId: z.string().optional().or(z.literal("")),
  followUpDate: z.string().optional().or(z.literal("")),
  assignedToId: z.string().optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
});

export type LeadInput = z.infer<typeof LeadSchema>;

export const FollowUpSchema = z.object({
  note: z.string().min(1, "Note is required").max(1000),
  nextFollowUpDate: z.string().optional().or(z.literal("")),
});

export type FollowUpInput = z.infer<typeof FollowUpSchema>;

export const LeadStatusSchema = z.object({
  status: z.enum(["NEW", "CONTACTED", "TRIAL_BOOKED", "TRIAL_COMPLETED", "LOST"]),
  // CONVERTED is set only via the convert flow
});

export type LeadStatusInput = z.infer<typeof LeadStatusSchema>;

export const ConvertLeadSchema = z.object({
  assignedTrainerId: z.string().optional().or(z.literal("")),
  joiningDate: z.string().min(1, "Joining date is required"),
});

export type ConvertLeadInput = z.infer<typeof ConvertLeadSchema>;
