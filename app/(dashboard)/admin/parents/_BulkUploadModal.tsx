"use client";

import { useState, useRef, useMemo } from "react";
import { downloadXlsx, parseFirstSheet } from "@/lib/utils/spreadsheet";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { adminParentApi } from "@/lib/api/parent";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Table, TableHead, TableBody, Th, Td } from "@/components/ui/Table";
import { errMsg } from "@/lib/utils/errMsg";
import {
  Download, Upload, FileSpreadsheet, CheckCircle2,
  XCircle, AlertCircle, Users, ChevronDown, ChevronUp,
  RotateCcw,
} from "lucide-react";
import type { BulkStudentResult, BulkParentImportResponse } from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ParsedRow {
  rowNum: number;
  fullName: string;
  email: string;
  phoneNumber: string;
  linkedStudentEmails: string;
}

type RowStatus = "ready" | "invalid" | "duplicate";

// ─── Template ─────────────────────────────────────────────────────────────────

const TEMPLATE_HEADERS = [
  "Full Name*",
  "Email*",
  "Phone Number",
  "Linked Student Emails (comma-separated)",
];

const TEMPLATE_EXAMPLE = [
  "Mary Smith",
  "mary.smith@email.com",
  "+232 76 000000",
  "jane.doe@school.edu, john.doe@school.edu",
];

function downloadTemplate() {
  return downloadXlsx(
    "parent_import_template.xlsx",
    [TEMPLATE_HEADERS, TEMPLATE_EXAMPLE],
    { sheetName: "Parents", columnWidths: [24, 30, 22, 46] },
  );
}

// ─── Excel parser ─────────────────────────────────────────────────────────────

async function parseWorkbook(buffer: ArrayBuffer): Promise<ParsedRow[]> {
  const rows = await parseFirstSheet(buffer);

  const data = rows.slice(1).filter((r) => (r as unknown[]).some((cell) => String(cell).trim()));

  return data.map((r, i) => {
    const c = (idx: number) => String((r as unknown[])[idx] ?? "").trim();
    return {
      rowNum: i + 2,
      fullName: c(0),
      email: c(1).toLowerCase(),
      phoneNumber: c(2),
      linkedStudentEmails: c(3),
    };
  });
}

// ─── Credential download ──────────────────────────────────────────────────────

function downloadCredentials(added: BulkStudentResult[]) {
  return downloadXlsx(
    "parent_credentials.xlsx",
    [
      ["Full Name", "Email", "Temporary Password"],
      ...added.map((s) => [s.fullName, s.email, s.tempPassword ?? ""]),
    ],
    { sheetName: "Credentials", columnWidths: [28, 32, 22] },
  );
}

// ─── Step indicators ──────────────────────────────────────────────────────────

function StepDot({ n, label, active, done }: { n: number; label: string; active: boolean; done: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={[
          "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors",
          done ? "bg-meta-3 text-white" : active ? "bg-primary text-white" : "bg-stroke text-body dark:bg-strokedark",
        ].join(" ")}
      >
        {done ? <CheckCircle2 className="h-4 w-4" /> : n}
      </div>
      <span className={["text-[11px]", active || done ? "text-black dark:text-white" : "text-body"].join(" ")}>
        {label}
      </span>
    </div>
  );
}

