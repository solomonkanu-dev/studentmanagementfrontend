"use client";

import { useState, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminApi, type AcademicTerm } from "@/lib/api/admin";
import { ReportCardView, type ReportCardStyle, DEFAULT_REPORT_STYLE } from "@/components/report-card/ReportCardView";
import type { ReportCardData } from "@/lib/api/student";
import type { AuthUser } from "@/lib/types";
import {
  Palette,
  FileText,
  Printer,
  Download,
  Search,
  CheckCircle2,
  Loader2,
  Sparkles,
  Eye,
  EyeOff,
} from "lucide-react";

// ─── Colour presets ───────────────────────────────────────────────────────────

const PRESETS: { name: string; primary: string; headerText: string; stripe: string }[] = [
  { name: "Classic",  primary: "#3c50e0", headerText: "#ffffff", stripe: "#f0f4ff" },
  { name: "Crimson",  primary: "#c0392b", headerText: "#ffffff", stripe: "#fff0f0" },
  { name: "Forest",   primary: "#0e7c5a", headerText: "#ffffff", stripe: "#f0faf5" },
  { name: "Royal",    primary: "#6d28d9", headerText: "#ffffff", stripe: "#f5f0ff" },
  { name: "Gold",     primary: "#b45309", headerText: "#ffffff", stripe: "#fffbf0" },
  { name: "Slate",    primary: "#1e293b", headerText: "#f0f9ff", stripe: "#f8fafc" },
];

// ─── Toggle helper ────────────────────────────────────────────────────────────

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={["relative inline-flex h-5 w-9 items-center rounded-full transition-colors", on ? "bg-primary" : "bg-stroke dark:bg-meta-4"].join(" ")}
    >
      <span className={["inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform", on ? "translate-x-4" : "translate-x-0.5"].join(" ")} />
    </button>
  );
}

