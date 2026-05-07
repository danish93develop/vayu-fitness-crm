import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import { formatPaiseForPdf } from "@/lib/money";
import { format } from "date-fns";

/**
 * Vector PDF version of the invoice. Renders entirely server-side via
 * @react-pdf/renderer — text stays selectable and copy-pastable, file
 * sizes are tiny, and no client bundle is shipped.
 *
 * Visual parity with the on-screen invoice is intentional but not pixel-
 * perfect: PDF layout primitives are flexbox-only, no CSS grid, and we
 * stick to the bundled Helvetica family so the file ships without an
 * embedded webfont.
 */

const COLORS = {
  ink: "#111827",
  muted: "#6B7280",
  faintMuted: "#9CA3AF",
  border: "#E5E7EB",
  softBorder: "#F3F4F6",
  brandBg: "#111827",
  brandText: "#FFFFFF",
  brandSubtle: "rgba(255,255,255,0.7)",
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 0,
    paddingBottom: 32,
    paddingHorizontal: 0,
    fontSize: 10,
    color: COLORS.ink,
    fontFamily: "Helvetica",
  },

  // ── Header bar ────────────────────────────────────────────────────────
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    backgroundColor: COLORS.brandBg,
    color: COLORS.brandText,
    paddingHorizontal: 32,
    paddingVertical: 24,
  },
  headerLeft: { flexDirection: "column", maxWidth: "60%" },
  headerRight: { flexDirection: "column", alignItems: "flex-end" },
  eyebrow: {
    fontSize: 8,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: COLORS.brandSubtle,
  },
  gymName: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: COLORS.brandText,
    marginTop: 4,
  },
  gymMetaLine: {
    fontSize: 9,
    color: COLORS.brandSubtle,
    marginTop: 2,
  },
  invoiceNumber: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: COLORS.brandText,
    marginTop: 4,
  },
  invoiceMeta: {
    fontSize: 9,
    color: COLORS.brandSubtle,
    marginTop: 4,
  },
  invoiceMetaStrong: {
    color: COLORS.brandText,
    fontFamily: "Helvetica-Bold",
  },

  // ── Bill-to / For row ─────────────────────────────────────────────────
  blockRow: {
    flexDirection: "row",
    paddingHorizontal: 32,
    paddingTop: 24,
    gap: 32,
  },
  block: { flex: 1 },
  blockLabel: {
    fontSize: 8,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: COLORS.muted,
    marginBottom: 4,
  },
  blockHeading: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: COLORS.ink,
  },
  blockMeta: {
    fontSize: 9,
    color: COLORS.muted,
    marginTop: 2,
  },

  // ── Items table ───────────────────────────────────────────────────────
  table: {
    paddingHorizontal: 32,
    marginTop: 16,
  },
  tableHead: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 6,
  },
  tableHeadCell: {
    fontSize: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: COLORS.muted,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.softBorder,
    paddingVertical: 8,
  },
  itemDescription: {
    flex: 1,
    paddingRight: 12,
  },
  itemPrimary: {
    fontFamily: "Helvetica-Bold",
    color: COLORS.ink,
  },
  itemSecondary: {
    fontSize: 8,
    color: COLORS.muted,
    marginTop: 2,
  },
  amountCell: {
    width: 110,
    textAlign: "right",
  },
  amountText: { color: COLORS.ink },
  amountMutedText: { color: COLORS.muted },

  // ── Totals ────────────────────────────────────────────────────────────
  totalsWrap: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 32,
    marginTop: 16,
  },
  totalsCol: { width: 220 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 3,
  },
  totalLabel: { color: COLORS.muted, fontSize: 10 },
  totalValue: { color: COLORS.ink, fontSize: 10 },
  totalDivider: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginVertical: 6,
  },
  grandTotalLabel: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: COLORS.ink,
  },
  grandTotalValue: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: COLORS.ink,
  },

  // ── Footer ────────────────────────────────────────────────────────────
  footer: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginHorizontal: 32,
    marginTop: 24,
    paddingTop: 16,
  },
  termsHeading: {
    fontSize: 8,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: COLORS.muted,
    marginBottom: 4,
  },
  termsBody: {
    fontSize: 8,
    color: COLORS.muted,
    lineHeight: 1.4,
  },
  centerNote: {
    marginTop: 12,
    textAlign: "center",
    fontSize: 8,
    fontStyle: "italic",
    color: COLORS.faintMuted,
  },

  // ── Page meta footer ──────────────────────────────────────────────────
  pageMeta: {
    position: "absolute",
    bottom: 14,
    left: 32,
    right: 32,
    fontSize: 7,
    color: COLORS.faintMuted,
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

export type InvoicePdfData = {
  invoiceNumber: string;
  issueDate: Date;

  // Gym snapshots
  gymNameSnapshot: string;
  gymAddressSnapshot: string | null;
  gymPhoneSnapshot: string | null;
  gymEmailSnapshot: string | null;
  gymGstSnapshot: string | null;

  // Member snapshots
  memberNameSnapshot: string;
  memberPhoneSnapshot: string | null;
  memberEmailSnapshot: string | null;
  memberAddressSnapshot: string | null;

  planNameSnapshot: string;

  // Totals (paise)
  subtotalPaise: number;
  discountPaise: number;
  taxablePaise: number;
  gstPercent: number;
  gstPaise: number;
  totalPaise: number;

  // Optional payment ref
  payment: {
    paymentCode: string;
    mode: string;
    reference: string | null;
  } | null;

  // Optional terms / footer
  termsSnapshot: string | null;
  footerSnapshot: string | null;
};

export function InvoicePdfDocument({ data }: { data: InvoicePdfData }) {
  return (
    <Document
      title={`Invoice ${data.invoiceNumber}`}
      author={data.gymNameSnapshot}
      subject={`Tax invoice for ${data.memberNameSnapshot}`}
    >
      <Page size="A4" style={styles.page}>
        {/* ── Header ────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.eyebrow}>Tax Invoice</Text>
            <Text style={styles.gymName}>{data.gymNameSnapshot}</Text>
            {data.gymAddressSnapshot && (
              <Text style={styles.gymMetaLine}>{data.gymAddressSnapshot}</Text>
            )}
            {data.gymPhoneSnapshot && (
              <Text style={styles.gymMetaLine}>{data.gymPhoneSnapshot}</Text>
            )}
            {data.gymEmailSnapshot && (
              <Text style={styles.gymMetaLine}>{data.gymEmailSnapshot}</Text>
            )}
            {data.gymGstSnapshot && (
              <Text style={styles.gymMetaLine}>GSTIN: {data.gymGstSnapshot}</Text>
            )}
          </View>

          <View style={styles.headerRight}>
            <Text style={styles.eyebrow}>Invoice</Text>
            <Text style={styles.invoiceNumber}>{data.invoiceNumber}</Text>
            <Text style={styles.invoiceMeta}>
              Date:{" "}
              <Text style={styles.invoiceMetaStrong}>
                {format(data.issueDate, "d MMM yyyy")}
              </Text>
            </Text>
            {data.payment?.paymentCode && (
              <Text style={styles.invoiceMeta}>
                Payment:{" "}
                <Text style={styles.invoiceMetaStrong}>
                  {data.payment.paymentCode}
                </Text>
              </Text>
            )}
          </View>
        </View>

        {/* ── Bill-to + For ─────────────────────────────────────────── */}
        <View style={styles.blockRow}>
          <View style={styles.block}>
            <Text style={styles.blockLabel}>Bill to</Text>
            <Text style={styles.blockHeading}>{data.memberNameSnapshot}</Text>
            {data.memberPhoneSnapshot && (
              <Text style={styles.blockMeta}>{data.memberPhoneSnapshot}</Text>
            )}
            {data.memberEmailSnapshot && (
              <Text style={styles.blockMeta}>{data.memberEmailSnapshot}</Text>
            )}
            {data.memberAddressSnapshot && (
              <Text style={styles.blockMeta}>{data.memberAddressSnapshot}</Text>
            )}
          </View>
          <View style={styles.block}>
            <Text style={styles.blockLabel}>For</Text>
            <Text style={styles.blockHeading}>{data.planNameSnapshot}</Text>
            {data.payment?.mode && (
              <Text style={styles.blockMeta}>
                Paid via {data.payment.mode.replace(/_/g, " ")}
                {data.payment.reference ? ` • ref ${data.payment.reference}` : ""}
              </Text>
            )}
          </View>
        </View>

        {/* ── Items ─────────────────────────────────────────────────── */}
        <View style={styles.table}>
          <View style={styles.tableHead}>
            <Text style={[styles.tableHeadCell, styles.itemDescription]}>
              Description
            </Text>
            <Text style={[styles.tableHeadCell, styles.amountCell]}>Amount</Text>
          </View>
          <View style={styles.tableRow}>
            <View style={styles.itemDescription}>
              <Text style={styles.itemPrimary}>{data.planNameSnapshot}</Text>
              <Text style={styles.itemSecondary}>Membership fee</Text>
            </View>
            <Text style={[styles.amountCell, styles.amountText]}>
              {formatPaiseForPdf(data.subtotalPaise)}
            </Text>
          </View>
          {data.discountPaise > 0 && (
            <View style={styles.tableRow}>
              <View style={styles.itemDescription}>
                <Text style={styles.amountMutedText}>Discount applied</Text>
              </View>
              <Text style={[styles.amountCell, styles.amountMutedText]}>
                - {formatPaiseForPdf(data.discountPaise)}
              </Text>
            </View>
          )}
        </View>

        {/* ── Totals ─────────────────────────────────────────────────── */}
        <View style={styles.totalsWrap}>
          <View style={styles.totalsCol}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>
                {formatPaiseForPdf(data.subtotalPaise)}
              </Text>
            </View>
            {data.discountPaise > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Discount</Text>
                <Text style={styles.totalValue}>
                  - {formatPaiseForPdf(data.discountPaise)}
                </Text>
              </View>
            )}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Taxable</Text>
              <Text style={styles.totalValue}>
                {formatPaiseForPdf(data.taxablePaise)}
              </Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>GST ({data.gstPercent}%)</Text>
              <Text style={styles.totalValue}>
                + {formatPaiseForPdf(data.gstPaise)}
              </Text>
            </View>
            <View style={styles.totalDivider} />
            <View style={styles.totalRow}>
              <Text style={styles.grandTotalLabel}>Total</Text>
              <Text style={styles.grandTotalValue}>
                {formatPaiseForPdf(data.totalPaise)}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Footer ─────────────────────────────────────────────────── */}
        {(data.termsSnapshot || data.footerSnapshot) && (
          <View style={styles.footer}>
            {data.termsSnapshot && (
              <View>
                <Text style={styles.termsHeading}>Terms</Text>
                <Text style={styles.termsBody}>{data.termsSnapshot}</Text>
              </View>
            )}
            {data.footerSnapshot && (
              <Text style={styles.centerNote}>{data.footerSnapshot}</Text>
            )}
          </View>
        )}

        {/* ── Page meta ──────────────────────────────────────────────── */}
        <View style={styles.pageMeta} fixed>
          <Text>
            {data.gymNameSnapshot} • Invoice {data.invoiceNumber}
          </Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
