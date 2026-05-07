"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Unlock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { unlockUserAction } from "@/server/actions/users";

export function UnlockUserButton({ userId }: { userId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await unlockUserAction(userId);
      if (result.ok) {
        toast.success("Account unlocked.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleClick} disabled={pending} title="Unlock account">
      {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Unlock className="h-3 w-3" />}
    </Button>
  );
}
