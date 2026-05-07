"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { rupeesToPaise, gstAmountPaise, formatPaiseShort } from "@/lib/money";
import { addDays, startOfDay } from "@/lib/date";
import { PaymentSchema, VoidPaymentSchema, type PaymentInput, type VoidPaymentInput } from "@/lib/validations/payment";
import { RefundPaymentSchema, type RefundPaymentInput } from "@/lib/validations/refund";
import { nextInvoiceNumber } from "@/server/services/invoice-counter";
import { membershipPaidAmount } from "@/server/services/payments";
import { notifyAdmins } from "@/server/services/notifications";
import { can } from "@/lib/auth/permissions";

type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

/**
 * Generate next payment code (VF-PAY-XXXX) — counts existing payments + 1.
 * Payments are never deleted (only voided), so the running max is stable.
 */
async function nextPaymentCode(gymId: string): Promise<string> {
  const last = await prisma.payment.findFirst({
    where: { gymId, paymentCode: { startsWith: "VF-PAY-" } },
    orderBy: { paymentCode: "desc" },
    select: { paymentCode: true },
  });
  const num = last ? parseInt(last.paymentCode.slice(7), 10) + 1 : 1;
  return `VF-PAY-${String(num).padStart(4, "0")}`;
}

export async function createPaymentAction(
  values: PaymentInput,
): Promise<ActionResult<{ paymentId: string; invoiceId: string | null }>> {
  const session = await requirePermission("payments:create");
  const { user } = session;

  const parsed = PaymentSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  // Permission gate for discounts
  if (v.discountRupees > 0) {
    if (
      !can(user.role, "payments:discount:any") &&
      !can(user.role, "payments:discount:limited")
    ) {
      return { ok: false, error: "Your role can't apply discounts." };
    }
    if (!v.discountReason || v.discountReason.trim().length < 1) {
      return { ok: false, error: "Discount reason is required." };
    }
  }

  const membership = await prisma.memberMembership.findFirst({
    where: { id: v.membershipId, gymId: user.gymId, deletedAt: null },
    include: {
      member: { select: { id: true, fullName: true, phone: true, email: true, address: true } },
      plan: true,
      installments: true,
    },
  });
  if (!membership) return { ok: false, error: "Membership not found." };
  if (membership.status === "CANCELLED") {
    return { ok: false, error: "Cannot record payment on a cancelled membership." };
  }

  const gym = await prisma.gym.findUnique({ where: { id: user.gymId } });
  if (!gym) return { ok: false, error: "Gym record not found." };

  // ── Money math (paise everywhere) ─────────────────────────────────────────
  const grossPaise = rupeesToPaise(v.amountRupees);
  const discountPaise = rupeesToPaise(v.discountRupees);
  const taxablePaise = Math.max(0, grossPaise - discountPaise);
  const gstPercent = gym.defaultGstPct;
  const gstPaise = gstAmountPaise(taxablePaise, gstPercent);
  const totalPaise = taxablePaise + gstPaise;

  // ── Installment validation ─────────────────────────────────────────────
  // Per spec: only annual plans (>= 12 months) allow installments, max 2.
  if (v.asInstallment) {
    const months =
      membership.plan.durationUnit === "YEAR"
        ? membership.plan.durationValue * 12
        : membership.plan.durationUnit === "MONTH"
          ? membership.plan.durationValue
          : Math.floor(membership.plan.durationValue / 30);
    if (months < 12) {
      return { ok: false, error: "Installments are only allowed on plans of 12 months or longer." };
    }
    if (!membership.plan.allowsInstallments) {
      return { ok: false, error: "This plan doesn't allow installments." };
    }
    if (membership.installments.length > 0) {
      return { ok: false, error: "Installments already exist for this membership." };
    }
  }

  // ── Existing installment auto-detection ──────────────────────────────────
  // If there's a pending installment, this payment marks it paid.
  const pendingInstallment = membership.installments.find((i) => i.status === "PENDING");

  const paymentCode = await nextPaymentCode(user.gymId);
  const paymentDate = new Date(v.paymentDate);

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Decide payment status
      const alreadyPaid = await tx.payment
        .aggregate({
          where: { membershipId: membership.id, status: { in: ["PAID", "PARTIAL"] } },
          _sum: { totalPaise: true },
        })
        .then((r) => r._sum.totalPaise ?? 0);
      const willBePaid = alreadyPaid + totalPaise;
      const fullPriceWithGst =
        membership.finalPricePaise + gstAmountPaise(membership.finalPricePaise, gstPercent);

      // Status of THIS payment row
      const thisPaymentStatus = v.asInstallment ? "PARTIAL" : "PAID";

      // ── Create the payment ─────────────────────────────────────────────
      const payment = await tx.payment.create({
        data: {
          paymentCode,
          gymId: user.gymId,
          branchId: membership.branchId,
          memberId: membership.memberId,
          membershipId: membership.id,
          amountPaise: grossPaise,
          discountPaise,
          taxablePaise,
          gstPaise,
          totalPaise,
          gstPercent,
          mode: v.mode,
          status: thisPaymentStatus,
          reference: v.reference?.trim() || null,
          paymentDate,
          notes: v.notes?.trim() || null,
          discountReason: v.discountReason?.trim() || null,
          discountApprovedById: discountPaise > 0 ? user.id : null,
          receivedById: user.id,
        },
      });

      // ── Installments handling ─────────────────────────────────────────
      if (v.asInstallment) {
        // Create installment 1 (paid by this payment) and installment 2 (pending)
        const half = Math.round(membership.finalPricePaise / 2);
        const second = membership.finalPricePaise - half;
        await tx.paymentInstallment.create({
          data: {
            membershipId: membership.id,
            memberId: membership.memberId,
            installmentNumber: 1,
            amountPaise: half,
            dueDate: paymentDate,
            paidDate: paymentDate,
            status: "PAID",
            paymentId: payment.id,
          },
        });
        await tx.paymentInstallment.create({
          data: {
            membershipId: membership.id,
            memberId: membership.memberId,
            installmentNumber: 2,
            amountPaise: second,
            dueDate: new Date(v.secondInstallmentDueDate!),
            status: "PENDING",
          },
        });
      } else if (pendingInstallment) {
        // Auto-mark the pending installment paid
        await tx.paymentInstallment.update({
          where: { id: pendingInstallment.id },
          data: {
            status: "PAID",
            paidDate: paymentDate,
            paymentId: payment.id,
          },
        });
      }

      // ── Membership status / paymentStatus ─────────────────────────────
      let newMembershipStatus = membership.status;
      let newPaymentStatus = membership.paymentStatus;

      if (v.asInstallment) {
        newPaymentStatus = "PARTIAL";
        // Per spec: PENDING_PAYMENT until fully paid; activate on first installment
        // so the member can use the gym immediately
        if (membership.status === "PENDING_PAYMENT") {
          newMembershipStatus = "ACTIVE";
        }
      } else if (willBePaid >= fullPriceWithGst) {
        newPaymentStatus = "PAID";
        if (membership.status === "PENDING_PAYMENT") {
          newMembershipStatus = "ACTIVE";
        }
      }

      await tx.memberMembership.update({
        where: { id: membership.id },
        data: { status: newMembershipStatus, paymentStatus: newPaymentStatus },
      });
      // Mirror onto the member if needed
      if (newMembershipStatus === "ACTIVE" && membership.member) {
        await tx.member.update({
          where: { id: membership.memberId },
          data: { status: "ACTIVE" },
        });
      }

      // ── Invoice ───────────────────────────────────────────────────────
      const { invoiceNumber } = await nextInvoiceNumber(tx, user.gymId, membership.branchId);

      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          gymId: user.gymId,
          branchId: membership.branchId,
          memberId: membership.memberId,
          paymentId: payment.id,
          issueDate: paymentDate,

          memberNameSnapshot: membership.member.fullName,
          memberPhoneSnapshot: membership.member.phone,
          memberEmailSnapshot: membership.member.email,
          memberAddressSnapshot: membership.member.address,
          planNameSnapshot: membership.plan.name,
          gymNameSnapshot: gym.name,
          gymAddressSnapshot: gym.address,
          gymPhoneSnapshot: gym.phone,
          gymEmailSnapshot: gym.email,
          gymGstSnapshot: gym.gstNumber,
          termsSnapshot: gym.invoiceTerms,
          footerSnapshot: gym.invoiceFooter,

          subtotalPaise: grossPaise,
          discountPaise,
          taxablePaise,
          gstPaise,
          gstPercent,
          totalPaise,
        },
      });

      return { payment, invoice };
    });

    // ── Audits (outside the transaction; failure won't roll back the payment) ──
    await audit({
      gymId: user.gymId,
      userId: user.id,
      action: "CREATE",
      entityType: "Payment",
      entityId: result.payment.id,
      newValue: {
        paymentCode,
        membershipId: membership.id,
        totalPaise,
        mode: v.mode,
        asInstallment: v.asInstallment,
      },
    });
    if (discountPaise > 0) {
      await audit({
        gymId: user.gymId,
        userId: user.id,
        action: "DISCOUNT_APPLIED",
        entityType: "Payment",
        entityId: result.payment.id,
        metadata: { discountPaise, reason: v.discountReason },
      });
    }
    await audit({
      gymId: user.gymId,
      userId: user.id,
      action: "CREATE",
      entityType: "Invoice",
      entityId: result.invoice.id,
      newValue: { invoiceNumber: result.invoice.invoiceNumber, totalPaise },
    });

    // Notify admins of the payment so they see it in the bell
    await notifyAdmins(user.gymId, {
      type: "PAYMENT_RECEIVED",
      title: "Payment received",
      message: `${formatPaiseShort(totalPaise)} from ${membership.member.fullName}${
        v.asInstallment ? " (installment 1 of 2)" : ""
      } · ${v.mode}`,
      link: `/payments/${result.payment.id}`,
      metadata: { paymentId: result.payment.id, totalPaise },
    });

    revalidatePath("/payments");
    revalidatePath("/invoices");
    revalidatePath(`/memberships/${membership.id}`);
    revalidatePath(`/members/${membership.memberId}`);
    revalidatePath("/dashboard");

    return { ok: true, data: { paymentId: result.payment.id, invoiceId: result.invoice.id } };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function voidPaymentAction(
  paymentId: string,
  values: VoidPaymentInput,
): Promise<ActionResult> {
  const { user } = await requirePermission("payments:void");

  const parsed = VoidPaymentSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, gymId: user.gymId },
    include: { installment: true, membership: true },
  });
  if (!payment) return { ok: false, error: "Payment not found." };
  if (payment.status === "VOID") return { ok: false, error: "Payment is already void." };
  if (payment.status === "REFUNDED") return { ok: false, error: "Use refund flow instead." };

  try {
    await prisma.$transaction(async (tx) => {
      // Mark void
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: "VOID",
          voidedAt: new Date(),
          voidReason: parsed.data.reason.trim(),
        },
      });

      // If this payment closed an installment, reopen it
      if (payment.installment) {
        await tx.paymentInstallment.update({
          where: { id: payment.installment.id },
          data: { status: "PENDING", paidDate: null, paymentId: null },
        });
      }

      // Recompute membership.paymentStatus based on remaining valid payments
      if (payment.membership) {
        const remaining = await tx.payment.aggregate({
          where: {
            membershipId: payment.membership.id,
            status: { in: ["PAID", "PARTIAL"] },
          },
          _sum: { totalPaise: true },
        });
        const paid = remaining._sum.totalPaise ?? 0;
        const totalDue =
          payment.membership.finalPricePaise +
          gstAmountPaise(payment.membership.finalPricePaise, payment.gstPercent);

        let newPaymentStatus: "PAID" | "PARTIAL" | "PENDING" = "PENDING";
        if (paid >= totalDue) newPaymentStatus = "PAID";
        else if (paid > 0) newPaymentStatus = "PARTIAL";

        await tx.memberMembership.update({
          where: { id: payment.membership.id },
          data: { paymentStatus: newPaymentStatus },
        });
      }
    });

    await audit({
      gymId: user.gymId,
      userId: user.id,
      action: "PAYMENT_VOIDED",
      entityType: "Payment",
      entityId: paymentId,
      oldValue: { status: payment.status },
      newValue: { status: "VOID" },
      metadata: { reason: parsed.data.reason },
    });

    revalidatePath("/payments");
    revalidatePath(`/payments/${paymentId}`);
    if (payment.membership) {
      revalidatePath(`/memberships/${payment.membership.id}`);
      revalidatePath(`/members/${payment.memberId}`);
    }
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

