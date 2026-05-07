"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/session";
import { markRead } from "@/server/services/notifications";

type ActionResult = { ok: true } | { ok: false; error: string };

export async function markAllReadAction(): Promise<ActionResult> {
  const session = await requireAuth();
  await markRead(session.user.id);
  revalidatePath("/notifications");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function markReadAction(ids: string[]): Promise<ActionResult> {
  const session = await requireAuth();
  await markRead(session.user.id, ids);
  revalidatePath("/notifications");
  revalidatePath("/dashboard");
  return { ok: true };
}
