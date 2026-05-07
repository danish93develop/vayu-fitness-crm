import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getLeadById } from "@/server/services/leads";
import { PageHeader } from "@/components/layout/page-header";
import { LeadForm } from "@/components/forms/lead-form";

export const metadata = { title: "Edit lead" };

export default async function EditLeadPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermission("leads:update");
  const { id } = await params;
  const [lead, plans, staff] = await Promise.all([
    getLeadById(session.user.gymId, id),
    prisma.membershipPlan.findMany({
      where: { gymId: session.user.gymId, deletedAt: null, isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true },
    }),
    prisma.user.findMany({
      where: { gymId: session.user.gymId, deletedAt: null, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  if (!lead) notFound();

  return (
    <div className="space-y-6">
      <PageHeader title={`Edit ${lead.name}`} description="Update lead details." />
      <LeadForm
        mode="edit"
        leadId={lead.id}
        plans={plans}
        staff={staff}
        defaultValues={{
          name: lead.name,
          phone: lead.phone,
          email: lead.email ?? "",
          gender: lead.gender,
          source: lead.source,
          interestedPlanId: lead.interestedPlanId ?? "",
          followUpDate: lead.followUpDate ? lead.followUpDate.toISOString().slice(0, 10) : "",
          assignedToId: lead.assignedToId ?? "",
          notes: lead.notes ?? "",
        }}
      />
    </div>
  );
}
