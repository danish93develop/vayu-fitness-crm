import { z } from "zod";

export const MemberSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters").max(120),
  phone: z
    .string()
    .min(7, "Phone is required")
    .max(20)
    .regex(/^[+0-9 ()-]+$/, "Phone can only contain numbers, spaces, +, -, ()"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  gender: z.enum(["MALE", "FEMALE", "OTHER", "UNSPECIFIED"]).default("UNSPECIFIED"),
  dateOfBirth: z.string().optional().or(z.literal("")), // ISO date string from <input type="date">
  address: z.string().max(500).optional().or(z.literal("")),
  emergencyName: z.string().max(120).optional().or(z.literal("")),
  emergencyPhone: z
    .string()
    .max(20)
    .regex(/^[+0-9 ()-]*$/, "Phone can only contain numbers, spaces, +, -, ()")
    .optional()
    .or(z.literal("")),
  joiningDate: z.string().min(1, "Joining date is required"),
  assignedTrainerId: z.string().optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
});

export type MemberInput = z.infer<typeof MemberSchema>;
