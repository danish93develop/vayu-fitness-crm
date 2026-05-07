import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { getClassById } from "@/server/services/classes";
import { listActiveTrainers } from "@/server/services/trainers";
import { PageHeader } from "@/components/layout/page-header";
import { ClassForm } from "@/components/forms/class-form";

export const metadata = { title: "Edit class" };

function toHHMM(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default async function EditClassPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermission("classes:update");
  const { id } = await params;
  const [klass, trainers] = await Promise.all([
    getClassById(session.user.gymId, id),
    listActiveTrainers(session.user.gymId),
  ]);
  if (!klass) notFound();

  return (
    <div className="space-y-6">
      <PageHeader title={`Edit ${klass.name}`} />
      <ClassForm
        mode="edit"
        classId={klass.id}
        trainers={trainers}
        defaultValues={{
          name: klass.name,
          trainerId: klass.trainerId ?? "",
          date: klass.date.toISOString().slice(0, 10),
          startTime: toHHMM(klass.startTime),
          endTime: toHHMM(klass.endTime),
          capacity: klass.capacity,
          status: klass.status,
          notes: klass.notes ?? "",
        }}
      />
    </div>
  );
}
