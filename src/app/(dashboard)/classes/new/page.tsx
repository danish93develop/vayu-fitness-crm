import { requirePermission } from "@/lib/auth/session";
import { listActiveTrainers } from "@/server/services/trainers";
import { PageHeader } from "@/components/layout/page-header";
import { ClassForm } from "@/components/forms/class-form";

export const metadata = { title: "Schedule class" };

export default async function NewClassPage() {
  const session = await requirePermission("classes:create");
  const trainers = await listActiveTrainers(session.user.gymId);

  return (
    <div className="space-y-6">
      <PageHeader title="Schedule class" />
      <ClassForm mode="create" trainers={trainers} />
    </div>
  );
}
