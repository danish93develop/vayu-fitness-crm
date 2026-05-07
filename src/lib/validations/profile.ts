import { z } from "zod";

const passwordRule = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password too long")
  .regex(/[A-Za-z]/, "Password must contain a letter")
  .regex(/[0-9]/, "Password must contain a number");

/**
 * Editable bits on the user's own profile. Email and role are intentionally
 * excluded — those are admin-managed to keep the audit trail honest.
 */
export const ProfileUpdateSchema = z.object({
  name: z.string().min(2, "Name is required").max(120),
  phone: z.string().max(20).optional().or(z.literal("")),
});

export type ProfileUpdateInput = z.infer<typeof ProfileUpdateSchema>;

export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    password: passwordRule,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })
  .refine((v) => v.password !== v.currentPassword, {
    message: "New password must be different from your current one",
    path: ["password"],
  });

export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;
