import { requirePermission } from "@/lib/auth/session";
import { PageHeader } from "@/components/layout/page-header";
import { TrainerForm } from "@/components/forms/trainer-form";

export const metadata = { title: "New trainer" };

export default async function NewTrainerPage() {
  await requirePermission("trainers:create");
  return (
    <div className="space-y-6">
      <PageHeader title="Add new trainer" />
      <TrainerForm mode="create" />
    </div>
  );
}
