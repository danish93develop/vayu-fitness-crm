import { z } from "zod";

export const TrainerSchema = z.object({
  name: z.string().min(2).max(120),
  phone: z.string().max(20).optional().or(z.literal("")),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  specialization: z.string().max(120).optional().or(z.literal("")),
  bio: z.string().max(2000).optional().or(z.literal("")),
  isActive: z.boolean().default(true),
});

export type TrainerInput = z.infer<typeof TrainerSchema>;
