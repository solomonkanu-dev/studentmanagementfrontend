"use client";

import { useState, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/api/admin";
import { attendanceApi } from "@/lib/api/attendance";
import QRCode from "react-qr-code";
import {
  Palette,
  IdCard,
  Printer,
  Download,
  ChevronDown,
  User,
  Sparkles,
  CheckCircle2,
  Loader2,
  Search,
} from "lucide-react";
import type { AuthUser, Institute } from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CardStyle {
  primaryColor: string;
  headerTextColor: string;
  cardBg: string;
  borderRadius: "sharp" | "rounded" | "pill";
  issueDate: string;
  expiryDate: string;
  terms: string;
  showBorder: boolean;
  footerLabel: string;
}

interface GeneratedCard {
  student: AuthUser;
  qrToken: string | null;
}

// ─── Presets ──────────────────────────────────────────────────────────────────

const PRESETS: { name: string; color: string; headerText: string }[] = [
  { name: "Classic",  color: "#c0392b", headerText: "#ffffff" },
  { name: "Ocean",    color: "#1a56db", headerText: "#ffffff" },
  { name: "Forest",   color: "#0e7c5a", headerText: "#ffffff" },
  { name: "Royal",    color: "#6d28d9", headerText: "#ffffff" },
  { name: "Gold",     color: "#b45309", headerText: "#ffffff" },
  { name: "Slate",    color: "#1e293b", headerText: "#f0f9ff" },
];

const RADIUS_MAP = {
  sharp:   "0px",
  rounded: "8px",
  pill:    "14px",
};

// ─── ID Card Front ────────────────────────────────────────────────────────────

function CardFront({
  student,
  institute,
  style,
}: {
  student: AuthUser;
  institute: Institute | null | undefined;
  style: CardStyle;
}) {
  const profile = student.studentProfile;
  const className =
    student.class && typeof student.class === "object"
      ? (student.class as { name: string }).name
      : "";
  const guardian = profile?.guardian;
  const radius = RADIUS_MAP[style.borderRadius];

  return (
    <div
      style={{
        width: "340px",
        minHeight: "210px",
        background: style.cardBg,
        borderRadius: radius,
        overflow: "hidden",
        border: style.showBorder ? `2px solid ${style.primaryColor}` : "2px solid #e2e8f0",
        fontFamily: "inherit",
        boxShadow: "0 4px 24px 0 rgba(0,0,0,0.10)",
        flexShrink: 0,
      }}
    >
      {/* Header */}
      <div
        style={{
          background: style.primaryColor,
          color: style.headerTextColor,
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "10px 14px",
        }}
      >
        {institute?.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={institute.logo}
            alt="logo"
            style={{ width: 32, height: 32, borderRadius: 4, objectFit: "cover", background: "#fff" }}
          />
        ) : (
          <div
            style={{
              width: 32, height: 32, borderRadius: 4,
              background: "rgba(255,255,255,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, fontWeight: 700, color: style.headerTextColor,
            }}
          >
            {institute?.name?.charAt(0) ?? "E"}
          </div>
        )}
        <span style={{ fontWeight: 700, fontSize: 11, letterSpacing: "0.04em", textTransform: "uppercase", lineHeight: 1.3 }}>
          {institute?.name ?? "School Name"}
        </span>
      </div>

      {/* Body */}
      <div style={{ display: "flex", gap: "12px", padding: "12px 14px" }}>
        {/* Photo */}
        <div
          style={{
            width: 72, height: 88, flexShrink: 0,
            border: `2px solid ${style.primaryColor}`,
            borderRadius: style.borderRadius === "pill" ? 8 : 4,
            overflow: "hidden", background: "#f1f5f9",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          {student.profilePhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={student.profilePhoto} alt={student.fullName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <User size={32} color="#94a3b8" />
          )}
        </div>

        {/* Info */}
        <div style={{ flex: 1, fontSize: 10, color: "#1e293b" }}>
          {[
            ["Name",            student.fullName],
            ["Reg. No.",        profile?.registrationNumber ?? "—"],
            ["Father's Name",   guardian?.name ?? "—"],
            ["Date of Birth",   profile?.dateOfBirth ? profile.dateOfBirth.slice(0, 10) : "—"],
            ["Class",           className || "—"],
            ["Address",         profile?.address ?? "—"],
          ].map(([label, value]) => (
            <div key={label} style={{ display: "flex", gap: 4, marginBottom: 3, lineHeight: 1.4 }}>
              <span style={{ minWidth: 70, color: "#64748b" }}>{label}</span>
              <span style={{ color: "#475569" }}>:</span>
              <span style={{ fontWeight: label === "Name" ? 600 : 400, wordBreak: "break-word" }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          background: style.primaryColor,
          color: style.headerTextColor,
          textAlign: "center",
          fontSize: 10,
          fontWeight: 600,
          padding: "5px 14px",
          letterSpacing: "0.05em",
        }}
      >
        {style.footerLabel || (institute?.phoneNumber ? `Phone: ${institute.phoneNumber}` : "School Phone")}
      </div>
    </div>
  );
}

// ─── ID Card Back ─────────────────────────────────────────────────────────────

function CardBack({
  student,
  institute,
  style,
  qrToken,
}: {
  student: AuthUser;
  institute: Institute | null | undefined;
  style: CardStyle;
  qrToken: string | null;
}) {
  const radius = RADIUS_MAP[style.borderRadius];

  return (
    <div
      style={{
        width: "340px",
        minHeight: "210px",
        background: style.cardBg,
        borderRadius: radius,
        overflow: "hidden",
        border: style.showBorder ? `2px solid ${style.primaryColor}` : "2px solid #e2e8f0",
        fontFamily: "inherit",
        boxShadow: "0 4px 24px 0 rgba(0,0,0,0.10)",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: style.primaryColor,
          color: style.headerTextColor,
          textAlign: "center",
          fontWeight: 700,
          fontSize: 12,
          padding: "10px 14px",
          letterSpacing: "0.04em",
        }}
      >
        Terms and Conditions
      </div>

      {/* Body */}
      <div style={{ flex: 1, padding: "10px 14px", display: "flex", gap: 10 }}>
        {/* Terms text */}
        <div style={{ flex: 1, fontSize: 9.5, color: "#475569", lineHeight: 1.5 }}>
          {style.terms.split("\n").filter(Boolean).map((line, i) => (
            <div key={i} style={{ display: "flex", gap: 5, marginBottom: 4 }}>
              <span style={{ color: style.primaryColor, flexShrink: 0 }}>•</span>
              <span>{line.replace(/^[•\-]\s*/, "")}</span>
            </div>
          ))}

          {/* Dates */}
          <div style={{ marginTop: 10, fontSize: 9, color: "#64748b" }}>
            <div style={{ marginBottom: 2 }}>
              <span style={{ minWidth: 60, display: "inline-block" }}>Issue Date</span>
              <span>: {style.issueDate || "—"}</span>
            </div>
            <div>
              <span style={{ minWidth: 60, display: "inline-block" }}>Expiry Date</span>
              <span>: {style.expiryDate || "—"}</span>
            </div>
          </div>
        </div>

        {/* QR + Principal */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, paddingTop: 2 }}>
          <div style={{ background: "#fff", padding: 4, border: "1px solid #e2e8f0", borderRadius: 4 }}>
            {qrToken ? (
              <QRCode value={qrToken} size={72} level="M" />
            ) : (
              <div style={{ width: 72, height: 72, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <IdCard size={28} color="#94a3b8" />
              </div>
            )}
          </div>
          <span style={{ fontSize: 8, color: "#64748b", fontWeight: 600, letterSpacing: "0.05em" }}>
            {student.studentProfile?.registrationNumber ?? student.fullName.split(" ")[0]}
          </span>
          <div
            style={{
              marginTop: "auto",
              fontSize: 8,
              color: "#94a3b8",
              textAlign: "center",
              borderTop: `1px solid ${style.primaryColor}`,
              paddingTop: 4,
              width: "100%",
            }}
          >
            Principal
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          background: style.primaryColor,
          color: style.headerTextColor,
          textAlign: "center",
          fontSize: 10,
          fontWeight: 600,
          padding: "5px 14px",
          letterSpacing: "0.05em",
        }}
      >
        {style.footerLabel || (institute?.phoneNumber ? `Phone: ${institute.phoneNumber}` : "School Phone")}
      </div>
    </div>
  );
}

// ─── Card Pair (front + back) ─────────────────────────────────────────────────

function CardPair({
  student,
  institute,
  style,
  qrToken,
  cardIndex,
}: {
  student: AuthUser;
  institute: Institute | null | undefined;
  style: CardStyle;
  qrToken: string | null;
  cardIndex: number;
}) {
  const pairRef = useRef<HTMLDivElement>(null);

  const handlePrint = useCallback(() => {
    const el = pairRef.current;
    if (!el) return;
    const win = window.open("", "_blank", "width=900,height=500");
    if (!win) return;
    win.document.write(`
      <html><head><title>ID Card – ${student.fullName}</title>
      <style>
        body { margin: 0; padding: 20px; display: flex; gap: 24px; font-family: sans-serif; }
        @media print { body { padding: 10px; } }
      </style></head><body>
      ${el.innerHTML}
      </body></html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  }, [student.fullName]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-black dark:text-white">
          {cardIndex + 1}. {student.fullName}
          {student.studentProfile?.registrationNumber && (
            <span className="ml-1.5 text-body font-normal">({student.studentProfile.registrationNumber})</span>
          )}
        </p>
        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
        >
          <Printer className="h-3.5 w-3.5" /> Print
        </button>
      </div>

      {/* Front + Back side by side */}
      <div ref={pairRef} style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
        <CardFront student={student} institute={institute} style={style} />
        <CardBack student={student} institute={institute} style={style} qrToken={qrToken} />
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function IDCardsPage() {
  const today = new Date().toISOString().slice(0, 10);
  const nextYear = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);

  const [style, setStyle] = useState<CardStyle>({
    primaryColor: "#c0392b",
    headerTextColor: "#ffffff",
    cardBg: "#ffffff",
    borderRadius: "rounded",
    issueDate: today,
    expiryDate: nextYear,
    terms:
      "This card must be carried at all times on school premises.\nLost cards must be reported immediately.\nThis card is non-transferable.\nMisuse will result in disciplinary action.",
    showBorder: true,
    footerLabel: "",
  });

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [generated, setGenerated] = useState<GeneratedCard[]>([]);
  const [generating, setGenerating] = useState(false);
  const allRef = useRef<HTMLDivElement>(null);

  const { data: students = [], isLoading: loadingStudents } = useQuery({
    queryKey: ["admin-students"],
    queryFn: adminApi.getStudents,
  });

  const { data: institute } = useQuery({
    queryKey: ["admin-institute"],
    queryFn: adminApi.getMyInstitute,
  });

  const filtered = (students as AuthUser[]).filter((s) =>
    s.fullName.toLowerCase().includes(search.toLowerCase()) ||
    (s.studentProfile?.registrationNumber ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const toggleStudent = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(filtered.map((s) => s._id)));
  const clearAll = () => setSelectedIds(new Set());

  // Fetch QR tokens and assemble cards
  const handleGenerate = async () => {
    if (selectedIds.size === 0) return;
    setGenerating(true);
    setGenerated([]);

    const selected = (students as AuthUser[]).filter((s) => selectedIds.has(s._id));
    const cards: GeneratedCard[] = [];

    for (const student of selected) {
      try {
        const qrData = await attendanceApi.getStudentQR(student._id);
        cards.push({ student, qrToken: qrData?.qrToken ?? null });
      } catch {
        cards.push({ student, qrToken: null });
      }
    }

    setGenerated(cards);
    setGenerating(false);

    // Scroll down to results
    setTimeout(() => {
      document.getElementById("id-cards-output")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const handlePrintAll = () => {
    const el = allRef.current;
    if (!el) return;
    const win = window.open("", "_blank", "width=1200,height=800");
    if (!win) return;
    win.document.write(`
      <html><head><title>ID Cards</title>
      <style>
        body { margin: 0; padding: 20px; font-family: sans-serif; }
        .card-pair { display: flex; gap: 20px; margin-bottom: 32px; flex-wrap: wrap; }
        @media print { body { padding: 10px; } .card-pair { page-break-inside: avoid; } }
      </style></head><body>
      ${el.innerHTML}
      </body></html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  const setPreset = (p: typeof PRESETS[number]) => {
    setStyle((s) => ({ ...s, primaryColor: p.color, headerTextColor: p.headerText }));
  };

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div>
        <h1 className="text-xl font-bold text-black dark:text-white flex items-center gap-2">
          <IdCard className="h-5 w-5 text-primary" />
          Student ID Cards
        </h1>
        <p className="mt-1 text-sm text-body">Customize, preview, and generate printable ID cards for your students.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">

        {/* ── Customiser Panel ── */}
        <div className="space-y-5">
          <div className="rounded-xl border border-stroke bg-white p-5 dark:border-strokedark dark:bg-boxdark shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-black dark:text-white">
              <Palette className="h-4 w-4 text-primary" />
              Card Style
            </h2>

            {/* Presets */}
            <div className="mb-4">
              <label className="mb-2 block text-xs font-medium text-body">Colour Presets</label>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => setPreset(p)}
                    title={p.name}
                    style={{ background: p.color }}
                    className="h-7 w-7 rounded-full border-2 border-white shadow transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                ))}
              </div>
            </div>

            {/* Primary color */}
            <div className="mb-3 flex items-center gap-3">
              <label className="w-32 shrink-0 text-xs font-medium text-body">Primary Color</label>
              <input
                type="color"
                value={style.primaryColor}
                onChange={(e) => setStyle((s) => ({ ...s, primaryColor: e.target.value }))}
                className="h-8 w-12 cursor-pointer rounded border border-stroke p-0.5"
              />
              <input
                type="text"
                value={style.primaryColor}
                onChange={(e) => setStyle((s) => ({ ...s, primaryColor: e.target.value }))}
                className="w-24 rounded border border-stroke bg-transparent px-2 py-1 text-xs font-mono text-black dark:border-strokedark dark:text-white"
              />
            </div>

            {/* Header text color */}
            <div className="mb-3 flex items-center gap-3">
              <label className="w-32 shrink-0 text-xs font-medium text-body">Header Text</label>
              <input
                type="color"
                value={style.headerTextColor}
                onChange={(e) => setStyle((s) => ({ ...s, headerTextColor: e.target.value }))}
                className="h-8 w-12 cursor-pointer rounded border border-stroke p-0.5"
              />
              <input
                type="text"
                value={style.headerTextColor}
                onChange={(e) => setStyle((s) => ({ ...s, headerTextColor: e.target.value }))}
                className="w-24 rounded border border-stroke bg-transparent px-2 py-1 text-xs font-mono text-black dark:border-strokedark dark:text-white"
              />
            </div>

            {/* Card background */}
            <div className="mb-3 flex items-center gap-3">
              <label className="w-32 shrink-0 text-xs font-medium text-body">Card Background</label>
              <input
                type="color"
                value={style.cardBg}
                onChange={(e) => setStyle((s) => ({ ...s, cardBg: e.target.value }))}
                className="h-8 w-12 cursor-pointer rounded border border-stroke p-0.5"
              />
              <input
                type="text"
                value={style.cardBg}
                onChange={(e) => setStyle((s) => ({ ...s, cardBg: e.target.value }))}
                className="w-24 rounded border border-stroke bg-transparent px-2 py-1 text-xs font-mono text-black dark:border-strokedark dark:text-white"
              />
            </div>

            {/* Corner style */}
            <div className="mb-3 flex items-center gap-3">
              <label className="w-32 shrink-0 text-xs font-medium text-body">Corner Style</label>
              <div className="flex gap-1.5">
                {(["sharp", "rounded", "pill"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setStyle((s) => ({ ...s, borderRadius: r }))}
                    className={[
                      "rounded px-3 py-1 text-xs font-medium transition-colors capitalize",
                      style.borderRadius === r
                        ? "bg-primary text-white"
                        : "bg-stroke text-body hover:text-black dark:bg-meta-4 dark:hover:text-white",
                    ].join(" ")}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Show border */}
            <div className="mb-3 flex items-center gap-3">
              <label className="w-32 shrink-0 text-xs font-medium text-body">Show Border</label>
              <button
                onClick={() => setStyle((s) => ({ ...s, showBorder: !s.showBorder }))}
                className={[
                  "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                  style.showBorder ? "bg-primary" : "bg-stroke dark:bg-meta-4",
                ].join(" ")}
              >
                <span
                  className={[
                    "inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform",
                    style.showBorder ? "translate-x-4" : "translate-x-0.5",
                  ].join(" ")}
                />
              </button>
            </div>

            {/* Footer label */}
            <div className="mb-1">
              <label className="mb-1.5 block text-xs font-medium text-body">Footer Text <span className="text-body/60">(leave blank to use school phone)</span></label>
              <input
                type="text"
                value={style.footerLabel}
                placeholder={`Phone: ${institute?.phoneNumber ?? "123-456-7890"}`}
                onChange={(e) => setStyle((s) => ({ ...s, footerLabel: e.target.value }))}
                className="w-full rounded border border-stroke bg-transparent px-3 py-1.5 text-xs text-black dark:border-strokedark dark:text-white placeholder:text-body/50"
              />
            </div>
          </div>

          {/* Dates & Terms */}
          <div className="rounded-xl border border-stroke bg-white p-5 dark:border-strokedark dark:bg-boxdark shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-black dark:text-white">Back Side Content</h2>

            <div className="mb-3 grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-body">Issue Date</label>
                <input
                  type="date"
                  value={style.issueDate}
                  onChange={(e) => setStyle((s) => ({ ...s, issueDate: e.target.value }))}
                  className="w-full rounded border border-stroke bg-transparent px-3 py-1.5 text-xs text-black dark:border-strokedark dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-body">Expiry Date</label>
                <input
                  type="date"
                  value={style.expiryDate}
                  onChange={(e) => setStyle((s) => ({ ...s, expiryDate: e.target.value }))}
                  className="w-full rounded border border-stroke bg-transparent px-3 py-1.5 text-xs text-black dark:border-strokedark dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-body">Terms & Conditions <span className="text-body/60">(one per line)</span></label>
              <textarea
                rows={5}
                value={style.terms}
                onChange={(e) => setStyle((s) => ({ ...s, terms: e.target.value }))}
                className="w-full rounded border border-stroke bg-transparent px-3 py-2 text-xs text-black dark:border-strokedark dark:text-white resize-none"
              />
            </div>
          </div>
        </div>

        {/* ── Right: Student selector + Preview ── */}
        <div className="space-y-5">

          {/* Student selector */}
          <div className="rounded-xl border border-stroke bg-white p-5 dark:border-strokedark dark:bg-boxdark shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-black dark:text-white">
                Select Students
                {selectedIds.size > 0 && (
                  <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-white">
                    {selectedIds.size}
                  </span>
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
                  const cls = s.class && typeof s.class === "object" ? (s.class as { name: string }).name : "";
                  return (
                    <button
                      key={s._id}
                      onClick={() => toggleStudent(s._id)}
                      className={[
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors",
                        sel ? "bg-primary/10" : "hover:bg-stroke dark:hover:bg-meta-4",
                      ].join(" ")}
                    >
                      <div
                        className={[
                          "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                          sel ? "bg-primary border-primary" : "border-stroke dark:border-strokedark",
                        ].join(" ")}
                      >
                        {sel && <CheckCircle2 className="h-3 w-3 text-white" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-black dark:text-white">{s.fullName}</p>
                        <p className="truncate text-[10px] text-body">
                          {s.studentProfile?.registrationNumber ?? "—"}{cls ? ` · ${cls}` : ""}
                        </p>
                      </div>
                    </button>
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
            </h2>

            {/* Mock preview with placeholder student */}
            {(() => {
              const previewStudent: AuthUser = (students as AuthUser[])[0] ?? {
                _id: "preview",
                fullName: "Student Name",
                email: "",
                role: "student",
                studentProfile: {
                  registrationNumber: "REG-001",
                  dateOfBirth: "2006-01-15",
                  address: "123 Main Street",
                  guardian: { name: "Parent Name" },
                },
                class: { _id: "", name: "Grade 10" },
              } as AuthUser;

              return (
                <div className="overflow-x-auto">
                  <div style={{ display: "flex", gap: "16px", minWidth: "max-content" }}>
                    <div>
                      <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-widest text-body">Front</p>
                      <CardFront student={previewStudent} institute={institute} style={style} />
                    </div>
                    <div>
                      <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-widest text-body">Back</p>
                      <CardBack student={previewStudent} institute={institute} style={style} qrToken={null} />
                    </div>
                  </div>
                </div>
              );
            })()}
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
                Generating {selectedIds.size} card{selectedIds.size !== 1 ? "s" : ""}…
              </>
            ) : (
              <>
                <IdCard className="h-4 w-4" />
                Generate ID Card{selectedIds.size !== 1 ? "s" : ""}{selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Generated Output ── */}
      {generated.length > 0 && (
        <div id="id-cards-output" className="rounded-xl border border-stroke bg-white p-6 dark:border-strokedark dark:bg-boxdark shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-black dark:text-white flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-meta-3" />
              Generated {generated.length} ID Card{generated.length !== 1 ? "s" : ""}
            </h2>
            <button
              onClick={handlePrintAll}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary/90 transition-colors shadow"
            >
              <Download className="h-3.5 w-3.5" />
              Print All
            </button>
          </div>

          <div ref={allRef} className="space-y-10">
            {generated.map(({ student, qrToken }, i) => (
              <div key={student._id} className="card-pair">
                <CardPair
                  student={student}
                  institute={institute}
                  style={style}
                  qrToken={qrToken}
                  cardIndex={i}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
