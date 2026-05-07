import { z } from "zod";

const ROLE = z.enum([
  "SUPER_ADMIN",
  "ADMIN",
  "MANAGER",
  "RECEPTIONIST",
  "ACCOUNTANT",
  "TRAINER",
]);

const passwordRule = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password too long")
  .regex(/[A-Za-z]/, "Password must contain a letter")
  .regex(/[0-9]/, "Password must contain a number");

export const UserCreateSchema = z.object({
  name: z.string().min(2, "Name is required").max(120),
  email: z.string().email("Invalid email").toLowerCase(),
  phone: z.string().max(20).optional().or(z.literal("")),
  role: ROLE,
  password: passwordRule,
  isActive: z.boolean().default(true),
});

export type UserCreateInput = z.infer<typeof UserCreateSchema>;

export const UserUpdateSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email("Invalid email").toLowerCase(),
  phone: z.string().max(20).optional().or(z.literal("")),
  role: ROLE,
  isActive: z.boolean().default(true),
  // Optional on update — leave blank to keep existing password
  password: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine(
      (v) => !v || passwordRule.safeParse(v).success,
      "Password must be 8+ chars with a letter and a number",
    ),
});

export type UserUpdateInput = z.infer<typeof UserUpdateSchema>;

export const ResetPasswordSchema = z.object({
  password: passwordRule,
});

export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
