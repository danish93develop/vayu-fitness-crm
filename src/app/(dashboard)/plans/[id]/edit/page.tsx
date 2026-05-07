import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { getPlanById } from "@/server/services/plans";
import { PageHeader } from "@/components/layout/page-header";
import { PlanForm } from "@/components/forms/plan-form";
import { paiseToRupees } from "@/lib/money";

export const metadata = { title: "Edit plan" };

export default async function EditPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermission("plans:update");
  const { id } = await params;
  const plan = await getPlanById(session.user.gymId, id);
  if (!plan) notFound();

  return (
    <div className="space-y-6">
      <PageHeader title={`Edit ${plan.name}`} />
      <PlanForm
        mode="edit"
        planId={plan.id}
        defaultValues={{
          name: plan.name,
          type: plan.type,
          durationValue: plan.durationValue,
          durationUnit: plan.durationUnit,
          priceRupees: paiseToRupees(plan.basePricePaise),
          description: plan.description ?? "",
          allowsInstallments: plan.allowsInstallments,
          maxInstallments: plan.maxInstallments,
          isActive: plan.isActive,
          sortOrder: plan.sortOrder,
        }}
      />
    </div>
  );
}
