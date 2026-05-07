/**
 * Tiny CSV parser. Handles quoted cells, commas inside quotes, escaped
 * double-quotes (""), and CRLF line endings. No npm dep.
 */

export type CsvRow = Record<string, string>;

export function parseCsv(text: string): { headers: string[]; rows: CsvRow[] } {
  // Strip BOM if present
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  const cells: string[][] = [[]];
  let cur = "";
  let inQuotes = false;
  let row = 0;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cur += '"';
          i++; // skip second quote
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        cells[row]!.push(cur);
        cur = "";
      } else if (ch === "\n" || ch === "\r") {
        cells[row]!.push(cur);
        cur = "";
        if (ch === "\r" && text[i + 1] === "\n") i++; // CRLF
        // Skip empty trailing rows
        if (cells[row]!.length > 0) {
          row++;
          cells.push([]);
        }
      } else {
        cur += ch;
      }
    }
  }
  // Final cell / row
  if (cur.length > 0 || cells[row]!.length > 0) {
    cells[row]!.push(cur);
  }
  // Drop trailing empty rows
  while (cells.length > 0 && cells[cells.length - 1]!.length <= 1 && (cells[cells.length - 1]?.[0] ?? "").trim() === "") {
    cells.pop();
  }

  if (cells.length === 0) return { headers: [], rows: [] };

  const headers = cells[0]!.map((h) => h.trim().toLowerCase());
  const rows: CsvRow[] = [];
  for (let r = 1; r < cells.length; r++) {
    const obj: CsvRow = {};
    for (let c = 0; c < headers.length; c++) {
      obj[headers[c]!] = (cells[r]?.[c] ?? "").trim();
    }
    rows.push(obj);
  }
  return { headers, rows };
}
