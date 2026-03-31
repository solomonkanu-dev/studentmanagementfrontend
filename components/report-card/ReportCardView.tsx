"use client";

import type { ReportCardData } from "@/lib/api/student";
import { Building2 } from "lucide-react";

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function gradeColor(grade?: string) {
  if (!grade) return "#64748b";
  if (grade === "A") return "#10b981";
  if (grade === "B") return "#3b82f6";
  if (grade === "C") return "#f59e0b";
  if (grade === "D") return "#f97316";
  return "#ef4444";
}

interface Props {
  data: ReportCardData;
}

export function ReportCardView({ data }: Props) {
  const { student, institute, results, attendance, position } = data;

  const totalMarksObtained = results.reduce((s, r) => s + (r.marksObtained ?? 0), 0);
  const totalMaxMarks = results.reduce(
    (s, r) => s + ((r.subject as { totalMarks?: number } | null)?.totalMarks ?? 100),
    0
  );
  const overallPercentage = totalMaxMarks > 0 ? Math.round((totalMarksObtained / totalMaxMarks) * 100) : 0;
  const overallGrade =
    overallPercentage >= 70 ? "A" :
    overallPercentage >= 60 ? "B" :
    overallPercentage >= 50 ? "C" :
    overallPercentage >= 40 ? "D" : "F";

  const className =
    (typeof student.class === "object" ? student.class?.name : student.class) ?? "—";
  const registrationNumber = student.studentProfile?.registrationNumber ?? "—";
  const generatedDate = new Date(data.generatedAt).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div
      id="report-card"
      style={{
        width: "210mm",
        minHeight: "297mm",
        margin: "0 auto",
        background: "#fff",
        color: "#1e293b",
        fontFamily: "'Arial', sans-serif",
        fontSize: "12px",
        padding: "12mm 14mm",
        boxSizing: "border-box",
      }}
    >
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px", borderBottom: "3px solid #3c50e0", paddingBottom: "12px", marginBottom: "16px" }}>
        <div style={{ flexShrink: 0 }}>
          {institute?.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={institute.logo} alt="Logo" style={{ width: 64, height: 64, objectFit: "contain", borderRadius: 8 }} />
          ) : (
            <div style={{ width: 64, height: 64, background: "#eff1ff", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Building2 style={{ width: 32, height: 32, color: "#3c50e0" }} />
            </div>
          )}
        </div>
        <div style={{ flex: 1, textAlign: "center" }}>
          <h1 style={{ margin: 0, fontSize: "20px", fontWeight: "bold", color: "#1e293b", textTransform: "uppercase", letterSpacing: "1px" }}>
            {institute?.name ?? "School Name"}
          </h1>
          {institute?.targetLine && (
            <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#64748b", fontStyle: "italic" }}>
              {institute.targetLine}
            </p>
          )}
          {institute?.address && (
            <p style={{ margin: "2px 0 0", fontSize: "10px", color: "#64748b" }}>
              {[institute.address, institute.country].filter(Boolean).join(", ")}
              {institute.phoneNumber ? ` · ${institute.phoneNumber}` : ""}
            </p>
          )}
        </div>
        <div style={{ flexShrink: 0, textAlign: "right" }}>
          <div style={{ background: "#3c50e0", color: "#fff", padding: "4px 10px", borderRadius: 4, fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Report Card
          </div>
          <p style={{ margin: "6px 0 0", fontSize: "10px", color: "#64748b" }}>
            {generatedDate}
          </p>
        </div>
      </div>

      {/* ── Student Info ── */}
      <div style={{ display: "flex", gap: "16px", marginBottom: "16px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "12px" }}>
        <div style={{ flexShrink: 0 }}>
          {student.profilePhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={student.profilePhoto} alt={student.fullName} style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 8, border: "2px solid #e2e8f0" }} />
          ) : (
            <div style={{ width: 72, height: 72, background: "#3c50e0", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px", fontWeight: "bold", color: "#fff", textTransform: "uppercase" }}>
              {student.fullName?.charAt(0) ?? "?"}
            </div>
          )}
        </div>
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px 16px" }}>
          <InfoRow label="Full Name" value={student.fullName} />
          <InfoRow label="Class" value={className} />
          <InfoRow label="Reg. Number" value={registrationNumber} />
          <InfoRow label="Gender" value={student.studentProfile?.gender ?? "—"} />
          <InfoRow label="Email" value={student.email} />
          <InfoRow label="Academic Year" value={new Date().getFullYear().toString()} />
        </div>
      </div>

      {/* ── Results Table ── */}
      <h3 style={{ margin: "0 0 8px", fontSize: "12px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px", color: "#3c50e0" }}>
        Academic Results
      </h3>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "16px", fontSize: "11px" }}>
        <thead>
          <tr style={{ background: "#3c50e0", color: "#fff" }}>
            <th style={thStyle}>Subject</th>
            <th style={thStyle}>Code</th>
            <th style={{ ...thStyle, textAlign: "center" }}>Marks Obtained</th>
            <th style={{ ...thStyle, textAlign: "center" }}>Total Marks</th>
            <th style={{ ...thStyle, textAlign: "center" }}>Percentage</th>
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
              const subj = r.subject as { name?: string; code?: string; totalMarks?: number } | null;
              const totalMarks = subj?.totalMarks ?? 100;
              const pct = Math.round((r.marksObtained / totalMarks) * 100);
              return (
                <tr key={r._id} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                  <td style={tdStyle}>{subj?.name ?? "—"}</td>
                  <td style={tdStyle}>{subj?.code ?? "—"}</td>
                  <td style={{ ...tdStyle, textAlign: "center", fontWeight: "bold" }}>{r.marksObtained}</td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>{totalMarks}</td>
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
            <td style={{ ...tdStyle, textAlign: "center", color: "#fff" }}>{overallPercentage}%</td>
            <td style={{ ...tdStyle, textAlign: "center" }}>
              <span style={{ background: gradeColor(overallGrade) + "44", color: gradeColor(overallGrade), fontWeight: "bold", padding: "2px 8px", borderRadius: 4 }}>
                {overallGrade}
              </span>
            </td>
          </tr>
        </tfoot>
      </table>

      {/* ── Summary Row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "10px", marginBottom: "20px" }}>
        <SummaryBox label="Overall Score" value={`${totalMarksObtained} / ${totalMaxMarks}`} accent="#3c50e0" />
        <SummaryBox label="Overall Percentage" value={`${overallPercentage}%`} accent="#3c50e0" />
        <SummaryBox label="Attendance" value={`${attendance.percentage}%`} sub={`${attendance.present} / ${attendance.total} days`} accent={attendance.percentage >= 75 ? "#10b981" : "#ef4444"} />
        <SummaryBox label="Class Position" value={position.outOf > 0 ? ordinal(position.rank) : "—"} sub={position.outOf > 0 ? `out of ${position.outOf} students` : ""} accent="#f59e0b" />
      </div>

      {/* ── Signature Footer ── */}
      <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "16px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "24px", marginTop: "8px" }}>
        {["Class Teacher", "Head of Academics", "Principal / Director"].map((title) => (
          <div key={title} style={{ textAlign: "center" }}>
            <div style={{ borderBottom: "1px solid #1e293b", marginBottom: "4px", paddingBottom: "28px" }} />
            <p style={{ margin: 0, fontSize: "10px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              {title}
            </p>
          </div>
        ))}
      </div>

      {/* ── Tiny footer ── */}
      <p style={{ marginTop: "12px", fontSize: "9px", color: "#94a3b8", textAlign: "center" }}>
        This is an official document generated by {institute?.name ?? "the school"}. Generated on {generatedDate}.
      </p>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
