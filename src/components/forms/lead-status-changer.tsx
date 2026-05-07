"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { changeLeadStatusAction } from "@/server/actions/leads";
import type { LeadStatus } from "@prisma/client";

const OPTIONS: { value: Exclude<LeadStatus, "CONVERTED">; label: string }[] = [
  { value: "NEW", label: "New" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "TRIAL_BOOKED", label: "Trial booked" },
  { value: "TRIAL_COMPLETED", label: "Trial completed" },
  { value: "LOST", label: "Lost" },
];

export function LeadStatusChanger({
  leadId,
  current,
  disabled,
}: {
  leadId: string;
  current: LeadStatus;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (current === "CONVERTED") {
    return null;
  }

  function handleChange(value: string) {
    startTransition(async () => {
      const result = await changeLeadStatusAction(leadId, {
        status: value as Exclude<LeadStatus, "CONVERTED">,
      });
      if (result.ok) {
        toast.success("Status updated.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Select value={current} onValueChange={handleChange} disabled={disabled || pending}>
      <SelectTrigger className="w-44">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {OPTIONS.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
