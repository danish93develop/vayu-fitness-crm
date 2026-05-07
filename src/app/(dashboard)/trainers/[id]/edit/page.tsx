import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { getTrainerById } from "@/server/services/trainers";
import { PageHeader } from "@/components/layout/page-header";
import { TrainerForm } from "@/components/forms/trainer-form";

export const metadata = { title: "Edit trainer" };

export default async function EditTrainerPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermission("trainers:update");
  const { id } = await params;
  const trainer = await getTrainerById(session.user.gymId, id);
  if (!trainer) notFound();

  return (
    <div className="space-y-6">
      <PageHeader title={`Edit ${trainer.name}`} />
      <TrainerForm
        mode="edit"
        trainerId={trainer.id}
        defaultValues={{
          name: trainer.name,
          phone: trainer.phone ?? "",
          email: trainer.email ?? "",
          specialization: trainer.specialization ?? "",
          bio: trainer.bio ?? "",
          isActive: trainer.isActive,
        }}
      />
    </div>
  );
}
