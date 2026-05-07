"use server";

import { requirePermission } from "@/lib/auth/session";
import { searchEligibleMembers } from "@/server/services/class-bookings";

type Member = Awaited<ReturnType<typeof searchEligibleMembers>>[number];

type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

/**
 * Server-action variant of the eligible-member search. Lives in /actions
 * (not /services) because client components must call it through the
 * "use server" boundary.
 */
export async function searchMembersForBooking(
  classId: string,
  query: string,
): Promise<ActionResult<Member[]>> {
  const { user } = await requirePermission("classes:book");
  const data = await searchEligibleMembers(user.gymId, classId, query, 10);
  return { ok: true, data };
}