// ─── Refund ────────────────────────────────────────────────────────────────
// Marks a payment as REFUNDED. Unlike void, refund implies money was returned
// to the customer. Recomputes membership.paymentStatus the same way as void.
export async function refundPaymentAction(
  paymentId: string,
  values: RefundPaymentInput,
): Promise<ActionResult> {
  const { user } = await requirePermission("payments:refund");

  const parsed = RefundPaymentSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, gymId: user.gymId },
    include: { installment: true, membership: true },
  });
  if (!payment) return { ok: false, error: "Payment not found." };
  if (payment.status === "REFUNDED")
    return { ok: false, error: "Payment is already refunded." };
  if (payment.status === "VOID")
    return { ok: false, error: "Voided payments can't be refunded." };

  try {
    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: "REFUNDED",
          notes: payment.notes
            ? `${payment.notes}\n\nRefunded: ${parsed.data.reason}`
            : `Refunded: ${parsed.data.reason}`,
        },
      });

      // Reopen any installment this payment closed
      if (payment.installment) {
        await tx.paymentInstallment.update({
          where: { id: payment.installment.id },
          data: { status: "PENDING", paidDate: null, paymentId: null },
        });
      }

      // Recompute membership.paymentStatus
      if (payment.membership) {
        const remaining = await tx.payment.aggregate({
          where: {
            membershipId: payment.membership.id,
            status: { in: ["PAID", "PARTIAL"] },
          },
          _sum: { totalPaise: true },
        });
        const paid = remaining._sum.totalPaise ?? 0;
        const totalDue =
          payment.membership.finalPricePaise +
          gstAmountPaise(payment.membership.finalPricePaise, payment.gstPercent);

        let newStatus: "PAID" | "PARTIAL" | "PENDING" = "PENDING";
        if (paid >= totalDue) newStatus = "PAID";
        else if (paid > 0) newStatus = "PARTIAL";

        await tx.memberMembership.update({
          where: { id: payment.membership.id },
          data: { paymentStatus: newStatus },
        });
      }
    });

    await audit({
      gymId: user.gymId,
      userId: user.id,
      action: "PAYMENT_REFUNDED",
      entityType: "Payment",
      entityId: paymentId,
      oldValue: { status: payment.status },
      newValue: { status: "REFUNDED" },
      metadata: { reason: parsed.data.reason, refundAmountPaise: payment.totalPaise },
    });

    revalidatePath("/payments");
    revalidatePath(`/payments/${paymentId}`);
    if (payment.membership) {
      revalidatePath(`/memberships/${payment.membership.id}`);
      revalidatePath(`/members/${payment.memberId}`);
    }
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

/** Helper for membership detail UI — what's left to pay including GST */
export async function getMembershipBalance(membershipId: string, gymId: string) {
  const m = await prisma.memberMembership.findFirst({
    where: { id: membershipId, gymId, deletedAt: null },
    include: { plan: true },
  });
  if (!m) return null;

  const gym = await prisma.gym.findUnique({ where: { id: gymId } });
  const gstPercent = gym?.defaultGstPct ?? 18;

  const gst = gstAmountPaise(m.finalPricePaise, gstPercent);
  const totalDue = m.finalPricePaise + gst;
  const paid = await membershipPaidAmount(membershipId);
  const remaining = Math.max(0, totalDue - paid);

  return { totalDue, paid, remaining, gstPercent };
}
