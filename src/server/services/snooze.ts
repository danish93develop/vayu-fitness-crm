import { prisma } from "@/lib/prisma";

export type AlertKey = "expired" | "overdue" | "freezes" | "followups";

const PREFIX = "snooze:";
const settingKey = (userId: string, alertKey: AlertKey) =>
  `${PREFIX}${userId}:${alertKey}`;

/**
 * Returns the set of alertKeys this user has snoozed (and not yet expired).
 * Stored in the Setting table — no schema migration needed.
 */
export async function getActiveSnoozes(
  gymId: string,
  userId: string,
): Promise<Set<AlertKey>> {
  const rows = await prisma.setting.findMany({
    where: {
      gymId,
      key: { startsWith: `${PREFIX}${userId}:` },
    },
  });
  const now = new Date();
  const active = new Set<AlertKey>();
  for (const r of rows) {
    const value = r.value as { until?: string } | null;
    if (!value?.until) continue;
    const until = new Date(value.until);
    if (until > now) {
      const key = r.key.replace(`${PREFIX}${userId}:`, "") as AlertKey;
      active.add(key);
    }
  }
  return active;
}

export async function setSnooze(
  gymId: string,
  userId: string,
  alertKey: AlertKey,
  hours: number,
) {
  const until = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
  await prisma.setting.upsert({
    where: { gymId_key: { gymId, key: settingKey(userId, alertKey) } },
    update: { value: { until } },
    create: { gymId, key: settingKey(userId, alertKey), value: { until } },
  });
}

export async function clearSnooze(
  gymId: string,
  userId: string,
  alertKey: AlertKey,
) {
  await prisma.setting
    .delete({
      where: { gymId_key: { gymId, key: settingKey(userId, alertKey) } },
    })
    .catch(() => {});
}