// ─── Colour row ───────────────────────────────────────────────────────────────

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-3">
      <label className="w-32 shrink-0 text-xs font-medium text-body">{label}</label>
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-8 w-12 cursor-pointer rounded border border-stroke p-0.5" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-24 rounded border border-stroke bg-transparent px-2 py-1 text-xs font-mono text-black dark:border-strokedark dark:text-white"
      />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReportCardsPage() {
  const [rcStyle, setRcStyle] = useState<ReportCardStyle>({ ...DEFAULT_REPORT_STYLE });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [termFilter, setTermFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [generated, setGenerated] = useState<{ student: AuthUser; data: ReportCardData }[]>([]);
  const [generating, setGenerating] = useState(false);
  const [previewStudentId, setPreviewStudentId] = useState<string | null>(null);
  const allRef = useRef<HTMLDivElement>(null);

  // ── Data queries ──
  const { data: students = [], isLoading: loadingStudents } = useQuery({
    queryKey: ["admin-students"],
    queryFn: adminApi.getStudents,
  });

  const { data: terms = [] } = useQuery({
    queryKey: ["admin-terms"],
    queryFn: adminApi.getTerms,
  });

  // Lazy preview — only fetch when a student is highlighted
  const { data: previewData, isLoading: loadingPreview } = useQuery({
    queryKey: ["admin-report-card-preview", previewStudentId, termFilter],
    queryFn: () => adminApi.getReportCard(previewStudentId!, termFilter || undefined),
    enabled: !!previewStudentId,
    staleTime: 60_000,
  });

  // ── Derived ──
  const filtered = (students as AuthUser[]).filter((s) =>
    s.fullName.toLowerCase().includes(search.toLowerCase()) ||
    (s.studentProfile?.registrationNumber ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const setPreset = (p: typeof PRESETS[number]) =>
    setRcStyle((prev) => ({ ...prev, primaryColor: p.primary, headerTextColor: p.headerText, stripeColor: p.stripe }));

  const patch = <K extends keyof ReportCardStyle>(key: K, value: ReportCardStyle[K]) =>
    setRcStyle((prev) => ({ ...prev, [key]: value }));

  const toggleStudent = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    // Auto-set preview to first selected
    if (!previewStudentId) setPreviewStudentId(id);
  };

  const selectAll = () => {
    setSelectedIds(new Set(filtered.map((s) => s._id)));
    if (!previewStudentId && filtered[0]) setPreviewStudentId(filtered[0]._id);
  };
  const clearAll = () => { setSelectedIds(new Set()); };

  // ── Generate ──
  const handleGenerate = async () => {
    if (selectedIds.size === 0) return;
    setGenerating(true);
    setGenerated([]);
    const selected = (students as AuthUser[]).filter((s) => selectedIds.has(s._id));
    const results: { student: AuthUser; data: ReportCardData }[] = [];
    for (const student of selected) {
      try {
        const data = await adminApi.getReportCard(student._id, termFilter || undefined);
        results.push({ student, data });
      } catch { /* skip on error */ }
    }
    setGenerated(results);
    setGenerating(false);
    setTimeout(() => {
      document.getElementById("rc-output")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  // ── Print all ──
  const handlePrintAll = useCallback(() => {
    const el = allRef.current;
    if (!el) return;
    const win = window.open("", "_blank", "width=900,height=800");
    if (!win) return;
    win.document.write(`
      <html><head><title>Report Cards</title>
      <style>
        body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
        .rc-page { page-break-after: always; }
        @media print { body { padding: 0; } }
      </style></head><body>
      ${el.innerHTML}
      </body></html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-black dark:text-white">
          <FileText className="h-5 w-5 text-primary" />
          Report Card Generator
        </h1>
        <p className="mt-1 text-sm text-body">Customise the style, select students, then generate and print styled report cards.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">

        {/* ── Left: Customiser ── */}
        <div className="space-y-5">

          {/* Style panel */}
          <div className="rounded-xl border border-stroke bg-white p-5 dark:border-strokedark dark:bg-boxdark shadow-sm space-y-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-black dark:text-white">
              <Palette className="h-4 w-4 text-primary" />
              Card Style
            </h2>

            {/* Presets */}
            <div>
              <label className="mb-2 block text-xs font-medium text-body">Colour Presets</label>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => setPreset(p)}
                    title={p.name}
                    style={{ background: p.primary }}
                    className="h-7 w-7 rounded-full border-2 border-white shadow transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                ))}
              </div>
            </div>

            <ColorRow label="Primary Color"  value={rcStyle.primaryColor}    onChange={(v) => patch("primaryColor", v)} />
            <ColorRow label="Header Text"    value={rcStyle.headerTextColor} onChange={(v) => patch("headerTextColor", v)} />
            <ColorRow label="Card Background" value={rcStyle.cardBg}         onChange={(v) => patch("cardBg", v)} />
            <ColorRow label="Row Stripe"     value={rcStyle.stripeColor}     onChange={(v) => patch("stripeColor", v)} />

            {/* Report title */}
            <div>
              <label className="mb-1 block text-xs font-medium text-body">Report Title</label>
              <input
                type="text"
                value={rcStyle.reportTitle}
                onChange={(e) => patch("reportTitle", e.target.value)}
                placeholder="Report Card"
                className="w-full rounded border border-stroke bg-transparent px-3 py-1.5 text-xs text-black dark:border-strokedark dark:text-white"
              />
            </div>

            {/* Section toggles */}
            <div className="space-y-2.5">
              <p className="text-xs font-medium text-body">Show / Hide Sections</p>
              {([
                ["showPhoto",          "Student Photo"],
                ["showAttendance",     "Attendance Box"],
                ["showPosition",       "Class Position"],
                ["showTermBreakdown",  "Term Breakdown"],
              ] as [keyof ReportCardStyle, string][]).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-xs text-black dark:text-white">{label}</span>
                  <Toggle on={rcStyle[key] as boolean} onToggle={() => patch(key, !rcStyle[key] as ReportCardStyle[typeof key])} />
                </div>
              ))}
            </div>
          </div>

          {/* Signatures & footer */}
          <div className="rounded-xl border border-stroke bg-white p-5 dark:border-strokedark dark:bg-boxdark shadow-sm space-y-3">
            <h2 className="text-sm font-semibold text-black dark:text-white">Signatures & Footer</h2>
            {(["Signature 1", "Signature 2", "Signature 3"] as const).map((_, i) => (
              <div key={i}>
                <label className="mb-1 block text-xs font-medium text-body">Signature Line {i + 1}</label>
                <input
                  type="text"
                  value={rcStyle.signatureLabels[i]}
                  onChange={(e) => {
                    const labels = [...rcStyle.signatureLabels] as [string, string, string];
                    labels[i] = e.target.value;
                    patch("signatureLabels", labels);
                  }}
                  className="w-full rounded border border-stroke bg-transparent px-3 py-1.5 text-xs text-black dark:border-strokedark dark:text-white"
                />
              </div>
            ))}
            <div>
              <label className="mb-1 block text-xs font-medium text-body">Footer Note <span className="text-body/60">(leave blank for default)</span></label>
              <textarea
                rows={2}
                value={rcStyle.footerNote}
                onChange={(e) => patch("footerNote", e.target.value)}
                className="w-full resize-none rounded border border-stroke bg-transparent px-3 py-2 text-xs text-black dark:border-strokedark dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* ── Right: Controls + Preview ── */}
        <div className="space-y-5">

          {/* Term filter + student selector */}
          <div className="rounded-xl border border-stroke bg-white p-5 dark:border-strokedark dark:bg-boxdark shadow-sm">
            {/* Term filter */}
            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-medium text-body">Term Filter <span className="text-body/60">(optional)</span></label>
              <select
                value={termFilter}
                onChange={(e) => setTermFilter(e.target.value)}
                className="w-full rounded border border-stroke bg-transparent px-3 py-2 text-sm text-black dark:border-strokedark dark:text-white"
              >
                <option value="">All Terms</option>
                {(terms as AcademicTerm[]).map((t) => (
                  <option key={t._id} value={t._id}>{t.name} — {t.academicYear}</option>
                ))}
              </select>
            </div>

            {/* Student selector header */}
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-black dark:text-white">
                Select Students
                {selectedIds.size > 0 && (
                  <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-white">{selectedIds.size}</span>
                )}
              </h2>
              <div className="flex gap-2">
                <button onClick={selectAll} className="text-xs text-primary hover:underline">Select all</button>
                <span className="text-body">·</span>
                <button onClick={clearAll} className="text-xs text-body hover:text-black dark:hover:text-white">Clear</button>
              </div>
            </div>

            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-body" />
              <input
                type="text"
                placeholder="Search students..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded border border-stroke bg-transparent py-2 pl-8 pr-3 text-sm text-black dark:border-strokedark dark:text-white placeholder:text-body/60"
              />
            </div>

            {/* Student list */}
            <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
              {loadingStudents ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : filtered.length === 0 ? (
                <p className="py-4 text-center text-xs text-body">No students found</p>
              ) : (
                filtered.map((s) => {
                  const sel = selectedIds.has(s._id);
                  const isPreviewing = previewStudentId === s._id;
                  const cls = s.class && typeof s.class === "object" ? (s.class as { name: string }).name : "";
                  return (
                    <div key={s._id} className="flex items-center gap-1">
                      <button
                        onClick={() => toggleStudent(s._id)}
                        className={[
                          "flex flex-1 items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors",
                          sel ? "bg-primary/10" : "hover:bg-stroke dark:hover:bg-meta-4",
                        ].join(" ")}
                      >
                        <div className={["flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors", sel ? "bg-primary border-primary" : "border-stroke dark:border-strokedark"].join(" ")}>
                          {sel && <CheckCircle2 className="h-3 w-3 text-white" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-black dark:text-white">{s.fullName}</p>
                          <p className="truncate text-[10px] text-body">
                            {s.studentProfile?.registrationNumber ?? "—"}{cls ? ` · ${cls}` : ""}
                          </p>
                        </div>
                      </button>
                      {/* Preview trigger */}
                      <button
                        onClick={() => setPreviewStudentId(isPreviewing ? null : s._id)}
                        title={isPreviewing ? "Hide preview" : "Preview this student"}
                        className={["shrink-0 rounded p-1.5 transition-colors", isPreviewing ? "text-primary" : "text-body hover:text-black dark:hover:text-white"].join(" ")}
                      >
                        {isPreviewing ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Live Preview */}
          <div className="rounded-xl border border-stroke bg-white p-5 dark:border-strokedark dark:bg-boxdark shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-black dark:text-white">
              <Sparkles className="h-4 w-4 text-primary" />
              Live Preview
              {previewStudentId && (
                <span className="ml-1 text-xs font-normal text-body">
                  — {(students as AuthUser[]).find((s) => s._id === previewStudentId)?.fullName ?? ""}
                </span>
              )}
            </h2>

            <div className="overflow-x-auto">
              {!previewStudentId ? (
                <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                  <Eye className="h-8 w-8 text-stroke" />
                  <p className="text-xs text-body">Click the <Eye className="inline h-3 w-3" /> icon next to a student to preview their report card</p>
                </div>
              ) : loadingPreview ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : previewData ? (
                <div style={{ transformOrigin: "top left", transform: "scale(0.55)", width: "210mm", marginBottom: "-130mm" }}>
                  <ReportCardView data={previewData as ReportCardData} style={rcStyle} />
                </div>
              ) : (
                <p className="py-8 text-center text-xs text-body">No data available for this student</p>
              )}
            </div>
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={selectedIds.size === 0 || generating}
            className={[
              "flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold transition-all",
              selectedIds.size > 0 && !generating
                ? "bg-primary text-white hover:bg-primary/90 shadow-md hover:shadow-lg"
                : "bg-stroke text-body cursor-not-allowed dark:bg-meta-4",
            ].join(" ")}
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating {selectedIds.size} report card{selectedIds.size !== 1 ? "s" : ""}…
              </>
            ) : (
              <>
                <FileText className="h-4 w-4" />
                Generate Report Card{selectedIds.size !== 1 ? "s" : ""}{selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Generated output ── */}
      {generated.length > 0 && (
        <div id="rc-output" className="rounded-xl border border-stroke bg-white p-6 dark:border-strokedark dark:bg-boxdark shadow-sm space-y-8">
          <div className="flex items-center justify-between print:hidden">
            <h2 className="flex items-center gap-2 text-sm font-bold text-black dark:text-white">
              <CheckCircle2 className="h-4 w-4 text-meta-3" />
              Generated {generated.length} Report Card{generated.length !== 1 ? "s" : ""}
            </h2>
            <button
              onClick={handlePrintAll}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary/90 transition-colors shadow"
            >
              <Download className="h-3.5 w-3.5" />
              Print All
            </button>
          </div>

          <div ref={allRef} className="space-y-12">
            {generated.map(({ student, data }, i) => (
              <GeneratedCard
                key={student._id}
                index={i}
                student={student}
                data={data}
                rcStyle={rcStyle}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Individual generated card ────────────────────────────────────────────────

function GeneratedCard({
  index,
  student,
  data,
  rcStyle,
}: {
  index: number;
  student: AuthUser;
  data: ReportCardData;
  rcStyle: ReportCardStyle;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handlePrint = useCallback(() => {
    const el = cardRef.current;
    if (!el) return;
    const win = window.open("", "_blank", "width=900,height=800");
    if (!win) return;
    win.document.write(`
      <html><head><title>Report Card – ${student.fullName}</title>
      <style>
        body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
        @page { size: A4; margin: 0; }
        @media print { body { padding: 0; } }
      </style></head><body>
      ${el.innerHTML}
      </body></html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
  }, [student.fullName]);

  return (
    <div className="rc-page space-y-3">
      <div className="flex items-center justify-between print:hidden">
        <p className="text-xs font-semibold text-black dark:text-white">
          {index + 1}. {student.fullName}
          {student.studentProfile?.registrationNumber && (
            <span className="ml-1.5 font-normal text-body">({student.studentProfile.registrationNumber})</span>
          )}
        </p>
        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
        >
          <Printer className="h-3.5 w-3.5" /> Print
        </button>
      </div>

      <div ref={cardRef} className="overflow-x-auto">
        <ReportCardView data={data} style={rcStyle} />
      </div>
    </div>
  );
}
