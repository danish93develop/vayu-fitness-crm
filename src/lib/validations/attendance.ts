import { z } from "zod";

export const CheckInSchema = z.object({
  memberId: z.string().min(1, "Member is required"),
  notes: z.string().max(500).optional().or(z.literal("")),
});

export type CheckInInput = z.infer<typeof CheckInSchema>;

export const EditAttendanceSchema = z.object({
  // HH:MM 24-hour
  time: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Time must be in HH:MM format"),
  notes: z.string().max(500).optional().or(z.literal("")),
});

export type EditAttendanceInput = z.infer<typeof EditAttendanceSchema>;
