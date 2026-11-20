/** Minimal RFC 4180 CSV reader/writer. Accepts "," or ";" (auto-detected from the header line) and strips a UTF-8 BOM. */

export function detectDelimiter(text: string): "," | ";" {
  const first = text.replace(/^﻿/, "").split(/\r?\n/, 1)[0] ?? "";
  let inQ = false, c = 0, s = 0;
  for (const ch of first) {
    if (ch === '"') inQ = !inQ;
    else if (!inQ && ch === ",") c++;
    else if (!inQ && ch === ";") s++;
  }
  return s > c ? ";" : ",";
}

export function parseCsv(text: string): { delimiter: "," | ";"; rows: string[][] } {
  const src = text.replace(/^﻿/, "");
  const delimiter = detectDelimiter(src);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQ = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]!;
    if (inQ) {
      if (ch === '"') {
        if (src[i + 1] === '"') { cell += '"'; i++; } else inQ = false;
      } else cell += ch;
      continue;
    }
    if (ch === '"') inQ = true;
    else if (ch === delimiter) { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      rows.push(row); row = [];
    } else cell += ch;
  }
  if (inQ) throw new Error("CSV: kapanmamış tırnak işareti.");
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return { delimiter, rows: rows.filter((r) => r.some((c) => c.trim() !== "")) };
}

export function toCsv(rows: (string | number | null | undefined)[][], delimiter: "," | ";" = ";", bom = true): string {
  const esc = (v: string | number | null | undefined) => {
    let s = v === null || v === undefined ? "" : String(v);
    // Neutralise spreadsheet formula injection.
    if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+([.,]\d+)?$/.test(s)) s = `'${s}`;
    return /["\r\n]/.test(s) || s.includes(delimiter) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return (bom ? "﻿" : "") + rows.map((r) => r.map(esc).join(delimiter)).join("\r\n") + "\r\n";
}
