"use client";

import type { FullReceiptData } from "@/lib/api/student";
import type { AuthUser } from "@/lib/types";
import { Building2 } from "lucide-react";

interface Props {
  data: FullReceiptData;
  student: AuthUser | null;
}

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  bank_transfer: "Bank Transfer",
  card: "Card",
  mobile_money: "Mobile Money",
  cheque: "Cheque",
};

export function FullReceiptView({ data, student }: Props) {
  const { payments, institute, studentFee } = data;

  if (!payments.length || !student) return null;

  const className =
    student.class && typeof student.class === "object" ? student.class.name : "—";
  const regNo = student.studentProfile?.registrationNumber ?? "—";
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalAmount = studentFee?.totalAmount ?? totalPaid;
  const generatedDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div
      id="full-receipt"
      style={{
        width: "210mm",
        minHeight: "297mm",
        margin: "0 auto",
        background: "#fff",
        color: "#1e293b",
        fontFamily: "'Arial', sans-serif",
        fontSize: "11px",
        padding: "14mm 16mm",
        boxSizing: "border-box",
      }}
    >
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", borderBottom: "2px solid #3c50e0", paddingBottom: "10px", marginBottom: "14px" }}>
        <div style={{ flexShrink: 0 }}>
          {institute?.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={institute.logo} alt="Logo" style={{ width: 52, height: 52, objectFit: "contain", borderRadius: 6 }} />
          ) : (
            <div style={{ width: 52, height: 52, background: "#eff1ff", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Building2 style={{ width: 26, height: 26, color: "#3c50e0" }} />
            </div>
          )}
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: "18px", fontWeight: "bold", color: "#1e293b", textTransform: "uppercase" }}>
            {institute?.name ?? "School Name"}
          </h1>
          {institute?.address && (
            <p style={{ margin: "2px 0 0", fontSize: "9px", color: "#64748b" }}>
              {[institute.address, institute.country].filter(Boolean).join(", ")}
            </p>
          )}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ background: "#3c50e0", color: "#fff", padding: "4px 10px", borderRadius: 4, fontSize: "9px", fontWeight: "bold", textTransform: "uppercase" }}>
            Full Payment Receipt
          </div>
          <p style={{ margin: "4px 0 0", fontSize: "9px", color: "#64748b" }}>Generated: {generatedDate}</p>
        </div>
      </div>

      {/* ── Student info ── */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "14px", border: "1px solid #e2e8f0", borderRadius: 6, padding: "10px 12px" }}>
        <div style={{ flexShrink: 0 }}>
          {student.profilePhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={student.profilePhoto} alt={student.fullName} style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 6, border: "1.5px solid #e2e8f0" }} />
          ) : (
            <div style={{ width: 56, height: 56, background: "#3c50e0", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", fontWeight: "bold", color: "#fff", textTransform: "uppercase" }}>
              {student.fullName?.charAt(0) ?? "?"}
            </div>
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 16px", flex: 1, fontSize: "10px" }}>
          <MetaRow label="Student Name" value={student.fullName} />
          <MetaRow label="Class" value={className} />
          <MetaRow label="Reg. Number" value={regNo} />
          <MetaRow label="Email" value={student.email} />
        </div>
      </div>

      {/* ── PAID IN FULL banner ── */}
      <div style={{ background: "#10b981", color: "#fff", borderRadius: 8, padding: "14px 16px", marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ margin: 0, fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.5px", opacity: 0.85 }}>Total Amount Paid</p>
          <p style={{ margin: "4px 0 0", fontSize: "30px", fontWeight: "bold", fontFamily: "monospace", letterSpacing: "-0.5px" }}>
            {totalPaid.toLocaleString()}
          </p>
        </div>
        <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: 6, padding: "6px 14px", fontSize: "13px", fontWeight: "bold", letterSpacing: "2px", textTransform: "uppercase" }}>
          PAID IN FULL
        </div>
      </div>

      {/* ── Installments table ── */}
      <h3 style={{ margin: "0 0 6px", fontSize: "9px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px", color: "#64748b" }}>
        Payment Installments
      </h3>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "16px", fontSize: "10px" }}>
        <thead>
          <tr style={{ background: "#f1f5f9" }}>
            <th style={thStyle}>#</th>
            <th style={thStyle}>Receipt No.</th>
            <th style={thStyle}>Date</th>
            <th style={thStyle}>Method</th>
            <th style={{ ...thStyle, textAlign: "right" }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((p, i) => (
            <tr key={p._id} style={{ borderBottom: "1px solid #f1f5f9" }}>
              <td style={tdStyle}>{i + 1}</td>
              <td style={{ ...tdStyle, fontFamily: "monospace" }}>{p.receiptNumber}</td>
              <td style={tdStyle}>
                {new Date(p.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
              </td>
              <td style={tdStyle}>{METHOD_LABELS[p.method] ?? p.method}</td>
              <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600, color: "#10b981" }}>
                {p.amount.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ fontWeight: "bold", borderTop: "1.5px solid #e2e8f0", background: "#f8fafc" }}>
            <td colSpan={4} style={{ padding: "6px 8px" }}>TOTAL PAID</td>
            <td style={{ padding: "6px 8px", textAlign: "right", color: "#10b981", fontFamily: "monospace" }}>
              {totalPaid.toLocaleString()}
            </td>
          </tr>
        </tfoot>
      </table>

      {/* ── Fee account summary ── */}
      {studentFee && studentFee.fees.length > 0 && (
        <>
          <h3 style={{ margin: "0 0 6px", fontSize: "9px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px", color: "#64748b" }}>
            Fee Account Summary
          </h3>
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "16px", fontSize: "10px" }}>
            <thead>
              <tr style={{ background: "#f1f5f9" }}>
                <th style={thStyle}>Fee Item</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Billed</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Paid</th>
              </tr>
            </thead>
            <tbody>
              {studentFee.fees.map((item, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={tdStyle}>{item.label ?? "Fee Item"}</td>
                  <td style={{ ...tdStyle, textAlign: "right", fontFamily: "monospace" }}>{item.amount.toLocaleString()}</td>
                  <td style={{ ...tdStyle, textAlign: "right", fontFamily: "monospace", color: "#10b981", fontWeight: 600 }}>
                    {(item.paid ?? 0).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ fontWeight: "bold", borderTop: "1.5px solid #e2e8f0" }}>
                <td style={{ padding: "6px 8px" }}>TOTAL</td>
                <td style={{ padding: "6px 8px", textAlign: "right", fontFamily: "monospace" }}>{totalAmount.toLocaleString()}</td>
                <td style={{ padding: "6px 8px", textAlign: "right", fontFamily: "monospace", color: "#10b981" }}>{totalPaid.toLocaleString()}</td>
              </tr>
              <tr style={{ background: "#f0fdf4" }}>
                <td colSpan={2} style={{ padding: "6px 8px", fontWeight: "bold", color: "#10b981" }}>Outstanding Balance</td>
                <td style={{ padding: "6px 8px", textAlign: "right", fontFamily: "monospace", fontWeight: "bold", color: "#10b981" }}>0</td>
              </tr>
            </tfoot>
          </table>
        </>
      )}

      {/* ── Signature block ── */}
      <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "12px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginTop: "8px" }}>
        {["Cashier / Admin", "Student / Guardian"].map((title) => (
          <div key={title} style={{ textAlign: "center" }}>
            <div style={{ borderBottom: "1px solid #1e293b", marginBottom: "4px", paddingBottom: "24px" }} />
            <p style={{ margin: 0, fontSize: "9px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>{title}</p>
          </div>
        ))}
      </div>

      <p style={{ marginTop: "10px", fontSize: "8px", color: "#94a3b8", textAlign: "center" }}>
        This is an official full payment receipt issued by {institute?.name ?? "the school"}. All installments have been received and fees are settled in full. Please keep this for your records.
      </p>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "5px 8px",
  textAlign: "left",
  fontWeight: "bold",
  color: "#64748b",
  fontSize: "9px",
  textTransform: "uppercase",
};

const tdStyle: React.CSSProperties = {
  padding: "5px 8px",
};

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span style={{ color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.3px", fontSize: "8px" }}>{label}: </span>
      <span style={{ fontWeight: 600, color: "#1e293b" }}>{value}</span>
    </div>
  );
}
