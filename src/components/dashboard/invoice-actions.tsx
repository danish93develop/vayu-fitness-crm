"use client";

import { useState } from "react";
import { Printer, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type Props = {
  invoiceId: string;
  invoiceNumber: string;
};

/**
 * Two-button toolbar for the invoice page:
 *   • Print → opens the browser's print dialog (the page already has print CSS)
 *   • Download PDF → fetches a server-rendered vector PDF from
 *     /api/invoices/{id}/pdf. Vector text means the PDF stays searchable,
 *     copy-pastable, and ~30× smaller than the old html2canvas raster.
 */
export function InvoiceActions({ invoiceId, invoiceNumber }: Props) {
  const [downloading, setDownloading] = useState(false);

  function handlePrint() {
    window.print();
  }

  async function handleDownload() {
    setDownloading(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/pdf`, {
        // Cookies → session is required by the route handler
        credentials: "same-origin",
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(body || `Server returned ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      toast.success("Invoice downloaded.");
    } catch (err) {
      toast.error(
        `Could not generate PDF: ${(err as Error).message ?? "unknown error"}`,
      );
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={handlePrint} disabled={downloading}>
        <Printer className="h-4 w-4" /> Print
      </Button>
      <Button size="sm" onClick={handleDownload} disabled={downloading}>
        {downloading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating…
          </>
        ) : (
          <>
            <Download className="h-4 w-4" />
            Download PDF
          </>
        )}
      </Button>
    </div>
  );
}
