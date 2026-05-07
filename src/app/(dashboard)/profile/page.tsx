import { Mail, Shield, Calendar } from "lucide-react";
import { requireAuth } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { format } from "@/lib/date";
import { PageHeader } from "@/components/layout/page-header";
import { ProfileForm } from "@/components/forms/profile-form";

export const metadata = { title: "Your profile" };
export const dynamic = "force-dynamic";

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  MANAGER: "Manager",
  RECEPTIONIST: "Receptionist",
  ACCOUNTANT: "Accountant",
  TRAINER: "Trainer",
  MEMBER: "Member",
};

export default async function ProfilePage() {
  const session = await requireAuth();

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      phone: true,
      role: true,
      createdAt: true,
      lastLoginAt: true,
    },
  });

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Your profile"
        description="Manage your personal details and password. Email and role changes are admin-only."
      />

      {/* Account snapshot */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SnapshotCard icon={Mail} label="Email" value={user.email} />
        <SnapshotCard
          icon={Shield}
          label="Role"
          value={ROLE_LABELS[user.role] ?? user.role}
        />
        <SnapshotCard
          icon={Calendar}
          label="Last sign-in"
          value={
            user.lastLoginAt
              ? format(user.lastLoginAt, "d MMM yyyy · h:mm a")
              : "First time"
          }
        />
      </div>

      <ProfileForm
        defaultValues={{
          name: user.name,
          phone: user.phone ?? "",
        }}
      />
    </div>
  );
}

function SnapshotCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="truncate text-sm font-medium">{value}</div>
      </div>
    </div>
  );
}
