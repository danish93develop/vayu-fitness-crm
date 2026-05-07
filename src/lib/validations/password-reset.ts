import { z } from "zod";

export const RequestResetSchema = z.object({
  email: z.string().email("Invalid email").toLowerCase(),
});
export type RequestResetInput = z.infer<typeof RequestResetSchema>;

export const PerformResetSchema = z
  .object({
    token: z.string().min(20),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Za-z]/, "Password must contain a letter")
      .regex(/[0-9]/, "Password must contain a number"),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export type PerformResetInput = z.infer<typeof PerformResetSchema>;
