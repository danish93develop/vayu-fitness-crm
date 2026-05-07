import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { auth } from "@/auth";
import { can } from "@/lib/auth/permissions";
import { getInvoiceById } from "@/server/services/invoices";
import { audit } from "@/lib/audit";
import { InvoicePdfDocument } from "@/server/pdf/invoice-document";

/**
 * Streams a real (vector) PDF for the given invoice. The renderer runs on
 * the server, so the file size is small, the text is selectable, and no
 * client-side PDF libraries ship in the browser bundle.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const session = await auth();
  const user = session?.user;
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  if (!can(user.role, "invoices:read")) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const inv = await getInvoiceById(user.gymId, id);
  if (!inv) return new NextResponse("Not found", { status: 404 });

  const buffer = await renderToBuffer(
    <InvoicePdfDocument
      data={{
        invoiceNumber: inv.invoiceNumber,
        issueDate: inv.issueDate,
        gymNameSnapshot: inv.gymNameSnapshot,
        gymAddressSnapshot: inv.gymAddressSnapshot,
        gymPhoneSnapshot: inv.gymPhoneSnapshot,
        gymEmailSnapshot: inv.gymEmailSnapshot,
        gymGstSnapshot: inv.gymGstSnapshot,
        memberNameSnapshot: inv.memberNameSnapshot,
        memberPhoneSnapshot: inv.memberPhoneSnapshot,
        memberEmailSnapshot: inv.memberEmailSnapshot,
        memberAddressSnapshot: inv.memberAddressSnapshot,
        planNameSnapshot: inv.planNameSnapshot,
        subtotalPaise: inv.subtotalPaise,
        discountPaise: inv.discountPaise,
        taxablePaise: inv.taxablePaise,
        gstPercent: inv.gstPercent,
        gstPaise: inv.gstPaise,
        totalPaise: inv.totalPaise,
        payment: inv.payment
          ? {
              paymentCode: inv.payment.paymentCode,
              mode: inv.payment.mode,
              reference: inv.payment.reference,
            }
          : null,
        termsSnapshot: inv.termsSnapshot,
        footerSnapshot: inv.footerSnapshot,
      }}
    />,
  );

  // Audit the export — invoices are sensitive financial documents
  await audit({
    gymId: user.gymId,
    userId: user.id,
    action: "EXPORT",
    entityType: "Invoice",
    entityId: inv.id,
    metadata: { format: "pdf", invoiceNumber: inv.invoiceNumber },
  });

  return new NextResponse(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${inv.invoiceNumber}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
