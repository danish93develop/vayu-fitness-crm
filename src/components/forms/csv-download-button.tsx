"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { rowsToCsv, downloadCsv } from "@/lib/csv";

type Props = {
  filename: string;
  headers: string[];
  rows: (string | number | null | undefined)[][];
  disabled?: boolean;
};

export function CsvDownloadButton({ filename, headers, rows, disabled }: Props) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => downloadCsv(filename, rowsToCsv(headers, rows))}
      disabled={disabled || rows.length === 0}
    >
      <Download className="h-4 w-4" /> Download CSV
    </Button>
  );
}
