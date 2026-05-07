import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { SettingsForm } from "@/components/forms/settings-form";

export const metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await requirePermission("settings:read");
  const gym = await prisma.gym.findUnique({ where: { id: session.user.gymId } });
  if (!gym) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gym settings"
        description="Update gym branding, invoice template, GST percentage, and expiry alert thresholds."
      />
      <SettingsForm
        defaultValues={{
          name: gym.name,
          legalName: gym.legalName ?? "",
          email: gym.email ?? "",
          phone: gym.phone ?? "",
          address: gym.address ?? "",
          gstNumber: gym.gstNumber ?? "",
          invoicePrefix: gym.invoicePrefix,
          invoiceFooter: gym.invoiceFooter ?? "",
          invoiceTerms: gym.invoiceTerms ?? "",
          defaultGstPct: gym.defaultGstPct,
          expiryAlertDays: gym.expiryAlertDays,
        }}
      />
    </div>
  );
}
