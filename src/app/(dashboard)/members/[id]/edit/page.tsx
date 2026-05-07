import { notFound } from "next/navigation";
import { Camera } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { getMemberById } from "@/server/services/members";
import { listActiveTrainers } from "@/server/services/trainers";
import { PageHeader } from "@/components/layout/page-header";
import { MemberForm } from "@/components/forms/member-form";
import { MemberPhotoUploader } from "@/components/forms/member-photo-uploader";
import { SettingsSection } from "@/components/forms/settings-section";

export const metadata = { title: "Edit member" };

export default async function EditMemberPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermission("members:update");
  const { id } = await params;
  const [member, trainers] = await Promise.all([
    getMemberById(session.user.gymId, id),
    listActiveTrainers(session.user.gymId),
  ]);
  if (!member) notFound();

  return (
    <div className="space-y-8">
      <PageHeader title={`Edit ${member.fullName}`} description={member.memberCode} />

      {/* Photo upload — separate from the main form because it uploads on change */}
      <SettingsSection
        number={0}
        variant="amber"
        icon={Camera}
        title="Profile photo"
        description="Optional. Used in member listings, the search dropdown, and on the member's own profile."
      >
        <MemberPhotoUploader
          memberId={member.id}
          memberName={member.fullName}
          currentUrl={member.profilePhotoUrl ?? null}
          avatarSeed={member.id}
        />
      </SettingsSection>

      <MemberForm
        mode="edit"
        memberId={member.id}
        trainers={trainers}
        defaultValues={{
          fullName: member.fullName,
          phone: member.phone,
          email: member.email ?? "",
          gender: member.gender,
          dateOfBirth: member.dateOfBirth ? member.dateOfBirth.toISOString().slice(0, 10) : "",
          address: member.address ?? "",
          emergencyName: member.emergencyName ?? "",
          emergencyPhone: member.emergencyPhone ?? "",
          joiningDate: member.joiningDate.toISOString().slice(0, 10),
          assignedTrainerId: member.assignedTrainerId ?? "",
          notes: member.notes ?? "",
        }}
      />
    </div>
  );
}
