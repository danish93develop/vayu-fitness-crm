import { requirePermission } from "@/lib/auth/session";
import { listActiveTrainers } from "@/server/services/trainers";
import { PageHeader } from "@/components/layout/page-header";
import { MemberForm } from "@/components/forms/member-form";

export const metadata = { title: "New member" };

export default async function NewMemberPage() {
  const session = await requirePermission("members:create");
  const trainers = await listActiveTrainers(session.user.gymId);

  return (
    <div className="space-y-6">
      <PageHeader title="Add new member" description="Create a member record. Memberships and payments are added separately." />
      <MemberForm mode="create" trainers={trainers} />
    </div>
  );
}
