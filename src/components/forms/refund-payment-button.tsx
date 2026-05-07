"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw } from "lucide-react";
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
import { refundPaymentAction } from "@/server/actions/payments";

export function RefundPaymentButton({
  paymentId,
  paymentAmount,
}: {
  paymentId: string;
  paymentAmount: string;
}) {
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
      const result = await refundPaymentAction(paymentId, { reason: reason.trim() });
      if (result.ok) {
        toast.success("Payment refunded.");
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
          <RotateCcw className="h-4 w-4" /> Refund
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Refund {paymentAmount}?</AlertDialogTitle>
          <AlertDialogDescription>
            Marking this payment as refunded reopens any installment it closed and rolls back
            the membership&apos;s payment status. The actual money return must be processed
            separately (cash, UPI reverse, bank transfer). This action is logged.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <label className="text-sm font-medium">Reason *</label>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Member relocated, double-charge, dispute…"
            disabled={pending}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={pending || !reason.trim()}
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Refund payment
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
