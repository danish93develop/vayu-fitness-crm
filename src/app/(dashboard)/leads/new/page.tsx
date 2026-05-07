import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { LeadForm } from "@/components/forms/lead-form";

export const metadata = { title: "New lead" };

export default async function NewLeadPage() {
  const session = await requirePermission("leads:create");
  const [plans, staff] = await Promise.all([
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

  return (
    <div className="space-y-6">
      <PageHeader title="Add new lead" description="Capture an enquiry. Follow-ups can be added from the lead's detail page." />
      <LeadForm mode="create" plans={plans} staff={staff} />
    </div>
  );
}
