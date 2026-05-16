"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { reportCardApi } from "@/lib/api/reportCard";
import { ReportCardView } from "@/components/report-card/ReportCardView";
import { TraditionalReportCardView } from "@/components/report-card/TraditionalReportCardView";
import { errMsg } from "@/lib/utils/errMsg";
import { Printer, ArrowLeft, Save, CheckCircle2 } from "lucide-react";
import type { ReportCardData, PromotionStatus } from "@/lib/api/student";
import type { RatingTrait } from "@/lib/types";

export function ReportCardPage({ backHref }: { backHref: string }) {
  const params = useSearchParams();
  const studentId = params.get("studentId") ?? "";
  const termId = params.get("termId") ?? undefined;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["report-card", studentId, termId],
    queryFn: () => reportCardApi.get(studentId, termId),
    enabled: !!studentId,
  });

  if (!studentId) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <p className="text-sm text-meta-1">No student selected.</p>
        <Link href={backHref} className="text-xs text-primary underline">Back to Results</Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-stroke border-t-primary" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <p className="text-sm text-meta-1">Failed to load report card.</p>
        <Link href={backHref} className="text-xs text-primary underline">Back to Results</Link>
      </div>
    );
  }

  const reportCard = data as ReportCardData;
  const traditional = reportCard.template?.layout === "traditional";

  return (
    <>
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link
          href={backHref}
          className="flex items-center gap-1.5 text-sm text-body hover:text-black dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Results
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-sm text-body">{reportCard.student?.fullName}</span>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
          >
            <Printer className="h-4 w-4" />
            Download / Print PDF
          </button>
        </div>
      </div>

      <RemarksEditor studentId={studentId} termId={termId} data={reportCard} />

      <div className="overflow-auto print:overflow-visible">
        {traditional ? (
          <TraditionalReportCardView data={reportCard} style={reportCard.template ?? undefined} />
        ) : (
          <ReportCardView data={reportCard} style={reportCard.template ?? undefined} />
        )}
      </div>

      <style>{`
        @media print {
          @page { size: ${traditional ? "A4 landscape" : "A4"}; margin: 0; }
          body * { visibility: hidden; }
          #report-card, #report-card * { visibility: visible; }
          #report-card { position: fixed; top: 0; left: 0; width: 100%; }
        }
      `}</style>
    </>
  );
}

// ─── Ratings & remarks editor ─────────────────────────────────────────────────

function RatingPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(value === n ? 0 : n)}
          className={[
            "h-7 w-7 rounded text-xs font-bold transition-colors",
            value === n
              ? "bg-primary text-white"
              : "bg-stroke text-body hover:bg-primary/20 dark:bg-meta-4",
          ].join(" ")}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

function TraitGrid({
  title,
  traits,
  ratings,
  onRate,
}: {
  title: string;
  traits: RatingTrait[];
  ratings: Record<string, number>;
  onRate: (traitId: string, rating: number) => void;
}) {
  if (traits.length === 0) return null;
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-body">{title}</p>
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {traits.map((t) => (
          <div key={t._id} className="flex items-center justify-between gap-2 rounded border border-stroke px-3 py-1.5 dark:border-strokedark">
            <span className="text-xs text-black dark:text-white">{t.name}</span>
            <RatingPicker value={ratings[t._id] ?? 0} onChange={(v) => onRate(t._id, v)} />
          </div>
        ))}
      </div>
    </div>
  );
}

function RemarksEditor({
  studentId,
  termId,
  data,
}: {
  studentId: string;
  termId?: string;
  data: ReportCardData;
}) {
  const queryClient = useQueryClient();
  const meta = data.meta;
  const traits = data.traits ?? { affective: [], psychomotor: [] };

  const [classTeacherComment, setClassTeacherComment] = useState(meta?.classTeacherComment ?? "");
  const [principalComment, setPrincipalComment] = useState(meta?.principalComment ?? "");
  const [promotionStatus, setPromotionStatus] = useState<PromotionStatus>(meta?.promotionStatus ?? "pending");
  const [ratings, setRatings] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    (meta?.traitRatings ?? []).forEach((r) => { map[r.trait] = r.rating; });
    return map;
  });
  const [saveError, setSaveError] = useState("");

  const saveMutation = useMutation({
    mutationFn: () =>
      reportCardApi.saveMeta(
        studentId,
        {
          classTeacherComment,
          principalComment,
          promotionStatus,
          traitRatings: Object.entries(ratings)
            .filter(([, v]) => v > 0)
            .map(([trait, rating]) => ({ trait, rating })),
        },
        termId,
      ),
    onSuccess: () => {
      setSaveError("");
      queryClient.invalidateQueries({ queryKey: ["report-card", studentId, termId] });
    },
    onError: (e: unknown) => setSaveError(errMsg(e, "Failed to save")),
  });

  return (
    <div className="mb-4 rounded-sm border border-stroke bg-white p-5 dark:border-strokedark dark:bg-boxdark print:hidden">
      <h2 className="mb-3 text-sm font-semibold text-black dark:text-white">Remarks, Ratings &amp; Promotion</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-black dark:text-white">Class Teacher&apos;s Remark</label>
          <textarea
            rows={3}
            value={classTeacherComment}
            onChange={(e) => setClassTeacherComment(e.target.value)}
            placeholder="e.g. A hardworking student who participates well."
            className="resize-none rounded border border-stroke bg-transparent px-3 py-2 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-black dark:text-white">Principal&apos;s Remark</label>
          <textarea
            rows={3}
            value={principalComment}
            onChange={(e) => setPrincipalComment(e.target.value)}
            placeholder="e.g. Keep up the good work next term."
            className="resize-none rounded border border-stroke bg-transparent px-3 py-2 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
          />
        </div>
      </div>

      {(traits.affective.length > 0 || traits.psychomotor.length > 0) && (
        <div className="mt-4 space-y-4">
          <p className="text-[11px] text-body">Rate each trait 1 (poor) to 5 (excellent). Click an active rating to clear it.</p>
          <TraitGrid
            title="Affective — character & behaviour"
            traits={traits.affective}
            ratings={ratings}
            onRate={(id, v) => setRatings((p) => ({ ...p, [id]: v }))}
          />
          <TraitGrid
            title="Psychomotor — practical skills"
            traits={traits.psychomotor}
            ratings={ratings}
            onRate={(id, v) => setRatings((p) => ({ ...p, [id]: v }))}
          />
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-black dark:text-white">Promotion Status</label>
          <select
            value={promotionStatus}
            onChange={(e) => setPromotionStatus(e.target.value as PromotionStatus)}
            className="h-9 w-48 rounded border border-stroke bg-transparent px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
          >
            <option value="pending">Pending</option>
            <option value="promoted">Promoted</option>
            <option value="repeated">Repeated</option>
          </select>
        </div>
        <div className="flex items-center gap-3">
          {saveMutation.isSuccess && !saveMutation.isPending && (
            <span className="flex items-center gap-1 text-xs text-meta-3">
              <CheckCircle2 className="h-3.5 w-3.5" /> Saved
            </span>
          )}
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-60 transition-colors"
          >
            <Save className="h-4 w-4" />
            {saveMutation.isPending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
      {saveError && (
        <p className="mt-2 rounded-md bg-meta-1/10 px-3 py-2 text-xs text-meta-1">{saveError}</p>
      )}
    </div>
  );
}
