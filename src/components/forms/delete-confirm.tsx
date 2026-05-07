"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

type ConfirmResult = { ok: true; data?: unknown } | { ok: false; error: string };

type Props = {
  title: string;
  description: string;
  onConfirm: () => Promise<ConfirmResult>;
  /** Optional restore action — if provided, the success toast shows an "Undo" button */
  onUndo?: () => Promise<ConfirmResult>;
  triggerLabel?: string;
  successMessage?: string;
  variant?: "destructive" | "outline";
};

/**
 * Reusable delete confirmation with optional undo. When `onUndo` is provided,
 * the success toast includes an Undo action that calls it.
 */
export function DeleteConfirm({
  title,
  description,
  onConfirm,
  onUndo,
  triggerLabel = "Delete",
  successMessage = "Deleted successfully.",
  variant = "destructive",
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const result = await onConfirm();
      if (result.ok) {
        toast.success(successMessage, {
          duration: 6000,
          action: onUndo
            ? {
                label: "Undo",
                onClick: () => {
                  startTransition(async () => {
                    const r = await onUndo();
                    if (r.ok) {
                      toast.success("Restored.");
                      router.refresh();
                    } else {
                      toast.error(r.error);
                    }
                  });
                },
              }
            : undefined,
        });
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant={variant} size="sm">
          <Trash2 className="h-4 w-4" />
          {triggerLabel}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {pending ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
