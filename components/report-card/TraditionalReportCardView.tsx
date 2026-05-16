"use client";

import type { ReportCardData, ReportCardTerm } from "@/lib/api/student";
import type { RatingTrait } from "@/lib/types";
import { Building2 } from "lucide-react";
import { gradeColor, gradeFromScale } from "@/lib/utils/grading";
import { DEFAULT_REPORT_STYLE, type ReportCardStyle } from "./ReportCardView";

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

const PROMOTION_LABEL: Record<string, string> = {
  promoted: "Promoted",
  repeated: "Repeated",
  pending: "Pending",
};

interface Props {
  data: ReportCardData;
  style?: Partial<ReportCardStyle>;
}

const NO_TERM = "__none__";

export function TraditionalReportCardView({ data, style: styleProp }: Props) {
  const s: ReportCardStyle = { ...DEFAULT_REPORT_STYLE, ...styleProp };
  const { student, institute, results, attendance, position, roll } = data;
  const scale = data.gradingScale?.grades;
  const traits = data.traits ?? { affective: [], psychomotor: [] };

  // ── Cognitive: group results by subject ──
  const subjectMap = new Map<
    string,
    {
      subject: NonNullable<(typeof results)[number]["subject"]>;
      perTerm: Map<string, { ca?: number; exam?: number; total: number; totalScore: number; grade?: string }>;
    }
  >();
  results.forEach((r) => {
    if (!r.subject) return;
    if (!subjectMap.has(r.subject._id)) subjectMap.set(r.subject._id, { subject: r.subject, perTerm: new Map() });
    const termKey = r.term?._id ?? NO_TERM;
    subjectMap.get(r.subject._id)!.perTerm.set(termKey, {
      ca: r.caScore,
      exam: r.examScore,
      total: r.marksObtained,
      totalScore: r.totalScore ?? 100,
      grade: r.grade,
    });
  });
  const subjectRows = Array.from(subjectMap.values());

  // ── Terms in scope ──
  let displayTerms: ReportCardTerm[] = data.terms.filter((t) =>
    subjectRows.some((row) => row.perTerm.has(t._id)),
  );
  if (displayTerms.length === 0) {
    displayTerms = [{ _id: NO_TERM, name: "Term", academicYear: "" }];
  }

  // ── Affective / psychomotor ratings: term → trait → rating ──
  const ratingByTermTrait = new Map<string, Map<string, number>>();
  (data.metaByTerm ?? []).forEach((m) => {
    const tk = m.term ? String(m.term) : NO_TERM;
    const inner = new Map<string, number>();
    (m.traitRatings ?? []).forEach((tr) => inner.set(String(tr.trait), tr.rating));
    ratingByTermTrait.set(tk, inner);
  });

  // ── Per-term remarks ──
  const remarkByTerm = new Map<string, string>();
  let principalComment = "";
  let promotionStatus = "";
  (data.metaByTerm ?? []).forEach((m) => {
    const tk = m.term ? String(m.term) : NO_TERM;
    if (m.classTeacherComment) remarkByTerm.set(tk, m.classTeacherComment);
    if (m.principalComment) principalComment = m.principalComment;
    if (m.promotionStatus && m.promotionStatus !== "pending") promotionStatus = m.promotionStatus;
  });
  if (!promotionStatus && data.meta?.promotionStatus) promotionStatus = data.meta.promotionStatus;

  function subjectAverage(perTerm: (typeof subjectRows)[number]["perTerm"]): number | null {
    const pcts = Array.from(perTerm.values()).map((e) =>
      e.totalScore > 0 ? (e.total / e.totalScore) * 100 : 0,
    );
    if (pcts.length === 0) return null;
    return Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length);
  }

  // ── Overall totals & average ──
  const termTotals = new Map<string, { ca: number; exam: number; total: number; has: boolean }>();
  displayTerms.forEach((t) => termTotals.set(t._id, { ca: 0, exam: 0, total: 0, has: false }));
  subjectRows.forEach((row) => {
    displayTerms.forEach((t) => {
      const e = row.perTerm.get(t._id);
      if (!e) return;
      const acc = termTotals.get(t._id)!;
      acc.ca += e.ca ?? 0;
      acc.exam += e.exam ?? 0;
      acc.total += e.total ?? 0;
      acc.has = true;
    });
  });
  const subjectAvgs = subjectRows
    .map((r) => subjectAverage(r.perTerm))
    .filter((v): v is number => v != null);
  const overallAverage = subjectAvgs.length
    ? Math.round(subjectAvgs.reduce((a, b) => a + b, 0) / subjectAvgs.length)
    : null;
  const overallGrade = overallAverage != null ? gradeFromScale(scale, overallAverage) : "—";

  const className =
    typeof student.class === "object" && student.class ? student.class.name : "—";
  const generatedDate = new Date(data.generatedAt).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  const th: React.CSSProperties = {
    padding: "4px 6px", fontSize: "9px", fontWeight: "bold",
    textTransform: "uppercase", border: "1px solid #cbd5e1", textAlign: "center",
  };
  const td: React.CSSProperties = {
    padding: "4px 6px", fontSize: "10px", border: "1px solid #cbd5e1", textAlign: "center",
  };

  return (
    <div
      id="report-card"
      style={{
        width: "297mm",
        minHeight: "210mm",
        margin: "0 auto",
        background: s.cardBg,
        color: "#1e293b",
        fontFamily: s.fontFamily,
        fontSize: "11px",
        padding: "10mm 12mm",
        boxSizing: "border-box",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {s.watermarkImage && (
        <div style={{ position: "absolute", inset: 0, zIndex: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={s.watermarkImage} alt="" style={{ width: "60%", maxHeight: "60%", objectFit: "contain", opacity: 0.07 }} />
        </div>
      )}

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Letterhead */}
        {s.letterheadImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={s.letterheadImage} alt="Letterhead" style={{ width: "100%", display: "block", objectFit: "contain", marginBottom: "8px" }} />
        )}

        {/* Header */}
        {s.showSchoolHeader && (
          <div style={{ display: "flex", alignItems: "center", gap: "14px", borderBottom: `3px solid ${s.primaryColor}`, paddingBottom: "8px", marginBottom: "10px" }}>
            <div style={{ flexShrink: 0 }}>
              {institute?.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={institute.logo} alt="Logo" style={{ width: 56, height: 56, objectFit: "contain" }} />
              ) : (
                <div style={{ width: 56, height: 56, background: s.primaryColor + "22", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Building2 style={{ width: 28, height: 28, color: s.primaryColor }} />
                </div>
              )}
            </div>
            <div style={{ flex: 1, textAlign: "center" }}>
              <h1 style={{ margin: 0, fontSize: "18px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px" }}>
                {institute?.name ?? "School Name"}
              </h1>
              {institute?.address && (
                <p style={{ margin: "1px 0 0", fontSize: "9px", color: "#64748b" }}>
                  {[institute.address, institute.country].filter(Boolean).join(", ")}
                </p>
              )}
            </div>
            <div style={{ background: s.primaryColor, color: s.headerTextColor, padding: "4px 10px", borderRadius: 4, fontSize: "9px", fontWeight: "bold", textTransform: "uppercase" }}>
              {s.reportTitle}
            </div>
          </div>
        )}

        {/* Student info strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "2px 14px", marginBottom: "10px", fontSize: "10px" }}>
          <Info label="Name" value={student.fullName} />
          <Info label="Class / Form" value={className} />
          <Info label="Reg. Number" value={student.studentProfile?.registrationNumber ?? "—"} />
          <Info label="No. on Roll" value={roll?.numberOnRoll != null ? String(roll.numberOnRoll) : "—"} />
          <Info label="Age" value={roll?.age != null ? `${roll.age} yrs` : "—"} />
          <Info label="Average Age" value={roll?.averageAge != null ? `${roll.averageAge} yrs` : "—"} />
          <Info label="Form Teacher" value={roll?.formTeacher ?? "—"} />
          <Info label="Position" value={position.outOf > 0 && position.rank ? `${ordinal(position.rank)} of ${position.outOf}` : "—"} />
        </div>

        {/* Cognitive */}
        <SectionTitle color={s.primaryColor}>Cognitive — Academic Performance</SectionTitle>
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "10px" }}>
          <thead>
            <tr style={{ background: s.primaryColor, color: s.headerTextColor }}>
              <th style={{ ...th, textAlign: "left", minWidth: "120px" }} rowSpan={2}>Subject</th>
              {displayTerms.map((t) => (
                <th key={t._id} style={th} colSpan={3}>{t.name}</th>
              ))}
              <th style={th} rowSpan={2}>Avg&nbsp;%</th>
              <th style={th} rowSpan={2}>Grade</th>
            </tr>
            <tr style={{ background: s.primaryColor, color: s.headerTextColor }}>
              {displayTerms.map((t) => (
                <FragmentCols key={t._id} />
              ))}
            </tr>
          </thead>
          <tbody>
            {subjectRows.length === 0 ? (
              <tr><td style={td} colSpan={displayTerms.length * 3 + 3}>No results recorded</td></tr>
            ) : (
              subjectRows.map((row, i) => {
                const avg = subjectAverage(row.perTerm);
                const grade = avg != null ? gradeFromScale(scale, avg) : "—";
                return (
                  <tr key={row.subject._id} style={{ background: i % 2 ? s.stripeColor : s.cardBg }}>
                    <td style={{ ...td, textAlign: "left", fontWeight: 600 }}>{row.subject.name}</td>
                    {displayTerms.map((t) => {
                      const e = row.perTerm.get(t._id);
                      return (
                        <FragmentCells
                          key={t._id}
                          ca={e?.ca}
                          exam={e?.exam}
                          total={e?.total}
                          tdStyle={td}
                        />
                      );
                    })}
                    <td style={{ ...td, fontWeight: "bold" }}>{avg != null ? `${avg}%` : "—"}</td>
                    <td style={td}>
                      <span style={{ color: gradeColor(grade), fontWeight: "bold" }}>{grade}</span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {subjectRows.length > 0 && (
            <tfoot>
              <tr style={{ background: "#1e293b", color: "#fff", fontWeight: "bold" }}>
                <td style={{ ...td, textAlign: "left", color: "#fff" }}>Overall / Average</td>
                {displayTerms.map((t) => {
                  const acc = termTotals.get(t._id)!;
                  const cell: React.CSSProperties = { ...td, color: "#fff" };
                  return (
                    <FragmentCells
                      key={t._id}
                      ca={acc.has ? acc.ca : undefined}
                      exam={acc.has ? acc.exam : undefined}
                      total={acc.has ? acc.total : undefined}
                      tdStyle={cell}
                    />
                  );
                })}
                <td style={{ ...td, color: "#fff" }}>
                  {overallAverage != null ? `${overallAverage}%` : "—"}
                </td>
                <td style={td}>
                  <span style={{ color: gradeColor(overallGrade), fontWeight: "bold" }}>{overallGrade}</span>
                </td>
              </tr>
            </tfoot>
          )}
        </table>

        {/* Overall average summary */}
        {overallAverage != null && (
          <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
            <AttBox label="Average Mark" value={`${overallAverage}%`} accent={s.primaryColor} />
            <AttBox label="Overall Grade" value={overallGrade} accent={gradeColor(overallGrade)} />
            <AttBox
              label="Position in Class"
              value={position.outOf > 0 && position.rank ? `${ordinal(position.rank)} of ${position.outOf}` : "—"}
              accent="#f59e0b"
            />
          </div>
        )}

        {/* Affective + Psychomotor side by side */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "10px" }}>
          <DomainTable
            title="Affective — Character & Behaviour"
            color={s.primaryColor}
            headerText={s.headerTextColor}
            stripe={s.stripeColor}
            cardBg={s.cardBg}
            traits={traits.affective}
            terms={displayTerms}
            ratings={ratingByTermTrait}
            th={th}
            td={td}
          />
          <DomainTable
            title="Psychomotor — Practical Skills"
            color={s.primaryColor}
            headerText={s.headerTextColor}
            stripe={s.stripeColor}
            cardBg={s.cardBg}
            traits={traits.psychomotor}
            terms={displayTerms}
            ratings={ratingByTermTrait}
            th={th}
            td={td}
          />
        </div>

        {/* Attendance */}
        <SectionTitle color={s.primaryColor}>Attendance</SectionTitle>
        <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
          <AttBox label="Times School Opened" value={attendance.opened ?? attendance.total} accent={s.primaryColor} />
          <AttBox label="Times Present" value={attendance.present} accent="#10b981" />
          <AttBox label="Times Late" value={attendance.late ?? 0} accent="#f59e0b" />
          <AttBox label="Times Absent" value={attendance.absent ?? Math.max(0, (attendance.total) - attendance.present)} accent="#ef4444" />
          <AttBox label="Attendance %" value={`${attendance.percentage}%`} accent={s.primaryColor} />
        </div>

        {/* Remarks */}
        <SectionTitle color={s.primaryColor}>Form Teacher&apos;s Remarks</SectionTitle>
        <div style={{ marginBottom: "8px" }}>
          {displayTerms.map((t) => (
            <p key={t._id} style={{ margin: "2px 0", fontSize: "10px" }}>
              <strong>{t.name}:</strong>{" "}
              <span style={{ fontStyle: "italic" }}>{remarkByTerm.get(t._id) || "—"}</span>
            </p>
          ))}
        </div>
        <p style={{ margin: "2px 0", fontSize: "10px" }}>
          <strong>Principal&apos;s Comment:</strong>{" "}
          <span style={{ fontStyle: "italic" }}>{principalComment || "—"}</span>
        </p>
        {promotionStatus && (
          <p style={{ margin: "4px 0 0", fontSize: "11px", fontWeight: "bold", color: s.primaryColor }}>
            {PROMOTION_LABEL[promotionStatus] ?? promotionStatus}
          </p>
        )}

        {/* Signatures */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "24px", marginTop: "16px" }}>
          {s.signatureLabels.map((label) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div style={{ borderBottom: "1px solid #1e293b", marginBottom: "3px", paddingBottom: "22px" }} />
              <p style={{ margin: 0, fontSize: "9px", color: "#64748b", textTransform: "uppercase" }}>{label}</p>
            </div>
          ))}
        </div>

        <p style={{ marginTop: "8px", fontSize: "8px", color: "#94a3b8", textAlign: "center" }}>
          {s.footerNote || `Generated by ${institute?.name ?? "the school"} on ${generatedDate}.`}
        </p>
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function FragmentCols() {
  const c: React.CSSProperties = {
    padding: "2px 4px", fontSize: "8px", fontWeight: "bold",
    border: "1px solid #cbd5e1", textAlign: "center",
  };
  return (
    <>
      <th style={c}>CA</th>
      <th style={c}>Exam</th>
      <th style={c}>Total</th>
    </>
  );
}

function FragmentCells({
  ca, exam, total, tdStyle,
}: {
  ca?: number;
  exam?: number;
  total?: number;
  tdStyle: React.CSSProperties;
}) {
  return (
    <>
      <td style={tdStyle}>{ca ?? "—"}</td>
      <td style={tdStyle}>{exam ?? "—"}</td>
      <td style={{ ...tdStyle, fontWeight: 600 }}>{total ?? "—"}</td>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: "4px" }}>
      <span style={{ color: "#94a3b8", textTransform: "uppercase", fontSize: "8px", fontWeight: "bold", whiteSpace: "nowrap", paddingTop: "1px" }}>
        {label}:
      </span>
      <span style={{ fontWeight: 600, borderBottom: "1px dotted #cbd5e1", flex: 1 }}>{value}</span>
    </div>
  );
}

function SectionTitle({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <h3 style={{ margin: "0 0 4px", fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px", color }}>
      {children}
    </h3>
  );
}

function AttBox({ label, value, accent }: { label: string; value: number | string; accent: string }) {
  return (
    <div style={{ flex: 1, border: `1.5px solid ${accent}40`, background: `${accent}08`, borderRadius: 6, padding: "6px 8px", textAlign: "center" }}>
      <p style={{ margin: 0, fontSize: "8px", color: "#64748b", textTransform: "uppercase" }}>{label}</p>
      <p style={{ margin: "2px 0 0", fontSize: "15px", fontWeight: "bold", color: accent }}>{value}</p>
    </div>
  );
}

function DomainTable({
  title, color, headerText, stripe, cardBg, traits, terms, ratings, th, td,
}: {
  title: string;
  color: string;
  headerText: string;
  stripe: string;
  cardBg: string;
  traits: RatingTrait[];
  terms: ReportCardTerm[];
  ratings: Map<string, Map<string, number>>;
  th: React.CSSProperties;
  td: React.CSSProperties;
}) {
  return (
    <div>
      <SectionTitle color={color}>{title}</SectionTitle>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: color, color: headerText }}>
            <th style={{ ...th, textAlign: "left" }}>Trait</th>
            {terms.map((t) => (
              <th key={t._id} style={th}>{t.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {traits.length === 0 ? (
            <tr><td style={td} colSpan={terms.length + 1}>No traits configured</td></tr>
          ) : (
            traits.map((trait, i) => (
              <tr key={trait._id} style={{ background: i % 2 ? stripe : cardBg }}>
                <td style={{ ...td, textAlign: "left" }}>{trait.name}</td>
                {terms.map((t) => {
                  const rating = ratings.get(t._id)?.get(trait._id);
                  return <td key={t._id} style={td}>{rating ?? "—"}</td>;
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
