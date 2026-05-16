"use client";

import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { reportCardTemplateApi } from "@/lib/api/reportCardTemplate";
import { uploadApi } from "@/lib/api/upload";
import { adminApi } from "@/lib/api/admin";
import {
  ReportCardView,
  DEFAULT_REPORT_STYLE,
  type ReportCardStyle,
} from "@/components/report-card/ReportCardView";
import { TraditionalReportCardView } from "@/components/report-card/TraditionalReportCardView";
import type { ReportCardData } from "@/lib/api/student";
import type { ReportCardTemplate } from "@/lib/types";

type TemplateLayout = "standard" | "traditional";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { errMsg } from "@/lib/utils/errMsg";
import {
  FileText, Plus, Pencil, Trash2, Star, Loader2, Upload, X, ArrowLeft,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

type TemplateForm = ReportCardStyle & { name: string; layout: TemplateLayout };

const EMPTY_FORM: TemplateForm = { ...DEFAULT_REPORT_STYLE, name: "", layout: "standard" };

const FONT_OPTIONS = [
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Times New Roman", value: "'Times New Roman', serif" },
  { label: "Helvetica", value: "Helvetica, Arial, sans-serif" },
  { label: "Verdana", value: "Verdana, sans-serif" },
  { label: "Tahoma", value: "Tahoma, sans-serif" },
  { label: "Trebuchet MS", value: "'Trebuchet MS', sans-serif" },
  { label: "Courier New", value: "'Courier New', monospace" },
];

const PRESETS = [
  { name: "Classic", primary: "#3c50e0", headerText: "#ffffff", stripe: "#f0f4ff" },
  { name: "Crimson", primary: "#c0392b", headerText: "#ffffff", stripe: "#fff0f0" },
  { name: "Forest",  primary: "#0e7c5a", headerText: "#ffffff", stripe: "#f0faf5" },
  { name: "Royal",   primary: "#6d28d9", headerText: "#ffffff", stripe: "#f5f0ff" },
  { name: "Gold",    primary: "#b45309", headerText: "#ffffff", stripe: "#fffbf0" },
  { name: "Slate",   primary: "#1e293b", headerText: "#f0f9ff", stripe: "#f8fafc" },
];

const SAMPLE_TERM = { _id: "t1", name: "First Term", academicYear: "2025/2026" };

const SAMPLE_DATA: ReportCardData = {
  student: {
    _id: "sample",
    fullName: "Aminata Kamara",
    email: "aminata@example.com",
    class: { _id: "c1", name: "JSS 2", lecturer: { _id: "l1", fullName: "Mr. Bangura" } },
    studentProfile: { registrationNumber: "STU-0123", gender: "Female" },
  },
  institute: null,
  terms: [SAMPLE_TERM],
  results: [
    { _id: "r1", subject: { _id: "s1", name: "Mathematics", code: "MTH" }, term: SAMPLE_TERM, marksObtained: 84, totalScore: 100, grade: "A" },
    { _id: "r2", subject: { _id: "s2", name: "English Language", code: "ENG" }, term: SAMPLE_TERM, marksObtained: 72, totalScore: 100, grade: "B" },
    { _id: "r3", subject: { _id: "s3", name: "Integrated Science", code: "SCI" }, term: SAMPLE_TERM, marksObtained: 65, totalScore: 100, grade: "C" },
  ],
  attendance: { total: 60, present: 55, absent: 3, late: 2, opened: 60, percentage: 92 },
  position: { rank: 3, outOf: 28 },
  gradingScale: null,
  meta: { classTeacherComment: "A diligent and well-behaved student.", principalComment: "Keep up the good work.", promotionStatus: "promoted" },
  roll: { numberOnRoll: 28, age: 14, averageAge: 14.2, formTeacher: "Mr. Bangura" },
  traits: {
    affective: [
      { _id: "a1", institute: "", domain: "affective", name: "Punctuality", order: 0, createdAt: "", updatedAt: "" },
      { _id: "a2", institute: "", domain: "affective", name: "Honesty", order: 1, createdAt: "", updatedAt: "" },
      { _id: "a3", institute: "", domain: "affective", name: "Cooperation", order: 2, createdAt: "", updatedAt: "" },
    ],
    psychomotor: [
      { _id: "p1", institute: "", domain: "psychomotor", name: "Handwriting", order: 0, createdAt: "", updatedAt: "" },
      { _id: "p2", institute: "", domain: "psychomotor", name: "Games & Sports", order: 1, createdAt: "", updatedAt: "" },
    ],
  },
  metaByTerm: [
    {
      term: "t1",
      classTeacherComment: "Satisfactory work done.",
      principalComment: "Good performance.",
      promotionStatus: "promoted",
      traitRatings: [
        { trait: "a1", rating: 5 }, { trait: "a2", rating: 4 }, { trait: "a3", rating: 5 },
        { trait: "p1", rating: 4 }, { trait: "p2", rating: 5 },
      ],
    },
  ],
  generatedAt: new Date().toISOString(),
};

// ─── Small controls ───────────────────────────────────────────────────────────

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

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={["relative inline-flex h-5 w-9 items-center rounded-full transition-colors", on ? "bg-primary" : "bg-stroke dark:bg-meta-4"].join(" ")}
    >
      <span className={["inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform", on ? "translate-x-4" : "translate-x-0.5"].join(" ")} />
    </button>
  );
}

