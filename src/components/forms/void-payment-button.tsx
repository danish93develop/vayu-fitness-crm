"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { XOctagon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { voidPaymentAction } from "@/server/actions/payments";

export function VoidPaymentButton({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    if (!reason.trim()) {
      toast.error("Please enter a reason.");
      return;
    }
    startTransition(async () => {
      const result = await voidPaymentAction(paymentId, { reason: reason.trim() });
      if (result.ok) {
        toast.success("Payment voided.");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm">
          <XOctagon className="h-4 w-4" /> Void
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Void this payment?</AlertDialogTitle>
          <AlertDialogDescription>
            Voiding marks the payment as VOID and re-opens any installment it closed. The
            invoice stays for audit but no longer counts toward revenue. This is reversible
            only by recording a new payment — payments are never deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <label className="text-sm font-medium">Reason *</label>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Bounced cheque, duplicate entry, refund initiated, etc."
            disabled={pending}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Keep payment</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={pending || !reason.trim()}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Void payment
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
