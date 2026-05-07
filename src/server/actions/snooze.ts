"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/session";
import { setSnooze, clearSnooze, type AlertKey } from "@/server/services/snooze";

type ActionResult = { ok: true } | { ok: false; error: string };

export async function snoozeAlertAction(
  alertKey: AlertKey,
  hours: number = 24,
): Promise<ActionResult> {
  const session = await requireAuth();
  if (hours < 1 || hours > 168) {
    return { ok: false, error: "Snooze must be between 1 and 168 hours." };
  }
  await setSnooze(session.user.gymId, session.user.id, alertKey, hours);
  revalidatePath("/dashboard");
  revalidatePath("/notifications");
  return { ok: true };
}

export async function unsnoozeAlertAction(alertKey: AlertKey): Promise<ActionResult> {
  const session = await requireAuth();
  await clearSnooze(session.user.gymId, session.user.id, alertKey);
  revalidatePath("/dashboard");
  revalidatePath("/notifications");
  return { ok: true };
}