function AssetUpload({
  label, hint, value, onChange,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(file: File) {
    setError("");
    setUploading(true);
    try {
      const { url } = await uploadApi.reportCardAsset(file);
      onChange(url);
    } catch (e) {
      setError(errMsg(e, "Upload failed"));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-black dark:text-white">{label}</label>
      <p className="mb-1.5 text-[11px] text-body">{hint}</p>
      {value ? (
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt={label} className="h-12 w-24 rounded border border-stroke object-contain" />
          <button
            type="button"
            onClick={() => onChange("")}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-meta-1 hover:bg-meta-1/10"
          >
            <X className="h-3.5 w-3.5" /> Remove
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 rounded border border-dashed border-stroke px-3 py-2 text-xs text-body hover:border-primary hover:text-primary disabled:opacity-60 dark:border-strokedark"
        >
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {uploading ? "Uploading…" : "Upload image"}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
      />
      {error && <p className="mt-1 text-xs text-meta-1">{error}</p>}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReportCardTemplatesPage() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["report-card-templates"] });

  const [editing, setEditing] = useState<null | { id: string | null }>(null);
  const [form, setForm] = useState<TemplateForm>(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ReportCardTemplate | null>(null);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["report-card-templates"],
    queryFn: reportCardTemplateApi.getAll,
  });

  const { data: institute } = useQuery({
    queryKey: ["my-institute"],
    queryFn: adminApi.getMyInstitute,
  });

  const createMutation = useMutation({
    mutationFn: reportCardTemplateApi.create,
    onSuccess: () => { invalidate(); setEditing(null); },
    onError: (e: unknown) => setFormError(errMsg(e, "Failed to create template")),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: TemplateForm }) =>
      reportCardTemplateApi.update(id, payload),
    onSuccess: () => { invalidate(); setEditing(null); },
    onError: (e: unknown) => setFormError(errMsg(e, "Failed to update template")),
  });

  const defaultMutation = useMutation({
    mutationFn: reportCardTemplateApi.setDefault,
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: reportCardTemplateApi.remove,
    onSuccess: () => { invalidate(); setDeleteTarget(null); },
  });

  const list = templates as ReportCardTemplate[];

  function patch<K extends keyof TemplateForm>(key: K, value: TemplateForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function openCreate() {
    setForm({ ...EMPTY_FORM });
    setFormError("");
    setEditing({ id: null });
  }

  function openEdit(t: ReportCardTemplate) {
    setForm({
      name: t.name,
      layout: t.layout ?? "standard",
      primaryColor: t.primaryColor,
      headerTextColor: t.headerTextColor,
      stripeColor: t.stripeColor,
      cardBg: t.cardBg,
      reportTitle: t.reportTitle,
      footerNote: t.footerNote,
      signatureLabels: t.signatureLabels?.length ? t.signatureLabels : DEFAULT_REPORT_STYLE.signatureLabels,
      showSchoolHeader: t.showSchoolHeader,
      showPhoto: t.showPhoto,
      showAttendance: t.showAttendance,
      showPosition: t.showPosition,
      showTermBreakdown: t.showTermBreakdown,
      fontFamily: t.fontFamily,
      letterheadImage: t.letterheadImage,
      watermarkImage: t.watermarkImage,
    });
    setFormError("");
    setEditing({ id: t._id });
  }

  function handleSave() {
    setFormError("");
    if (!form.name.trim()) { setFormError("Template name is required"); return; }
    if (editing?.id) {
      updateMutation.mutate({ id: editing.id, payload: form });
    } else {
      createMutation.mutate(form);
    }
  }

  const saving = createMutation.isPending || updateMutation.isPending;
  const previewData: ReportCardData = { ...SAMPLE_DATA, institute: institute ?? null };

  // ── Editor view ──
  if (editing) {
    return (
      <div className="space-y-5">
        <button
          onClick={() => setEditing(null)}
          className="flex items-center gap-1.5 text-sm text-body hover:text-black dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back to templates
        </button>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_1fr]">
          {/* Form */}
          <div className="space-y-5">
            <div className="rounded-sm border border-stroke bg-white p-5 dark:border-strokedark dark:bg-boxdark space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-black dark:text-white">Template Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => patch("name", e.target.value)}
                  placeholder="e.g. Standard Report Card"
                  className="h-9 w-full rounded border border-stroke bg-transparent px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-black dark:text-white">Layout</label>
                <select
                  value={form.layout}
                  onChange={(e) => patch("layout", e.target.value as TemplateLayout)}
                  className="h-9 w-full rounded border border-stroke bg-transparent px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
                >
                  <option value="standard">Standard — portrait, one results table</option>
                  <option value="traditional">Traditional — landscape, Cognitive / Affective / Psychomotor</option>
                </select>
                <p className="mt-1 text-[11px] text-body">
                  The traditional layout shows the three-domain Sierra Leone report card.
                </p>
              </div>

              {/* Presets */}
              <div>
                <label className="mb-2 block text-xs font-medium text-body">Colour Presets</label>
                <div className="flex flex-wrap gap-2">
                  {PRESETS.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      title={p.name}
                      onClick={() => setForm((prev) => ({ ...prev, primaryColor: p.primary, headerTextColor: p.headerText, stripeColor: p.stripe }))}
                      style={{ background: p.primary }}
                      className="h-7 w-7 rounded-full border-2 border-white shadow transition-transform hover:scale-110"
                    />
                  ))}
                </div>
              </div>

              <ColorRow label="Primary Colour"   value={form.primaryColor}    onChange={(v) => patch("primaryColor", v)} />
              <ColorRow label="Header Text"      value={form.headerTextColor} onChange={(v) => patch("headerTextColor", v)} />
              <ColorRow label="Card Background"  value={form.cardBg}          onChange={(v) => patch("cardBg", v)} />
              <ColorRow label="Row Stripe"       value={form.stripeColor}     onChange={(v) => patch("stripeColor", v)} />

              <div>
                <label className="mb-1 block text-xs font-medium text-black dark:text-white">Font</label>
                <select
                  value={form.fontFamily}
                  onChange={(e) => patch("fontFamily", e.target.value)}
                  className="h-9 w-full rounded border border-stroke bg-transparent px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
                >
                  {FONT_OPTIONS.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-black dark:text-white">Report Title</label>
                <input
                  type="text"
                  value={form.reportTitle}
                  onChange={(e) => patch("reportTitle", e.target.value)}
                  className="h-9 w-full rounded border border-stroke bg-transparent px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
                />
              </div>
            </div>

            {/* Brand assets */}
            <div className="rounded-sm border border-stroke bg-white p-5 dark:border-strokedark dark:bg-boxdark space-y-4">
              <h3 className="text-sm font-semibold text-black dark:text-white">Brand Assets</h3>
              <AssetUpload
                label="Letterhead Banner"
                hint="Full-width image shown at the very top of the report card."
                value={form.letterheadImage}
                onChange={(v) => patch("letterheadImage", v)}
              />
              <AssetUpload
                label="Watermark"
                hint="Faint image shown centred behind the content."
                value={form.watermarkImage}
                onChange={(v) => patch("watermarkImage", v)}
              />
            </div>

            {/* Sections */}
            <div className="rounded-sm border border-stroke bg-white p-5 dark:border-strokedark dark:bg-boxdark space-y-2.5">
              <h3 className="mb-1 text-sm font-semibold text-black dark:text-white">Sections</h3>
              {([
                ["showSchoolHeader", "School Header"],
                ["showPhoto", "Student Photo"],
                ["showAttendance", "Attendance Box"],
                ["showPosition", "Class Position"],
                ["showTermBreakdown", "Term Breakdown"],
              ] as [keyof TemplateForm, string][]).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-xs text-black dark:text-white">{label}</span>
                  <Toggle on={form[key] as boolean} onToggle={() => patch(key, !form[key] as TemplateForm[typeof key])} />
                </div>
              ))}
            </div>

            {/* Signatures & footer */}
            <div className="rounded-sm border border-stroke bg-white p-5 dark:border-strokedark dark:bg-boxdark space-y-3">
              <h3 className="text-sm font-semibold text-black dark:text-white">Signatures &amp; Footer</h3>
              {[0, 1, 2].map((i) => (
                <div key={i}>
                  <label className="mb-1 block text-xs font-medium text-body">Signature Line {i + 1}</label>
                  <input
                    type="text"
                    value={form.signatureLabels[i] ?? ""}
                    onChange={(e) => {
                      const labels = [...form.signatureLabels];
                      labels[i] = e.target.value;
                      patch("signatureLabels", labels);
                    }}
                    className="h-9 w-full rounded border border-stroke bg-transparent px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
                  />
                </div>
              ))}
              <div>
                <label className="mb-1 block text-xs font-medium text-body">Footer Note</label>
                <textarea
                  rows={2}
                  value={form.footerNote}
                  onChange={(e) => patch("footerNote", e.target.value)}
                  placeholder="Leave blank for the default footer text"
                  className="w-full resize-none rounded border border-stroke bg-transparent px-3 py-2 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
                />
              </div>
            </div>

            {formError && (
              <p className="rounded-md bg-meta-1/10 px-3 py-2 text-xs text-meta-1">{formError}</p>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
              <Button type="button" isLoading={saving} onClick={handleSave}>
                {editing.id ? "Save Changes" : "Create Template"}
              </Button>
            </div>
          </div>

          {/* Live preview */}
          <div className="rounded-sm border border-stroke bg-white p-5 dark:border-strokedark dark:bg-boxdark">
            <h3 className="mb-3 text-sm font-semibold text-black dark:text-white">Live Preview</h3>
            <div className="overflow-x-auto">
              {form.layout === "traditional" ? (
                <div style={{ transformOrigin: "top left", transform: "scale(0.62)", width: "297mm", marginBottom: "-80mm" }}>
                  <TraditionalReportCardView data={previewData} style={form} />
                </div>
              ) : (
                <div style={{ transformOrigin: "top left", transform: "scale(0.62)", width: "210mm", marginBottom: "-110mm" }}>
                  <ReportCardView data={previewData} style={form} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── List view ──
  return (
    <div className="space-y-5">
      <div className="rounded-sm border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary dark:border-primary/30 dark:bg-primary/10">
        Design your school&apos;s report card. The <strong>default</strong> template is applied
        automatically to every report card your school generates.
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-body">
          {list.length} template{list.length !== 1 ? "s" : ""}
          {list.find((t) => t.isDefault) && " · 1 default"}
        </p>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5" /> New Template
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : list.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-meta-2 dark:bg-meta-4">
            <FileText className="h-7 w-7 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-black dark:text-white">No report card templates yet</p>
            <p className="mt-0.5 text-xs text-body">Create one to give your school its own report card design.</p>
          </div>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" /> Create First Template
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {list.map((t) => (
            <Card key={t._id}>
              <CardContent>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-8 w-8 rounded" style={{ background: t.primaryColor }} />
                    <div>
                      <p className="flex items-center gap-2 text-sm font-semibold text-black dark:text-white">
                        {t.name}
                        {t.isDefault && <Badge variant="success">Default</Badge>}
                      </p>
                      <p className="text-xs text-body">{t.reportTitle}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {!t.isDefault && (
                      <button
                        onClick={() => defaultMutation.mutate(t._id)}
                        disabled={defaultMutation.isPending}
                        title="Set as default"
                        className="rounded p-1.5 text-body hover:bg-meta-2 hover:text-primary dark:hover:bg-meta-4"
                      >
                        <Star className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => openEdit(t)}
                      title="Edit"
                      className="rounded p-1.5 text-body hover:bg-meta-2 hover:text-primary dark:hover:bg-meta-4"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    {!t.isDefault && (
                      <button
                        onClick={() => setDeleteTarget(t)}
                        title="Delete"
                        className="rounded p-1.5 text-body hover:bg-meta-1/10 hover:text-meta-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {t.letterheadImage && <Badge variant="info">Letterhead</Badge>}
                  {t.watermarkImage && <Badge variant="info">Watermark</Badge>}
                  {!t.showSchoolHeader && <Badge variant="default">No header</Badge>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Delete Template"
      >
        <div className="space-y-4">
          <p className="text-sm text-body">
            Delete <span className="font-semibold text-black dark:text-white">{deleteTarget?.name}</span>?
            This cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              variant="danger"
              isLoading={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget._id)}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
