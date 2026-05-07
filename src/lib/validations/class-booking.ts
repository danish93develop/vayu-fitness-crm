import { z } from "zod";

export const ClassBookingSchema = z.object({
  classId: z.string().min(1),
  memberId: z.string().min(1, "Pick a member"),
  notes: z.string().max(500).optional().or(z.literal("")),
});

export type ClassBookingInput = z.infer<typeof ClassBookingSchema>;
