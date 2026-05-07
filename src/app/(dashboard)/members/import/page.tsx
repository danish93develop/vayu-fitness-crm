import { requirePermission } from "@/lib/auth/session";
import { PageHeader } from "@/components/layout/page-header";
import { MemberImportForm } from "@/components/forms/member-import-form";

export const metadata = { title: "Import members" };

export default async function ImportMembersPage() {
  await requirePermission("members:create");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Import members"
        description="Bulk-create members from a CSV file. Useful when onboarding a new gym with an existing roster, or migrating from another system."
      />
      <MemberImportForm />
    </div>
  );
}
