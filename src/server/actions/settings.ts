"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { SettingsSchema, type SettingsInput } from "@/lib/validations/settings";

type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export async function updateSettingsAction(values: SettingsInput): Promise<ActionResult> {
  const { user } = await requirePermission("settings:update");

  const parsed = SettingsSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  const existing = await prisma.gym.findUnique({ where: { id: user.gymId } });
  if (!existing) return { ok: false, error: "Gym record not found." };

  try {
    await prisma.gym.update({
      where: { id: user.gymId },
      data: {
        name: v.name.trim(),
        legalName: v.legalName?.trim() || null,
        email: v.email?.trim() || null,
        phone: v.phone?.trim() || null,
        address: v.address?.trim() || null,
        gstNumber: v.gstNumber?.trim() || null,
        invoicePrefix: v.invoicePrefix.trim().toUpperCase(),
        invoiceFooter: v.invoiceFooter?.trim() || null,
        invoiceTerms: v.invoiceTerms?.trim() || null,
        defaultGstPct: v.defaultGstPct,
        expiryAlertDays: v.expiryAlertDays,
      },
    });

    await audit({
      gymId: user.gymId,
      userId: user.id,
      action: "SETTINGS_UPDATED",
      entityType: "Gym",
      entityId: user.gymId,
      oldValue: {
        name: existing.name,
        defaultGstPct: existing.defaultGstPct,
        expiryAlertDays: existing.expiryAlertDays,
        invoicePrefix: existing.invoicePrefix,
      },
      newValue: {
        name: v.name,
        defaultGstPct: v.defaultGstPct,
        expiryAlertDays: v.expiryAlertDays,
        invoicePrefix: v.invoicePrefix,
      },
    });

    revalidatePath("/settings");
    revalidatePath("/dashboard");
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
