import { notFound } from "next/navigation";
import Link from "next/link";
import { Edit, Phone, Mail, User, Calendar, MessageSquareText, Package, ArrowRight } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { getLeadById } from "@/server/services/leads";
import { listActiveTrainers } from "@/server/services/trainers";
import { deleteLeadAction } from "@/server/actions/leads";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { EmptyState } from "@/components/dashboard/empty-state";
import { DeleteConfirm } from "@/components/forms/delete-confirm";
import { FollowUpForm } from "@/components/forms/follow-up-form";
import { LeadStatusChanger } from "@/components/forms/lead-status-changer";
import { ConvertLeadForm } from "@/components/forms/convert-lead-form";
import { formatDate, relativeTime } from "@/lib/date";

export const metadata = { title: "Lead" };
export const dynamic = "force-dynamic";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermission("leads:read");
  const { id } = await params;
  const lead = await getLeadById(session.user.gymId, id);
  if (!lead) notFound();

  const trainers = await listActiveTrainers(session.user.gymId);

  const canEdit = can(session.user.role, "leads:update");
  const canDelete = can(session.user.role, "leads:delete");
  const canConvert = can(session.user.role, "leads:convert");
  const isConverted = lead.status === "CONVERTED";

  const deleteAction = async () => {
    "use server";
    return deleteLeadAction(lead.id);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={lead.name}
        description={
          <span className="flex items-center gap-2">
            <StatusBadge status={lead.status} />
            <span className="text-xs">added {relativeTime(lead.createdAt)}</span>
          </span>
        }
        actions={
          <>
            {canEdit && !isConverted && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/leads/${lead.id}/edit` as never}>
                  <Edit className="h-4 w-4" /> Edit
                </Link>
              </Button>
            )}
            {canConvert && !isConverted && (
              <ConvertLeadForm leadId={lead.id} trainers={trainers} />
            )}
            {canDelete && (
              <DeleteConfirm
                title={`Delete ${lead.name}?`}
                description="This soft-deletes the lead. Follow-up history is preserved for audit."
                onConfirm={deleteAction}
              />
            )}
          </>
        }
      />

      {isConverted && lead.convertedMember && (
        <div className="flex items-center justify-between rounded-md border border-accent/30 bg-accent/10 px-4 py-3 text-sm">
          <div>
            ✓ This lead was converted to a member on {formatDate(lead.convertedAt!)}.
          </div>
          <Link
            href={`/members/${lead.convertedMember.id}` as never}
            className="flex items-center gap-1 text-sm font-medium text-accent hover:underline"
          >
            View member profile <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Contact card */}
        <Card>
          <CardHeader>
            <CardTitle>Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row icon={Phone} label="Phone" value={lead.phone} />
            <Row icon={Mail} label="Email" value={lead.email} />
            <Row
              icon={User}
              label="Gender"
              value={lead.gender === "UNSPECIFIED" ? null : titleCase(lead.gender)}
            />
            <Row icon={Package} label="Interested in" value={lead.interestedPlan?.name} />
            <Row icon={User} label="Source" value={titleCase(lead.source)} />
            <Row icon={User} label="Assigned to" value={lead.assignedTo?.name} />
            <Row
              icon={Calendar}
              label="Next follow-up"
              value={lead.followUpDate ? formatDate(lead.followUpDate) : null}
            />
          </CardContent>
        </Card>

        {/* Status changer */}
        <Card>
          <CardHeader>
            <CardTitle>Stage</CardTitle>
          </CardHeader>
          <CardContent>
            {isConverted ? (
              <p className="text-sm text-muted-foreground">
                This lead has been converted to a member.
              </p>
            ) : (
              <>
                <p className="mb-3 text-xs text-muted-foreground">
                  Update the lead&apos;s funnel stage. Status changes are audited.
                </p>
                <LeadStatusChanger leadId={lead.id} current={lead.status} disabled={!canEdit} />
              </>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        {lead.notes && (
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{lead.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Follow-ups timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Follow-ups</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isConverted && canEdit && <FollowUpForm leadId={lead.id} />}

          {lead.followUps.length === 0 ? (
            <EmptyState
              icon={MessageSquareText}
              message="No follow-ups yet. Add the first one above."
            />
          ) : (
            <ul className="space-y-3">
              {lead.followUps.map((f) => (
                <li
                  key={f.id}
                  className="rounded-md border border-border bg-muted/30 p-3"
                >
                  <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{f.user?.name ?? "System"}</span>
                    <span>{relativeTime(f.createdAt)}</span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm">{f.note}</p>
                  {f.nextFollowUpDate && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Next follow-up: {formatDate(f.nextFollowUpDate)}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Phone;
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="truncate">{value || <span className="text-muted-foreground">—</span>}</div>
      </div>
    </div>
  );
}

function titleCase(s: string) {
  return s.toLowerCase().split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}
