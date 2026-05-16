"use client";

import { useState, useRef, useMemo } from "react";
import { downloadXlsx, parseFirstSheet } from "@/lib/utils/spreadsheet";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/lib/api/admin";
import { classApi } from "@/lib/api/class";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Table, TableHead, TableBody, Th, Td } from "@/components/ui/Table";
import { errMsg } from "@/lib/utils/errMsg";
import {
  Download, Upload, FileSpreadsheet, CheckCircle2,
  XCircle, AlertCircle, Users, ChevronDown, ChevronUp,
  RotateCcw,
} from "lucide-react";
import type { Class, BulkStudentResult, BulkImportResponse } from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ParsedRow {
  rowNum: number;
  fullName: string;
  email: string;
  className: string;
  classId: string | null;
  registrationNumber: string;
  dateOfAdmission: string;
  dateOfBirth: string;
  gender: string;
  mobileNumber: string;
  address: string;
  bloodGroup: string;
  religion: string;
  orphanStatus: string;
  previousSchool: string;
  familyType: string;
  medicalInfo: string;
  guardianName: string;
  guardianPhone: string;
  guardianEmail: string;
  guardianAddress: string;
  guardianRelationship: string;
  guardianOccupation: string;
}

type RowStatus = "ready" | "invalid" | "duplicate" | "class-missing";

// ─── Date helpers ─────────────────────────────────────────────────────────────

