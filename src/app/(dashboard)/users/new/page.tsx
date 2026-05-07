import { requirePermission } from "@/lib/auth/session";
import { PageHeader } from "@/components/layout/page-header";
import { UserForm } from "@/components/forms/user-form";

export const metadata = { title: "Add staff" };

export default async function NewUserPage() {
  await requirePermission("users:create");
  return (
    <div className="space-y-6">
      <PageHeader
        title="Add staff account"
        description="Create a sign-in for a receptionist, manager, trainer, or another admin. They can sign in immediately with the email + password you set."
      />
      <UserForm mode="create" />
    </div>
  );
}
