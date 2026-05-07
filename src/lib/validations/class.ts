import { z } from "zod";

export const ClassSchema = z
  .object({
    name: z.string().min(2, "Class name is required").max(120),
    trainerId: z.string().optional().or(z.literal("")),
    date: z.string().min(1, "Date is required"),
    startTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Start time must be HH:MM"),
    endTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "End time must be HH:MM"),
    capacity: z.coerce.number().int().min(1).max(500).default(20),
    status: z
      .enum(["SCHEDULED", "ONGOING", "COMPLETED", "CANCELLED"])
      .default("SCHEDULED"),
    notes: z.string().max(1000).optional().or(z.literal("")),
  })
  .refine(
    (v) => {
      const [sh, sm] = v.startTime.split(":").map(Number) as [number, number];
      const [eh, em] = v.endTime.split(":").map(Number) as [number, number];
      return eh * 60 + em > sh * 60 + sm;
    },
    { message: "End time must be after start time", path: ["endTime"] },
  );

export type ClassInput = z.infer<typeof ClassSchema>;