function StepBar({ step }: { step: "upload" | "preview" | "results" }) {
  const steps = [
    { n: 1, label: "Upload", key: "upload" },
    { n: 2, label: "Preview", key: "preview" },
    { n: 3, label: "Results", key: "results" },
  ] as const;
  const idx = steps.findIndex((s) => s.key === step);
  return (
    <div className="flex items-start justify-center gap-6 pb-4">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center gap-2">
          <StepDot n={s.n} label={s.label} active={s.key === step} done={i < idx} />
          {i < steps.length - 1 && (
            <div className={["mt-[-10px] h-px w-8", i < idx ? "bg-meta-3" : "bg-stroke dark:bg-strokedark"].join(" ")} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Step 1: Upload ───────────────────────────────────────────────────────────

function UploadStep({ onParsed }: { onParsed: (rows: ParsedRow[]) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [parseError, setParseError] = useState("");
  const [dragging, setDragging] = useState(false);

  const handleFile = (file: File) => {
    setParseError("");
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const rows = await parseWorkbook(e.target!.result as ArrayBuffer);
        if (rows.length === 0) {
          setParseError("No data rows found. Make sure you have at least one parent row below the header.");
          return;
        }
        if (rows.length > 1000) {
          setParseError(`File contains ${rows.length} rows. Maximum is 1,000 parents per import.`);
          return;
        }
        onParsed(rows);
      } catch {
        setParseError("Could not read the file. Make sure it is a valid .xlsx or .xls file.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="space-y-5">
      <div className="rounded-md border border-stroke bg-meta-2/50 p-4 dark:border-strokedark dark:bg-meta-4/20">
        <p className="mb-2 text-sm font-medium text-black dark:text-white">Step 1: Download the template</p>
        <p className="mb-3 text-xs text-body">
          Fill in parent details. Fields marked <span className="font-semibold text-meta-1">*</span> are required.
          For linked students, enter their email addresses separated by commas.
          Temporary passwords will be auto-generated for each parent.
        </p>
        <button
          type="button"
          onClick={downloadTemplate}
          className="flex items-center gap-2 rounded border border-primary px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/5 transition-colors"
        >
          <Download className="h-3.5 w-3.5" />
          Download Template (.xlsx)
        </button>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-black dark:text-white">Step 2: Upload your filled template</p>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          className={[
            "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-md border-2 border-dashed px-6 py-10 transition-colors",
            dragging
              ? "border-primary bg-primary/5"
              : "border-stroke hover:border-primary hover:bg-primary/5 dark:border-strokedark dark:hover:border-primary",
          ].join(" ")}
        >
          <FileSpreadsheet className={["h-10 w-10", dragging ? "text-primary" : "text-body"].join(" ")} />
          <div className="text-center">
            <p className="text-sm font-medium text-black dark:text-white">
              Drop your Excel file here, or <span className="text-primary">click to browse</span>
            </p>
            <p className="mt-0.5 text-xs text-body">Supports .xlsx and .xls — up to 1,000 parents</p>
          </div>
        </div>
        <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={onInputChange} />
      </div>

      {parseError && (
        <div className="flex items-start gap-2 rounded-md bg-meta-1/10 px-3 py-2.5">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-meta-1" />
          <p className="text-xs text-meta-1">{parseError}</p>
        </div>
      )}
    </div>
  );
}

// ─── Step 2: Preview ──────────────────────────────────────────────────────────

function PreviewStep({
  rows,
  onBack,
  onSubmit,
  isPending,
}: {
  rows: ParsedRow[];
  onBack: () => void;
  onSubmit: () => void;
  isPending: boolean;
}) {
  const statuses: RowStatus[] = useMemo(() => {
    const emailCount = new Map<string, number>();
    for (const r of rows) {
      if (r.email) emailCount.set(r.email, (emailCount.get(r.email) ?? 0) + 1);
    }
    const seenOnce = new Set<string>();
    return rows.map((r) => {
      if (!r.fullName || !r.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email)) return "invalid";
      if ((emailCount.get(r.email) ?? 0) > 1 && seenOnce.has(r.email)) return "duplicate";
      seenOnce.add(r.email);
      return "ready";
    });
  }, [rows]);

  const counts = useMemo(() => ({
    ready: statuses.filter((s) => s === "ready").length,
    invalid: statuses.filter((s) => s === "invalid").length,
    duplicate: statuses.filter((s) => s === "duplicate").length,
  }), [statuses]);

  const statusBadge = (s: RowStatus) => {
    if (s === "ready") return <Badge variant="success">Ready</Badge>;
    if (s === "invalid") return <Badge variant="danger">Invalid</Badge>;
    return <Badge variant="warning">Duplicate</Badge>;
  };

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-md border border-stroke bg-meta-2/40 px-4 py-2.5 text-xs dark:border-strokedark dark:bg-meta-4/20">
        <span className="font-medium text-black dark:text-white">{rows.length} rows parsed</span>
        <span className="font-medium text-meta-3">{counts.ready} ready</span>
        {counts.invalid > 0 && <span className="font-medium text-meta-1">{counts.invalid} invalid</span>}
        {counts.duplicate > 0 && <span className="font-medium text-warning">{counts.duplicate} duplicate emails</span>}
      </div>

      <div className="max-h-[40vh] overflow-auto rounded-sm border border-stroke dark:border-strokedark">
        <Table>
          <TableHead>
            <tr>
              <Th>#</Th>
              <Th>Status</Th>
              <Th>Full Name</Th>
              <Th>Email</Th>
              <Th>Phone</Th>
              <Th>Linked Students</Th>
            </tr>
          </TableHead>
          <TableBody>
            {rows.map((row, i) => (
              <tr
                key={i}
                className={statuses[i] === "invalid" ? "bg-meta-1/5" : statuses[i] === "duplicate" ? "bg-warning/5" : ""}
              >
                <Td className="w-10 text-body">{row.rowNum}</Td>
                <Td className="w-24">{statusBadge(statuses[i])}</Td>
                <Td className="max-w-[140px] truncate font-medium text-black dark:text-white">
                  {row.fullName || <span className="italic text-meta-1">missing</span>}
                </Td>
                <Td className="max-w-[160px] truncate text-body">
                  {row.email || <span className="italic text-meta-1">missing</span>}
                </Td>
                <Td className="text-body">{row.phoneNumber || "—"}</Td>
                <Td className="max-w-[200px] truncate text-body text-xs">
                  {row.linkedStudentEmails || <span className="italic">none</span>}
                </Td>
              </tr>
            ))}
          </TableBody>
        </Table>
      </div>

      {counts.invalid > 0 && (
        <p className="text-xs text-body">
          <span className="font-medium text-meta-1">{counts.invalid} invalid row{counts.invalid !== 1 ? "s" : ""}</span>{" "}
          will be skipped. Fix them in your spreadsheet and re-upload to include them.
        </p>
      )}

      <p className="text-xs text-body">
        Student email links that don&apos;t match existing students will be silently skipped — the parent account will still be created.
      </p>

      <div className="flex items-center justify-between pt-1">
        <button type="button" onClick={onBack} className="text-sm text-body hover:text-primary">
          ← Back
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={counts.ready === 0 || isPending}
          className="flex items-center gap-2 rounded bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-opacity-90 disabled:opacity-50 transition-colors"
        >
          {isPending ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          Import {counts.ready} Parent{counts.ready !== 1 ? "s" : ""}
        </button>
      </div>
    </div>
  );
}

// ─── Step 3: Results ──────────────────────────────────────────────────────────

function CollapsibleSection({ title, count, children }: {
  title: string; count: number; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  if (count === 0) return null;
  return (
    <div className="rounded-md border border-stroke dark:border-strokedark">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-sm font-medium text-black hover:bg-meta-2/50 dark:text-white dark:hover:bg-meta-4/20"
      >
        <span>{title} ({count})</span>
        {open ? <ChevronUp className="h-4 w-4 text-body" /> : <ChevronDown className="h-4 w-4 text-body" />}
      </button>
      {open && (
        <div className="border-t border-stroke px-4 pb-3 pt-2 dark:border-strokedark">
          <div className="max-h-48 overflow-auto">
            <table className="w-full text-xs">
              <tbody className="divide-y divide-stroke dark:divide-strokedark">
                {children}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function ResultsStep({
  result,
  onClose,
  onImportMore,
}: {
  result: BulkParentImportResponse;
  onClose: () => void;
  onImportMore: () => void;
}) {
  const { summary, added, failed, duplicates } = result;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col items-center rounded-md border border-meta-3/30 bg-meta-3/10 py-4">
          <CheckCircle2 className="mb-1 h-5 w-5 text-meta-3" />
          <span className="text-2xl font-bold text-meta-3">{summary.added}</span>
          <span className="text-xs text-body">Added</span>
        </div>
        <div className="flex flex-col items-center rounded-md border border-meta-1/30 bg-meta-1/10 py-4">
          <XCircle className="mb-1 h-5 w-5 text-meta-1" />
          <span className="text-2xl font-bold text-meta-1">{summary.failed}</span>
          <span className="text-xs text-body">Failed</span>
        </div>
        <div className="flex flex-col items-center rounded-md border border-warning/30 bg-warning/10 py-4">
          <AlertCircle className="mb-1 h-5 w-5 text-warning" />
          <span className="text-2xl font-bold text-warning">{summary.duplicates}</span>
          <span className="text-xs text-body">Duplicates</span>
        </div>
      </div>

      {summary.added > 0 && (
        <button
          type="button"
          onClick={() => downloadCredentials(added)}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-primary px-4 py-2.5 text-sm font-medium text-primary hover:bg-primary/5 transition-colors"
        >
          <Download className="h-4 w-4" />
          Download Credentials (.xlsx) — {summary.added} parent{summary.added !== 1 ? "s" : ""}
        </button>
      )}

      <CollapsibleSection title="Failed rows" count={failed.length}>
        {failed.map((r) => (
          <tr key={r.row}>
            <td className="py-1 pr-3 font-medium text-black dark:text-white">Row {r.row}</td>
            <td className="py-1 pr-3 text-body">{r.fullName}</td>
            <td className="py-1 text-meta-1">{r.reason}</td>
          </tr>
        ))}
      </CollapsibleSection>

      <CollapsibleSection title="Duplicate emails (skipped)" count={duplicates.length}>
        {duplicates.map((r) => (
          <tr key={r.row}>
            <td className="py-1 pr-3 font-medium text-black dark:text-white">Row {r.row}</td>
            <td className="py-1 pr-3 text-body">{r.fullName}</td>
            <td className="py-1 text-body">{r.email}</td>
          </tr>
        ))}
      </CollapsibleSection>

      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={onImportMore}
          className="flex items-center gap-1.5 text-sm text-body hover:text-primary"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Import more
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-2 rounded bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-opacity-90 transition-colors"
        >
          <Users className="h-4 w-4" />
          Done
        </button>
      </div>
    </div>
  );
}

// ─── Main Modal ──────────────────────────────────────────────────────────��────

interface BulkParentUploadModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function BulkParentUploadModal({ open, onClose, onSuccess }: BulkParentUploadModalProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<"upload" | "preview" | "results">("upload");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [submitError, setSubmitError] = useState("");
  const [result, setResult] = useState<BulkParentImportResponse | null>(null);

  const reset = () => {
    setStep("upload");
    setRows([]);
    setSubmitError("");
    setResult(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const { mutate, isPending } = useMutation({
    mutationFn: () => {
      const payload = rows
        .filter((r) => r.fullName && r.email)
        .map((r) => ({
          fullName: r.fullName,
          email: r.email,
          phoneNumber: r.phoneNumber || undefined,
          linkedStudentEmails: r.linkedStudentEmails || undefined,
        }));
      return adminParentApi.bulkImport(payload);
    },
    onSuccess: (data) => {
      setResult(data);
      setStep("results");
      if (data.summary.added > 0) {
        queryClient.invalidateQueries({ queryKey: ["admin-parents"] });
        onSuccess();
      }
    },
    onError: (e) => {
      setSubmitError(errMsg(e, "Import failed. Please try again."));
    },
  });

  const stepTitles = {
    upload: "Bulk Import Parents",
    preview: "Preview & Confirm",
    results: "Import Results",
  };

  return (
    <Modal open={open} onClose={handleClose} title={stepTitles[step]} className="max-w-3xl">
      <StepBar step={step} />

      {step === "upload" && (
        <UploadStep
          onParsed={(parsed) => {
            setRows(parsed);
            setSubmitError("");
            setStep("preview");
          }}
        />
      )}

      {step === "preview" && (
        <>
          <PreviewStep
            rows={rows}
            onBack={() => setStep("upload")}
            onSubmit={() => mutate()}
            isPending={isPending}
          />
          {submitError && (
            <div className="mt-3 flex items-start gap-2 rounded-md bg-meta-1/10 px-3 py-2">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-meta-1" />
              <p className="text-xs text-meta-1">{submitError}</p>
            </div>
          )}
        </>
      )}

      {step === "results" && result && (
        <ResultsStep result={result} onClose={handleClose} onImportMore={reset} />
      )}
    </Modal>
  );
}
