"use client";

import type { ReportCardData, ReportCardTerm } from "@/lib/api/student";
import { Building2 } from "lucide-react";

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function gradeColor(grade?: string) {
  if (!grade) return "#64748b";
  const g = grade.toUpperCase();
  if (g === "A" || g === "A+") return "#10b981";
  if (g === "B") return "#3b82f6";
  if (g === "C") return "#f59e0b";
  if (g === "D") return "#f97316";
  return "#ef4444";
}

function pctGrade(pct: number): string {
  if (pct >= 70) return "A";
  if (pct >= 60) return "B";
  if (pct >= 50) return "C";
  if (pct >= 40) return "D";
  return "F";
}

export interface ReportCardStyle {
  primaryColor: string;
  headerTextColor: string;
  stripeColor: string;
  cardBg: string;
  reportTitle: string;
  showPhoto: boolean;
  showAttendance: boolean;
  showPosition: boolean;
  showTermBreakdown: boolean;
  signatureLabels: [string, string, string];
  footerNote: string;
}

export const DEFAULT_REPORT_STYLE: ReportCardStyle = {
  primaryColor: "#3c50e0",
  headerTextColor: "#ffffff",
  stripeColor: "#f8fafc",
  cardBg: "#ffffff",
  reportTitle: "Report Card",
  showPhoto: true,
  showAttendance: true,
  showPosition: true,
  showTermBreakdown: true,
  signatureLabels: ["Class Teacher", "Head of Academics", "Principal / Director"],
  footerNote: "",
};

interface Props {
  data: ReportCardData;
  style?: Partial<ReportCardStyle>;
}

