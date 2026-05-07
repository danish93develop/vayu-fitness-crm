import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { getUserById } from "@/server/services/users";
import { PageHeader } from "@/components/layout/page-header";
import { UserForm } from "@/components/forms/user-form";

export const metadata = { title: "Edit staff" };

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermission("users:update");
  const { id } = await params;
  const user = await getUserById(session.user.gymId, id);
  if (!user) notFound();

  const isSelf = session.user.id === user.id;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit ${user.name}`}
        description={isSelf ? "Editing your own account — role and active status are locked." : user.email}
      />
      <UserForm
        mode="edit"
        userId={user.id}
        isSelf={isSelf}
        defaultValues={{
          name: user.name,
          email: user.email,
          phone: user.phone ?? "",
          role: user.role,
          isActive: user.isActive,
          password: "",
        }}
      />
    </div>
  );
}
