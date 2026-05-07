"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import {
  LeadSchema,
  FollowUpSchema,
  LeadStatusSchema,
  ConvertLeadSchema,
  type LeadInput,
  type FollowUpInput,
  type LeadStatusInput,
  type ConvertLeadInput,
} from "@/lib/validations/lead";
import { nextMemberCode } from "@/server/services/members";

type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export async function createLeadAction(values: LeadInput): Promise<ActionResult<{ id: string }>> {
  const { user } = await requirePermission("leads:create");

  const parsed = LeadSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  const branch = await prisma.branch.findFirst({
    where: { gymId: user.gymId, deletedAt: null, isDefault: true },
  });
  if (!branch) return { ok: false, error: "No default branch configured." };

  try {
    const lead = await prisma.lead.create({
      data: {
        gymId: user.gymId,
        branchId: branch.id,
        name: v.name.trim(),
        phone: v.phone.trim(),
        email: v.email?.trim() || null,
        gender: v.gender,
        source: v.source,
        interestedPlanId: v.interestedPlanId || null,
        followUpDate: v.followUpDate ? new Date(v.followUpDate) : null,
        assignedToId: v.assignedToId || null,
        notes: v.notes?.trim() || null,
        createdById: user.id,
      },
    });

    await audit({
      gymId: user.gymId,
      userId: user.id,
      action: "CREATE",
      entityType: "Lead",
      entityId: lead.id,
      newValue: { name: lead.name, phone: lead.phone, source: lead.source },
    });

    revalidatePath("/leads");
    return { ok: true, data: { id: lead.id } };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function updateLeadAction(
  id: string,
  values: LeadInput,
): Promise<ActionResult<{ id: string }>> {
  const { user } = await requirePermission("leads:update");

  const parsed = LeadSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  const existing = await prisma.lead.findFirst({
    where: { id, gymId: user.gymId, deletedAt: null },
  });
  if (!existing) return { ok: false, error: "Lead not found." };

  try {
    await prisma.lead.update({
      where: { id },
      data: {
        name: v.name.trim(),
        phone: v.phone.trim(),
        email: v.email?.trim() || null,
        gender: v.gender,
        source: v.source,
        interestedPlanId: v.interestedPlanId || null,
        followUpDate: v.followUpDate ? new Date(v.followUpDate) : null,
        assignedToId: v.assignedToId || null,
        notes: v.notes?.trim() || null,
      },
    });

    await audit({
      gymId: user.gymId,
      userId: user.id,
      action: "UPDATE",
      entityType: "Lead",
      entityId: id,
      oldValue: { name: existing.name, status: existing.status },
      newValue: { name: v.name },
    });

    revalidatePath("/leads");
    revalidatePath(`/leads/${id}`);
    return { ok: true, data: { id } };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function deleteLeadAction(id: string): Promise<ActionResult> {
  const { user } = await requirePermission("leads:delete");

  const existing = await prisma.lead.findFirst({
    where: { id, gymId: user.gymId, deletedAt: null },
  });
  if (!existing) return { ok: false, error: "Lead not found." };

  try {
    await prisma.lead.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await audit({
      gymId: user.gymId,
      userId: user.id,
      action: "SOFT_DELETE",
      entityType: "Lead",
      entityId: id,
      oldValue: { name: existing.name },
    });

    revalidatePath("/leads");
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function addFollowUpAction(
  leadId: string,
  values: FollowUpInput,
): Promise<ActionResult> {
  const { user } = await requirePermission("leads:update");

  const parsed = FollowUpSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  const lead = await prisma.lead.findFirst({
    where: { id: leadId, gymId: user.gymId, deletedAt: null },
  });
  if (!lead) return { ok: false, error: "Lead not found." };

  try {
    await prisma.$transaction(async (tx) => {
      await tx.leadFollowUp.create({
        data: {
          leadId,
          userId: user.id,
          note: v.note.trim(),
          nextFollowUpDate: v.nextFollowUpDate ? new Date(v.nextFollowUpDate) : null,
        },
      });
      // Auto-bump lead from NEW → CONTACTED on first follow-up
      if (lead.status === "NEW") {
        await tx.lead.update({
          where: { id: leadId },
          data: { status: "CONTACTED" },
        });
      }
      // Update the lead's nextFollowUpDate so dashboards see it
      if (v.nextFollowUpDate) {
        await tx.lead.update({
          where: { id: leadId },
          data: { followUpDate: new Date(v.nextFollowUpDate) },
        });
      }
    });

    await audit({
      gymId: user.gymId,
      userId: user.id,
      action: "UPDATE",
      entityType: "Lead",
      entityId: leadId,
      metadata: { followUpAdded: true },
    });

    revalidatePath(`/leads/${leadId}`);
    revalidatePath("/leads");
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function changeLeadStatusAction(
  leadId: string,
  values: LeadStatusInput,
): Promise<ActionResult> {
  const { user } = await requirePermission("leads:update");

  const parsed = LeadStatusSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid status" };
  }

  const existing = await prisma.lead.findFirst({
    where: { id: leadId, gymId: user.gymId, deletedAt: null },
  });
  if (!existing) return { ok: false, error: "Lead not found." };
  if (existing.status === "CONVERTED") {
    return { ok: false, error: "Converted leads cannot change status. Use the member record." };
  }

  try {
    await prisma.lead.update({
      where: { id: leadId },
      data: { status: parsed.data.status },
    });

    await audit({
      gymId: user.gymId,
      userId: user.id,
      action: "UPDATE",
      entityType: "Lead",
      entityId: leadId,
      oldValue: { status: existing.status },
      newValue: { status: parsed.data.status },
    });

    revalidatePath(`/leads/${leadId}`);
    revalidatePath("/leads");
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

/**
 * Convert a lead to a member — atomic transaction:
 *   1. Create Member from lead's data
 *   2. Mark Lead.status = CONVERTED, Lead.convertedMemberId, Lead.convertedAt
 *   3. Audit both
 */
export async function convertLeadAction(
  leadId: string,
  values: ConvertLeadInput,
): Promise<ActionResult<{ memberId: string }>> {
  const { user } = await requirePermission("leads:convert");

  const parsed = ConvertLeadSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  const lead = await prisma.lead.findFirst({
    where: { id: leadId, gymId: user.gymId, deletedAt: null },
  });
  if (!lead) return { ok: false, error: "Lead not found." };
  if (lead.status === "CONVERTED") return { ok: false, error: "Lead already converted." };

  const memberCode = await nextMemberCode(user.gymId);

  try {
    const memberId = await prisma.$transaction(async (tx) => {
      const member = await tx.member.create({
        data: {
          memberCode,
          gymId: lead.gymId,
          branchId: lead.branchId,
          fullName: lead.name,
          phone: lead.phone,
          email: lead.email,
          gender: lead.gender,
          joiningDate: new Date(v.joiningDate),
          assignedTrainerId: v.assignedTrainerId || null,
          notes: lead.notes,
          createdById: user.id,
          status: "PENDING_PAYMENT", // membership/payment ships in Phase 5/6
        },
      });

      await tx.lead.update({
        where: { id: leadId },
        data: {
          status: "CONVERTED",
          convertedMemberId: member.id,
          convertedAt: new Date(),
        },
      });

      return member.id;
    });

    await audit({
      gymId: user.gymId,
      userId: user.id,
      action: "CREATE",
      entityType: "Member",
      entityId: memberId,
      metadata: { convertedFromLeadId: leadId, memberCode },
    });
    await audit({
      gymId: user.gymId,
      userId: user.id,
      action: "UPDATE",
      entityType: "Lead",
      entityId: leadId,
      oldValue: { status: lead.status },
      newValue: { status: "CONVERTED", convertedMemberId: memberId },
    });

    revalidatePath("/leads");
    revalidatePath("/members");
    return { ok: true, data: { memberId } };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function deleteLeadAndRedirect(id: string): Promise<never> {
  const result = await deleteLeadAction(id);
  if (!result.ok) throw new Error(result.error);
  redirect("/leads");
}