export function ReportCardView({ data, style: styleProp }: Props) {
  const s: ReportCardStyle = { ...DEFAULT_REPORT_STYLE, ...styleProp };
  const { student, institute, terms, results, attendance, position } = data;

  // Group results by subject
  const subjectMap = new Map<
    string,
    {
      subject: NonNullable<(typeof results)[number]["subject"]>;
      termMarks: Map<string, { marksObtained: number; totalScore: number; grade?: string }>;
    }
  >();

  results.forEach((r) => {
    if (!r.subject) return;
    const subjectId = r.subject._id;
    if (!subjectMap.has(subjectId)) {
      subjectMap.set(subjectId, { subject: r.subject, termMarks: new Map() });
    }
    const termKey = r.term?._id ?? "__no_term__";
    subjectMap.get(subjectId)!.termMarks.set(termKey, {
      marksObtained: r.marksObtained,
      totalScore: r.totalScore,
      grade: r.grade,
    });
  });

  const subjectRows = Array.from(subjectMap.values());

  const allConfiguredTerms: ReportCardTerm[] = terms.length > 0
    ? terms
    : Array.from(
        new Map(
          results
            .filter((r) => r.term)
            .map((r) => [r.term!._id, r.term!])
        ).values()
      );

  const termsWithResults = allConfiguredTerms.filter((t) =>
    subjectRows.some((row) => row.termMarks.has(t._id))
  );

  const displayTerms = termsWithResults;
  const hasTerms = displayTerms.length > 0;

  const showAnnualAvg = allConfiguredTerms.length > 0 && termsWithResults.length === allConfiguredTerms.length;

  function annualAvg(termMarks: Map<string, { marksObtained: number; totalScore: number }>): number | null {
    const entries = Array.from(termMarks.values());
    if (entries.length === 0) return null;
    const totalPct = entries.reduce((sum, e) => sum + Math.round((e.marksObtained / e.totalScore) * 100), 0);
    return Math.round(totalPct / entries.length);
  }

  const allSubjectAvgs = subjectRows
    .map((r) => annualAvg(r.termMarks))
    .filter((v): v is number => v !== null);
  const overallAnnualPct = allSubjectAvgs.length > 0
    ? Math.round(allSubjectAvgs.reduce((a, b) => a + b, 0) / allSubjectAvgs.length)
    : 0;
  const overallAnnualGrade = pctGrade(overallAnnualPct);

  const totalMarksObtained = results.reduce((sum, r) => sum + (r.marksObtained ?? 0), 0);
  const totalMaxMarks = results.reduce((sum, r) => sum + (r.totalScore ?? 100), 0);
  const overallPct = totalMaxMarks > 0 ? Math.round((totalMarksObtained / totalMaxMarks) * 100) : 0;

  const classObj = typeof student.class === "object" ? student.class : null;
  const className = classObj?.name ?? (typeof student.class === "string" ? student.class : "—");
  const classTeacher = classObj && "lecturer" in classObj && classObj.lecturer
    ? (classObj.lecturer as { fullName: string }).fullName
    : "—";
  const registrationNumber = student.studentProfile?.registrationNumber ?? "—";
  const generatedDate = new Date(data.generatedAt).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  const thStyle: React.CSSProperties = {
    padding: "7px 10px",
    textAlign: "left",
    fontWeight: "bold",
    fontSize: "10px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  };

  const tdStyle: React.CSSProperties = {
    padding: "7px 10px",
    borderBottom: "1px solid #e2e8f0",
  };

  return (
    <div
      id="report-card"
      style={{
        width: "210mm",
        minHeight: "297mm",
        margin: "0 auto",
        background: s.cardBg,
        color: "#1e293b",
        fontFamily: "'Arial', sans-serif",
        fontSize: "12px",
        padding: "12mm 14mm",
        boxSizing: "border-box",
      }}
    >
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px", borderBottom: `3px solid ${s.primaryColor}`, paddingBottom: "12px", marginBottom: "16px" }}>
        <div style={{ flexShrink: 0 }}>
          {institute?.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={institute.logo} alt="Logo" style={{ width: 64, height: 64, objectFit: "contain", borderRadius: 8 }} />
          ) : (
            <div style={{ width: 64, height: 64, background: s.primaryColor + "22", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Building2 style={{ width: 32, height: 32, color: s.primaryColor }} />
            </div>
          )}
        </div>
        <div style={{ flex: 1, textAlign: "center" }}>
          <h1 style={{ margin: 0, fontSize: "20px", fontWeight: "bold", color: "#1e293b", textTransform: "uppercase", letterSpacing: "1px" }}>
            {institute?.name ?? "School Name"}
          </h1>
          {institute?.targetLine && (
            <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#64748b", fontStyle: "italic" }}>{institute.targetLine}</p>
          )}
          {institute?.address && (
            <p style={{ margin: "2px 0 0", fontSize: "10px", color: "#64748b" }}>
              {[institute.address, institute.country].filter(Boolean).join(", ")}
              {institute.phoneNumber ? ` · ${institute.phoneNumber}` : ""}
            </p>
          )}
        </div>
        <div style={{ flexShrink: 0, textAlign: "right" }}>
          <div style={{ background: s.primaryColor, color: s.headerTextColor, padding: "4px 10px", borderRadius: 4, fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            {s.reportTitle}
          </div>
          <p style={{ margin: "6px 0 0", fontSize: "10px", color: "#64748b" }}>{generatedDate}</p>
        </div>
      </div>

      {/* ── Student Info ── */}
      <div style={{ display: "flex", gap: "16px", marginBottom: "16px", background: s.stripeColor, border: "1px solid #e2e8f0", borderRadius: 8, padding: "12px" }}>
        {s.showPhoto && (
          <div style={{ flexShrink: 0 }}>
            {student.profilePhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={student.profilePhoto} alt={student.fullName} style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 8, border: "2px solid #e2e8f0" }} />
            ) : (
              <div style={{ width: 72, height: 72, background: s.primaryColor, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px", fontWeight: "bold", color: s.headerTextColor, textTransform: "uppercase" }}>
                {student.fullName?.charAt(0) ?? "?"}
              </div>
            )}
          </div>
        )}
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px 16px" }}>
          <InfoRow label="Full Name" value={student.fullName} />
          <InfoRow label="Class" value={className} />
          <InfoRow label="Reg. Number" value={registrationNumber} />
          <InfoRow label="Gender" value={student.studentProfile?.gender ?? "—"} />
          <InfoRow label="Class Teacher" value={classTeacher} />
          <InfoRow label="Academic Year" value={displayTerms[0]?.academicYear ?? new Date().getFullYear().toString()} />
        </div>
      </div>

      {/* ── Results Table (term columns) ── */}
      <h3 style={{ margin: "0 0 8px", fontSize: "12px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px", color: s.primaryColor }}>
        Academic Results {hasTerms && `— ${displayTerms[0]?.academicYear ?? ""}`}
      </h3>

      {hasTerms ? (
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "16px", fontSize: "11px" }}>
          <thead>
            <tr style={{ background: s.primaryColor, color: s.headerTextColor }}>
              <th style={thStyle}>Subject</th>
              {displayTerms.map((t) => (
                <th key={t._id} style={{ ...thStyle, textAlign: "center", whiteSpace: "nowrap" }}>{t.name}</th>
              ))}
              {showAnnualAvg && (
                <th style={{ ...thStyle, textAlign: "center", whiteSpace: "nowrap" }}>Annual Avg</th>
              )}
              <th style={{ ...thStyle, textAlign: "center" }}>Grade</th>
            </tr>
          </thead>
          <tbody>
            {subjectRows.length === 0 ? (
              <tr>
                <td colSpan={displayTerms.length + 3} style={{ ...tdStyle, textAlign: "center", color: "#94a3b8", padding: "20px" }}>
                  No results recorded
                </td>
              </tr>
            ) : (
              subjectRows.map((row, i) => {
                const avg = annualAvg(row.termMarks);
                const annualGrade = avg !== null ? pctGrade(avg) : null;
                return (
                  <tr key={row.subject._id} style={{ background: i % 2 === 0 ? s.cardBg : s.stripeColor }}>
                    <td style={tdStyle}>
                      <span style={{ fontWeight: 600 }}>{row.subject.name}</span>
                      {row.subject.code && <span style={{ marginLeft: 4, color: "#94a3b8", fontSize: "10px" }}>({row.subject.code})</span>}
                    </td>
                    {displayTerms.map((t) => {
                      const entry = row.termMarks.get(t._id);
                      if (!entry) {
                        return <td key={t._id} style={{ ...tdStyle, textAlign: "center", color: "#94a3b8" }}>—</td>;
                      }
                      const pct = Math.round((entry.marksObtained / entry.totalScore) * 100);
                      return (
                        <td key={t._id} style={{ ...tdStyle, textAlign: "center" }}>
                          <span style={{ fontWeight: 600 }}>{entry.marksObtained}</span>
                          <span style={{ color: "#94a3b8", fontSize: "10px" }}>/{entry.totalScore}</span>
                          <br />
                          <span style={{ fontSize: "10px", color: "#64748b" }}>{pct}%</span>
                        </td>
                      );
                    })}
                    {showAnnualAvg && (
                      <td style={{ ...tdStyle, textAlign: "center", fontWeight: "bold" }}>
                        {avg !== null ? `${avg}%` : "—"}
                      </td>
                    )}
                    <td style={{ ...tdStyle, textAlign: "center" }}>
                      {showAnnualAvg ? (
                        annualGrade ? (
                          <span style={{ background: gradeColor(annualGrade) + "22", color: gradeColor(annualGrade), fontWeight: "bold", padding: "2px 8px", borderRadius: 4 }}>
                            {annualGrade}
                          </span>
                        ) : "—"
                      ) : (
                        (() => {
                          const latestEntry = displayTerms.slice().reverse()
                            .map((t) => row.termMarks.get(t._id))
                            .find(Boolean);
                          return latestEntry?.grade ? (
                            <span style={{ background: gradeColor(latestEntry.grade) + "22", color: gradeColor(latestEntry.grade), fontWeight: "bold", padding: "2px 8px", borderRadius: 4 }}>
                              {latestEntry.grade}
                            </span>
                          ) : "—";
                        })()
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          <tfoot>
            <tr style={{ background: "#1e293b", color: "#fff", fontWeight: "bold" }}>
              <td style={{ ...tdStyle, color: "#fff" }}>OVERALL</td>
              {displayTerms.map((t) => {
                const termResults = results.filter((r) => r.term?._id === t._id);
                if (termResults.length === 0) {
                  return <td key={t._id} style={{ ...tdStyle, textAlign: "center", color: "#9ca3af" }}>—</td>;
                }
                const obtained = termResults.reduce((sum, r) => sum + r.marksObtained, 0);
                const possible = termResults.reduce((sum, r) => sum + r.totalScore, 0);
                const pct = possible > 0 ? Math.round((obtained / possible) * 100) : 0;
                return (
                  <td key={t._id} style={{ ...tdStyle, textAlign: "center", color: "#fff" }}>
                    {obtained}/{possible}<br />
                    <span style={{ fontSize: "10px" }}>{pct}%</span>
                  </td>
                );
              })}
              {showAnnualAvg && (
                <td style={{ ...tdStyle, textAlign: "center", color: "#fff" }}>{overallAnnualPct}%</td>
              )}
              <td style={{ ...tdStyle, textAlign: "center" }}>
                <span style={{ background: gradeColor(overallAnnualGrade) + "44", color: gradeColor(overallAnnualGrade), fontWeight: "bold", padding: "2px 8px", borderRadius: 4 }}>
                  {overallAnnualGrade}
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "16px", fontSize: "11px" }}>
          <thead>
            <tr style={{ background: s.primaryColor, color: s.headerTextColor }}>
              <th style={thStyle}>Subject</th>
              <th style={thStyle}>Code</th>
              <th style={{ ...thStyle, textAlign: "center" }}>Marks</th>
              <th style={{ ...thStyle, textAlign: "center" }}>Total</th>
              <th style={{ ...thStyle, textAlign: "center" }}>%</th>
              <th style={{ ...thStyle, textAlign: "center" }}>Grade</th>
            </tr>
          </thead>
          <tbody>
            {results.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ ...tdStyle, textAlign: "center", color: "#94a3b8", padding: "20px" }}>
                  No results recorded
                </td>
              </tr>
            ) : (
              results.map((r, i) => {
                const subj = r.subject;
                const total = r.totalScore ?? 100;
                const pct = Math.round((r.marksObtained / total) * 100);
                return (
                  <tr key={r._id} style={{ background: i % 2 === 0 ? s.cardBg : s.stripeColor }}>
                    <td style={tdStyle}>{subj?.name ?? "—"}</td>
                    <td style={tdStyle}>{subj?.code ?? "—"}</td>
                    <td style={{ ...tdStyle, textAlign: "center", fontWeight: "bold" }}>{r.marksObtained}</td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>{total}</td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>{pct}%</td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>
                      <span style={{ background: gradeColor(r.grade) + "22", color: gradeColor(r.grade), fontWeight: "bold", padding: "2px 8px", borderRadius: 4 }}>
                        {r.grade ?? "—"}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          <tfoot>
            <tr style={{ background: "#1e293b", color: "#fff", fontWeight: "bold" }}>
              <td colSpan={2} style={{ ...tdStyle, color: "#fff" }}>TOTAL</td>
              <td style={{ ...tdStyle, textAlign: "center", color: "#fff" }}>{totalMarksObtained}</td>
              <td style={{ ...tdStyle, textAlign: "center", color: "#fff" }}>{totalMaxMarks}</td>
              <td style={{ ...tdStyle, textAlign: "center", color: "#fff" }}>{overallPct}%</td>
              <td style={{ ...tdStyle, textAlign: "center" }}>
                <span style={{ background: gradeColor(overallAnnualGrade) + "44", color: gradeColor(overallAnnualGrade), fontWeight: "bold", padding: "2px 8px", borderRadius: 4 }}>
                  {overallAnnualGrade}
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      )}

      {/* ── Summary Row ── */}
      <div style={{ display: "grid", gridTemplateColumns: s.showPosition && s.showAttendance ? "1fr 1fr 1fr 1fr" : s.showAttendance || s.showPosition ? "1fr 1fr 1fr" : "1fr 1fr", gap: "10px", marginBottom: "20px" }}>
        <SummaryBox
          label={showAnnualAvg ? "Annual Average" : `${displayTerms[displayTerms.length - 1]?.name ?? "Term"} Score`}
          value={`${overallAnnualPct}%`}
          sub={showAnnualAvg ? `across ${allConfiguredTerms.length} terms` : undefined}
          accent={s.primaryColor}
        />
        <SummaryBox
          label="Total Score"
          value={`${totalMarksObtained} / ${totalMaxMarks}`}
          accent={s.primaryColor}
        />
        {s.showAttendance && (
          <SummaryBox
            label="Attendance"
            value={`${attendance.percentage}%`}
            sub={`${attendance.present} / ${attendance.total} days`}
            accent={attendance.percentage >= 75 ? "#10b981" : "#ef4444"}
          />
        )}
        {s.showPosition && (
          <SummaryBox
            label="Class Position"
            value={position.outOf > 0 ? ordinal(position.rank) : "—"}
            sub={position.outOf > 0 ? `out of ${position.outOf} students` : ""}
            accent="#f59e0b"
          />
        )}
      </div>

      {/* ── Term breakdown legend ── */}
      {s.showTermBreakdown && hasTerms && displayTerms.length > 1 && (
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
          {displayTerms.map((t, i) => {
            const termResults = results.filter((r) => r.term?._id === t._id);
            const obtained = termResults.reduce((sum, r) => sum + r.marksObtained, 0);
            const possible = termResults.reduce((sum, r) => sum + r.totalScore, 0);
            const pct = possible > 0 ? Math.round((obtained / possible) * 100) : null;
            const colors = [s.primaryColor, "#10b981", "#f59e0b"];
            const accent = colors[i % colors.length];
            return (
              <div key={t._id} style={{ border: `1.5px solid ${accent}40`, borderRadius: 6, padding: "6px 12px", background: `${accent}08`, minWidth: 100, textAlign: "center" }}>
                <p style={{ margin: 0, fontSize: "9px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.4px" }}>{t.name}</p>
                <p style={{ margin: "2px 0 0", fontSize: "14px", fontWeight: "bold", color: accent }}>
                  {pct !== null ? `${pct}%` : "—"}
                </p>
              </div>
            );
          })}
          {showAnnualAvg && (
            <div style={{ border: "1.5px solid #8b5cf640", borderRadius: 6, padding: "6px 12px", background: "#8b5cf608", minWidth: 100, textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: "9px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.4px" }}>Annual Avg</p>
              <p style={{ margin: "2px 0 0", fontSize: "14px", fontWeight: "bold", color: "#8b5cf6" }}>{overallAnnualPct}%</p>
            </div>
          )}
        </div>
      )}

      {/* ── Signature Footer ── */}
      <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "16px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "24px", marginTop: "8px" }}>
        {s.signatureLabels.map((title) => (
          <div key={title} style={{ textAlign: "center" }}>
            <div style={{ borderBottom: "1px solid #1e293b", marginBottom: "4px", paddingBottom: "28px" }} />
            <p style={{ margin: 0, fontSize: "10px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              {title}
            </p>
          </div>
        ))}
      </div>

      {/* ── Footer ── */}
      <p style={{ marginTop: "12px", fontSize: "9px", color: "#94a3b8", textAlign: "center" }}>
        {s.footerNote
          ? s.footerNote
          : `This is an official document generated by ${institute?.name ?? "the school"}. Generated on ${generatedDate}.`}
      </p>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p style={{ margin: 0, fontSize: "9px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.4px" }}>{label}</p>
      <p style={{ margin: "1px 0 0", fontSize: "11px", fontWeight: "600", color: "#1e293b" }}>{value}</p>
    </div>
  );
}

function SummaryBox({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent: string }) {
  return (
    <div style={{ border: `1.5px solid ${accent}30`, borderRadius: 8, padding: "10px 12px", background: `${accent}08`, textAlign: "center" }}>
      <p style={{ margin: 0, fontSize: "9px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.4px" }}>{label}</p>
      <p style={{ margin: "4px 0 0", fontSize: "18px", fontWeight: "bold", color: accent }}>{value}</p>
      {sub && <p style={{ margin: "2px 0 0", fontSize: "9px", color: "#94a3b8" }}>{sub}</p>}
    </div>
  );
}