// Format a JS Date → MM/DD/YYYY string
function formatDateMDY(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

// Extract a date string from a raw cell value (Date object or string)
function extractDate(raw: unknown): string {
  if (!raw) return "";
  if (raw instanceof Date) return formatDateMDY(raw);
  return String(raw).trim();
}

// ─── Template columns ─────────────────────────────────────────────────────────

const TEMPLATE_HEADERS = [
  "Full Name*",
  "Email*",
  "Class Name*",
  "Registration Number",
  "Date of Admission (MM/DD/YYYY)",
  "Date of Birth (MM/DD/YYYY)",
  "Gender (male/female/other)",
  "Mobile Number",
  "Address",
  "Blood Group (A+/A-/B+/B-/AB+/AB-/O+/O-)",
  "Religion",
  "Orphan Status (yes/no)",
  "Previous School",
  "Family Type",
  "Medical Info",
  "Guardian Name",
  "Guardian Phone",
  "Guardian Email",
  "Guardian Address",
  "Guardian Relationship",
  "Guardian Occupation",
];

const TEMPLATE_EXAMPLE = [
  "Jane Doe",
  "jane.doe@school.edu",
  "Grade 1A",
  "STU-001",
  "09/01/2022",
  "05/15/2010",
  "female",
  "+232 76 000000",
  "123 Main Street",
  "O+",
  "Christianity",
  "no",
  "Sunshine Primary",
  "Nuclear",
  "",
  "John Doe",
  "+232 76 111111",
  "johndoe@email.com",
  "123 Main Street",
  "Father",
  "Engineer",
];

function downloadTemplate() {
  return downloadXlsx(
    "student_import_template.xlsx",
    [TEMPLATE_HEADERS, TEMPLATE_EXAMPLE],
    { sheetName: "Students", columnWidths: TEMPLATE_HEADERS.map(() => 26) },
  );
}

// ─── Excel parser ─────────────────────────────────────────────────────────────

async function parseWorkbook(buffer: ArrayBuffer): Promise<ParsedRow[]> {
  const rows = await parseFirstSheet(buffer);

  // Skip header; drop empty rows
  const data = rows.slice(1).filter((r) => (r as unknown[]).some((cell) => String(cell).trim()));

  return data.map((r, i) => {
    const c = (idx: number) => String((r as unknown[])[idx] ?? "").trim();
    return {
      rowNum: i + 2,
      fullName: c(0),
      email: c(1).toLowerCase(),
      className: c(2),
      classId: null,
      registrationNumber: c(3),
      dateOfAdmission: extractDate((r as unknown[])[4]),
      dateOfBirth: extractDate((r as unknown[])[5]),
      gender: c(6),
      mobileNumber: c(7),
      address: c(8),
      bloodGroup: c(9),
      religion: c(10),
      orphanStatus: c(11),
      previousSchool: c(12),
      familyType: c(13),
      medicalInfo: c(14),
      guardianName: c(15),
      guardianPhone: c(16),
      guardianEmail: c(17),
      guardianAddress: c(18),
      guardianRelationship: c(19),
      guardianOccupation: c(20),
    };
  });
}

// ─── Credential download ──────────────────────────────────────────────────────

function downloadCredentials(added: BulkStudentResult[]) {
  return downloadXlsx(
    "student_credentials.xlsx",
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
          setParseError("No data rows found. Make sure you have at least one student row below the header.");
          return;
        }
        if (rows.length > 1000) {
          setParseError(`File contains ${rows.length} rows. Maximum is 1,000 students per import.`);
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
          Fill in your students&apos; details. Fields marked <span className="font-semibold text-meta-1">*</span> are required.
          Use <span className="font-medium text-black dark:text-white">MM/DD/YYYY</span> for date fields.
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
            <p className="mt-0.5 text-xs text-body">Supports .xlsx and .xls — up to 1,000 students</p>
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
  onRowsChange,
  onBack,
  onSubmit,
  isPending,
}: {
  rows: ParsedRow[];
  onRowsChange: (rows: ParsedRow[]) => void;
  onBack: () => void;
  onSubmit: () => void;
  isPending: boolean;
}) {
  const { data: classes = [] } = useQuery({
    queryKey: ["classes"],
    queryFn: classApi.getAll,
  });

  // Resolve class names → IDs once classes load
  const resolvedRows = useMemo(() => {
    const nameMap = new Map<string, string>();
    (classes as Class[]).forEach((c) => nameMap.set(c.name.toLowerCase().trim(), c._id));
    return rows.map((r) => ({
      ...r,
      classId: r.classId ?? nameMap.get(r.className.toLowerCase().trim()) ?? null,
    }));
  }, [rows, classes]);

  // Push resolved IDs back once
  const syncedRef = useRef(false);
  if (!syncedRef.current && resolvedRows.some((r, i) => r.classId !== rows[i].classId)) {
    syncedRef.current = true;
    onRowsChange(resolvedRows);
  }

  const statuses: RowStatus[] = useMemo(() => {
    const emailCount = new Map<string, number>();
    for (const r of resolvedRows) {
      if (r.email) emailCount.set(r.email, (emailCount.get(r.email) ?? 0) + 1);
    }
    const seenOnce = new Set<string>();
    return resolvedRows.map((r) => {
      if (!r.fullName || !r.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email)) return "invalid";
      if ((emailCount.get(r.email) ?? 0) > 1 && seenOnce.has(r.email)) return "duplicate";
      seenOnce.add(r.email);
      if (!r.classId) return "class-missing";
      return "ready";
    });
  }, [resolvedRows]);

  const counts = useMemo(() => ({
    ready: statuses.filter((s) => s === "ready").length,
    invalid: statuses.filter((s) => s === "invalid").length,
    duplicate: statuses.filter((s) => s === "duplicate").length,
    classMissing: statuses.filter((s) => s === "class-missing").length,
  }), [statuses]);

  const handleClassChange = (rowIdx: number, classId: string) => {
    onRowsChange(resolvedRows.map((r, i) => i === rowIdx ? { ...r, classId: classId || null } : r));
  };

  const statusBadge = (s: RowStatus) => {
    if (s === "ready") return <Badge variant="success">Ready</Badge>;
    if (s === "invalid") return <Badge variant="danger">Invalid</Badge>;
    if (s === "duplicate") return <Badge variant="warning">Duplicate</Badge>;
    return <Badge variant="warning">Class?</Badge>;
  };

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-md border border-stroke bg-meta-2/40 px-4 py-2.5 text-xs dark:border-strokedark dark:bg-meta-4/20">
        <span className="font-medium text-black dark:text-white">{resolvedRows.length} rows parsed</span>
        <span className="font-medium text-meta-3">{counts.ready} ready</span>
        {counts.invalid > 0 && <span className="font-medium text-meta-1">{counts.invalid} invalid</span>}
        {counts.duplicate > 0 && <span className="font-medium text-warning">{counts.duplicate} duplicate emails</span>}
        {counts.classMissing > 0 && <span className="font-medium text-warning">{counts.classMissing} class unresolved</span>}
      </div>

      <div className="max-h-[40vh] overflow-auto rounded-sm border border-stroke dark:border-strokedark">
        <Table>
          <TableHead>
            <tr>
              <Th>#</Th>
              <Th>Status</Th>
              <Th>Full Name</Th>
              <Th>Email</Th>
              <Th>Class</Th>
              <Th>Reg #</Th>
              <Th>Date of Birth</Th>
              <Th>Gender</Th>
            </tr>
          </TableHead>
          <TableBody>
            {resolvedRows.map((row, i) => (
              <tr
                key={i}
                className={
                  statuses[i] === "invalid"
                    ? "bg-meta-1/5"
                    : statuses[i] === "ready"
                    ? ""
                    : "bg-warning/5"
                }
              >
                <Td className="w-10 text-body">{row.rowNum}</Td>
                <Td className="w-24">{statusBadge(statuses[i])}</Td>
                <Td className="max-w-[140px] truncate font-medium text-black dark:text-white">
                  {row.fullName || <span className="italic text-meta-1">missing</span>}
                </Td>
                <Td className="max-w-[160px] truncate text-body">
                  {row.email || <span className="italic text-meta-1">missing</span>}
                </Td>
                <Td className="min-w-[140px]">
                  {statuses[i] === "class-missing" ? (
                    <select
                      value={row.classId ?? ""}
                      onChange={(e) => handleClassChange(i, e.target.value)}
                      className="w-full rounded border border-warning bg-transparent px-2 py-1 text-xs text-black outline-none focus:border-primary dark:text-white"
                    >
                      <option value="">— select class —</option>
                      {(classes as Class[]).map((c) => (
                        <option key={c._id} value={c._id}>{c.name}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-sm text-body">
                      {(classes as Class[]).find((c) => c._id === row.classId)?.name ?? row.className}
                    </span>
                  )}
                </Td>
                <Td className="text-body">{row.registrationNumber || "—"}</Td>
                <Td className="text-body">{row.dateOfBirth || "—"}</Td>
                <Td className="text-body">{row.gender || "—"}</Td>
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
          Import {counts.ready} Student{counts.ready !== 1 ? "s" : ""}
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
  result: BulkImportResponse;
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
          Download Credentials (.xlsx) — {summary.added} student{summary.added !== 1 ? "s" : ""}
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

// ─── Main Modal ───────────────────────────────────────────────────────────────

interface BulkUploadModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function BulkUploadModal({ open, onClose, onSuccess }: BulkUploadModalProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<"upload" | "preview" | "results">("upload");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [submitError, setSubmitError] = useState("");
  const [result, setResult] = useState<BulkImportResponse | null>(null);

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
        .filter((r) => r.classId && r.fullName && r.email)
        .map((r) => ({
          fullName: r.fullName,
          email: r.email,
          classId: r.classId!,
          registrationNumber: r.registrationNumber || undefined,
          dateOfAdmission: r.dateOfAdmission || undefined,
          dateOfBirth: r.dateOfBirth || undefined,
          gender: r.gender || undefined,
          mobileNumber: r.mobileNumber || undefined,
          address: r.address || undefined,
          bloodGroup: r.bloodGroup || undefined,
          religion: r.religion || undefined,
          orphanStatus: r.orphanStatus || undefined,
          previousSchool: r.previousSchool || undefined,
          familyType: r.familyType || undefined,
          medicalInfo: r.medicalInfo || undefined,
          guardianName: r.guardianName || undefined,
          guardianPhone: r.guardianPhone || undefined,
          guardianEmail: r.guardianEmail || undefined,
          guardianAddress: r.guardianAddress || undefined,
          guardianRelationship: r.guardianRelationship || undefined,
          guardianOccupation: r.guardianOccupation || undefined,
        }));
      return adminApi.bulkImportStudents(payload);
    },
    onSuccess: (data) => {
      setResult(data);
      setStep("results");
      if (data.summary.added > 0) {
        queryClient.invalidateQueries({ queryKey: ["admin-students"] });
        onSuccess();
      }
    },
    onError: (e) => {
      setSubmitError(errMsg(e, "Import failed. Please try again."));
    },
  });

  const stepTitles = {
    upload: "Bulk Import Students",
    preview: "Preview & Confirm",
    results: "Import Results",
  };

  return (
    <Modal open={open} onClose={handleClose} title={stepTitles[step]} className="max-w-4xl">
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
            onRowsChange={setRows}
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
