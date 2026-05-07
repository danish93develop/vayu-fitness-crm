import { requirePermission } from "@/lib/auth/session";
import { PageHeader } from "@/components/layout/page-header";
import { PlanForm } from "@/components/forms/plan-form";

export const metadata = { title: "New plan" };

export default async function NewPlanPage() {
  await requirePermission("plans:create");
  return (
    <div className="space-y-6">
      <PageHeader title="Add new plan" />
      <PlanForm mode="create" />
    </div>
  );
}
