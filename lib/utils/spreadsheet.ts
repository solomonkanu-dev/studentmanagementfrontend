// Browser-side spreadsheet helpers backed by exceljs (replaces xlsx, which has
// unresolved high-severity advisories for prototype pollution and ReDoS on the
// read path).
//
// These helpers are intentionally narrow — write an array of rows as one sheet,
// or parse the first sheet of an uploaded workbook into a 2D string array.

import ExcelJS from "exceljs";

interface DownloadOptions {
  sheetName?: string;
  /** Column widths in characters (1:1 with the header row). */
  columnWidths?: number[];
}

/**
 * Build a single-sheet workbook from a 2D array and trigger a browser download.
 */
export async function downloadXlsx(
  filename: string,
  rows: (string | number | null | undefined)[][],
  { sheetName = "Sheet1", columnWidths }: DownloadOptions = {},
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName);

  if (columnWidths) {
    ws.columns = columnWidths.map((width) => ({ width }));
  }

  for (const row of rows) {
    ws.addRow(row.map((cell) => cell ?? ""));
  }

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Parse the first worksheet of an uploaded .xlsx buffer into a 2D array.
 * Date cells are returned as Date instances (mirrors xlsx's cellDates: true).
 * Empty rows are preserved so the caller can decide row numbering.
 */
export async function parseFirstSheet(buffer: ArrayBuffer): Promise<unknown[][]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const ws = wb.worksheets[0];
  if (!ws) return [];

  const rows: unknown[][] = [];
  ws.eachRow({ includeEmpty: true }, (row) => {
    const values = Array.isArray(row.values) ? row.values : [];
    // ExcelJS row.values is 1-indexed; slice to align with 0-index conventions.
    const cells = values.slice(1).map((cell) => {
      if (cell == null) return "";
      if (typeof cell === "object") {
        const obj = cell as unknown as Record<string, unknown>;
        // Hyperlink cells come back as { text, hyperlink }; we want the visible text.
        if ("text" in obj) return obj.text ?? "";
        // Formula results
        if ("result" in obj) return obj.result ?? "";
      }
      return cell;
    });
    rows.push(cells);
  });
  return rows;
}
