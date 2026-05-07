"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { importMembersAction } from "@/server/actions/member-import";
import { downloadCsv, rowsToCsv } from "@/lib/csv";

const SAMPLE_HEADERS = [
  "Full Name",
  "Phone",
  "Email",
  "Gender",
  "Date of Birth",
  "Address",
  "Emergency Name",
  "Emergency Phone",
  "Joining Date",
  "Notes",
];

const SAMPLE_ROWS = [
  ["Aarav Mehta", "+91 9810000001", "aarav@example.com", "Male", "1990-05-15", "Block A, Delhi", "Priya Mehta", "+91 9810000002", "2026-05-01", "Prefers morning slots"],
  ["Isha Kapoor", "+91 9820000001", "isha@example.com", "Female", "1992-08-20", "Lajpat Nagar, Delhi", "", "", "2026-05-01", ""],
];

type Result = Awaited<ReturnType<typeof importMembersAction>>;

export function MemberImportForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [filename, setFilename] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFilename(file.name);

    startTransition(async () => {
      const text = await file.text();
      const r = await importMembersAction(text);
      setResult(r);
      if (r.ok) {
        if (r.created > 0) toast.success(`Imported ${r.created} member${r.created === 1 ? "" : "s"}.`);
        if (r.skipped.length > 0)
          toast.warning(`${r.skipped.length} row${r.skipped.length === 1 ? "" : "s"} skipped.`);
        router.refresh();
      } else {
        toast.error(r.error);
      }
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  function downloadSample() {
    downloadCsv("vayu-members-template", rowsToCsv(SAMPLE_HEADERS, SAMPLE_ROWS));
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold">Upload CSV</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Required columns: <strong>Full Name</strong>, <strong>Phone</strong>. Optional:
              email, gender, date of birth, address, emergency name, emergency phone, joining
              date, notes. Max 500 rows per import.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={downloadSample}>
            <Download className="h-3.5 w-3.5" /> Sample
          </Button>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileChange}
          className="hidden"
          disabled={pending}
        />
        <Button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={pending}
          className="w-full"
        >
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Importing…
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" /> Choose CSV file
            </>
          )}
        </Button>
        {filename && !pending && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <FileText className="h-3 w-3" /> {filename}
          </p>
        )}
      </div>

      {/* Result panel */}
      {result?.ok && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <ResultStat
              label="Created"
              value={result.created}
              tone="success"
              icon={CheckCircle2}
            />
            <ResultStat
              label="Skipped"
              value={result.skipped.length}
              tone={result.skipped.length > 0 ? "warn" : "muted"}
              icon={AlertTriangle}
            />
          </div>

          {result.skipped.length > 0 && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
              <h4 className="mb-2 text-sm font-semibold">Skipped rows</h4>
              <ul className="space-y-1 text-xs">
                {result.skipped.map((s) => (
                  <li key={s.row} className="flex items-start gap-2">
                    <span className="font-mono text-muted-foreground">Row {s.row}:</span>
                    <span className="text-amber-800 dark:text-amber-200">{s.reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ResultStat({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: number;
  tone: "success" | "warn" | "muted";
  icon: typeof CheckCircle2;
}) {
  const cls = {
    success:
      "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300",
    warn:
      "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300",
    muted: "border-border bg-muted/30 text-muted-foreground",
  }[tone];
  return (
    <div className={`flex items-center gap-3 rounded-xl border p-4 ${cls}`}>
      <Icon className="h-5 w-5 shrink-0" />
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-wider">{label}</div>
        <div className="text-2xl font-bold tabular-nums">{value}</div>
      </div>
    </div>
  );
}
