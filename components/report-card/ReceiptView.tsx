"use client";

import type { ReceiptData } from "@/lib/api/student";
import { Building2 } from "lucide-react";

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  bank_transfer: "Bank Transfer",
  card: "Card",
  mobile_money: "Mobile Money",
  cheque: "Cheque",
};

interface Props {
  data: ReceiptData;
}

export function ReceiptView({ data }: Props) {
  const { payment, institute, studentFee } = data;
  const student = payment.student;

  const className =
    student.class && typeof student.class === "object" ? student.class.name : "—";
  const regNo = student.studentProfile?.registrationNumber ?? "—";
  const paidDate = new Date(payment.createdAt).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
  const paidTime = new Date(payment.createdAt).toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit",
  });

  const balanceAfter = studentFee?.balance ?? 0;
  const totalAmount = studentFee?.totalAmount ?? 0;
  const totalPaid = totalAmount - balanceAfter;

  return (
    <div
      id="receipt"
      style={{
        width: "148mm",
        minHeight: "210mm",
        margin: "0 auto",
        background: "#fff",
        color: "#1e293b",
        fontFamily: "'Arial', sans-serif",
        fontSize: "11px",
        padding: "10mm 12mm",
        boxSizing: "border-box",
      }}
    >
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", borderBottom: "2px solid #3c50e0", paddingBottom: "10px", marginBottom: "12px" }}>
        <div style={{ flexShrink: 0 }}>
          {institute?.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={institute.logo} alt="Logo" style={{ width: 48, height: 48, objectFit: "contain", borderRadius: 6 }} />
          ) : (
            <div style={{ width: 48, height: 48, background: "#eff1ff", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Building2 style={{ width: 24, height: 24, color: "#3c50e0" }} />
            </div>
          )}
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: "16px", fontWeight: "bold", color: "#1e293b", textTransform: "uppercase" }}>
            {institute?.name ?? "School Name"}
          </h1>
          {institute?.address && (
            <p style={{ margin: "2px 0 0", fontSize: "9px", color: "#64748b" }}>
              {[institute.address, institute.country].filter(Boolean).join(", ")}
            </p>
          )}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ background: "#3c50e0", color: "#fff", padding: "3px 8px", borderRadius: 4, fontSize: "9px", fontWeight: "bold", textTransform: "uppercase" }}>
            Payment Receipt
          </div>
          <p style={{ margin: "4px 0 0", fontSize: "11px", fontWeight: "bold", color: "#3c50e0" }}>
            {payment.receiptNumber}
          </p>
        </div>
      </div>

      {/* ── Receipt meta ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6, padding: "10px 12px", marginBottom: "12px", fontSize: "10px" }}>
        <MetaRow label="Date" value={paidDate} />
        <MetaRow label="Time" value={paidTime} />
        <MetaRow label="Payment Method" value={METHOD_LABELS[payment.method] ?? payment.method} />
        {payment.reference && <MetaRow label="Reference No." value={payment.reference} />}
        {payment.recordedBy && (
          <MetaRow label="Recorded By" value={typeof payment.recordedBy === "object" ? payment.recordedBy.fullName : "—"} />
        )}
      </div>

      {/* ── Student info ── */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "12px", border: "1px solid #e2e8f0", borderRadius: 6, padding: "10px 12px" }}>
        <div style={{ flexShrink: 0 }}>
          {student.profilePhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={student.profilePhoto} alt={student.fullName} style={{ width: 52, height: 52, objectFit: "cover", borderRadius: 6, border: "1.5px solid #e2e8f0" }} />
          ) : (
            <div style={{ width: 52, height: 52, background: "#3c50e0", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", fontWeight: "bold", color: "#fff", textTransform: "uppercase" }}>
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

      {/* ── Payment amount highlight ── */}
      <div style={{ background: "#3c50e0", color: "#fff", borderRadius: 8, padding: "12px 16px", marginBottom: "12px", textAlign: "center" }}>
        <p style={{ margin: 0, fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.5px", opacity: 0.8 }}>Amount Received</p>
        <p style={{ margin: "4px 0 0", fontSize: "28px", fontWeight: "bold", letterSpacing: "-0.5px" }}>
          {payment.amount.toLocaleString()}
        </p>
      </div>

      {/* ── Fee breakdown ── */}
      {studentFee && (
        <>
          <h3 style={{ margin: "0 0 6px", fontSize: "9px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px", color: "#64748b" }}>
            Fee Account Summary
          </h3>
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "12px", fontSize: "10px" }}>
            <thead>
              <tr style={{ background: "#f1f5f9" }}>
                <th style={{ padding: "5px 8px", textAlign: "left", fontWeight: "bold", color: "#64748b", fontSize: "9px", textTransform: "uppercase" }}>Item</th>
                <th style={{ padding: "5px 8px", textAlign: "right", fontWeight: "bold", color: "#64748b", fontSize: "9px", textTransform: "uppercase" }}>Billed</th>
                <th style={{ padding: "5px 8px", textAlign: "right", fontWeight: "bold", color: "#64748b", fontSize: "9px", textTransform: "uppercase" }}>Paid</th>
              </tr>
            </thead>
            <tbody>
              {studentFee.fees.map((item, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "5px 8px" }}>{item.fee?.title ?? "Fee Item"}</td>
                  <td style={{ padding: "5px 8px", textAlign: "right" }}>{item.amount.toLocaleString()}</td>
                  <td style={{ padding: "5px 8px", textAlign: "right", color: "#10b981", fontWeight: "600" }}>{(item.paid ?? 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ fontWeight: "bold", borderTop: "1.5px solid #e2e8f0" }}>
                <td style={{ padding: "6px 8px" }}>TOTAL</td>
                <td style={{ padding: "6px 8px", textAlign: "right" }}>{totalAmount.toLocaleString()}</td>
                <td style={{ padding: "6px 8px", textAlign: "right", color: "#10b981" }}>{totalPaid.toLocaleString()}</td>
              </tr>
              <tr style={{ background: balanceAfter > 0 ? "#fef2f2" : "#f0fdf4" }}>
                <td colSpan={2} style={{ padding: "6px 8px", fontWeight: "bold", color: balanceAfter > 0 ? "#ef4444" : "#10b981" }}>
                  Outstanding Balance
                </td>
                <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: "bold", color: balanceAfter > 0 ? "#ef4444" : "#10b981" }}>
                  {balanceAfter.toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>
        </>
      )}

      {payment.notes && (
        <p style={{ margin: "0 0 12px", fontSize: "10px", color: "#64748b", fontStyle: "italic" }}>
          Note: {payment.notes}
        </p>
      )}

      {/* ── Footer ── */}
      <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "12px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginTop: "8px" }}>
        {["Cashier / Admin", "Student / Guardian"].map((title) => (
          <div key={title} style={{ textAlign: "center" }}>
            <div style={{ borderBottom: "1px solid #1e293b", marginBottom: "4px", paddingBottom: "24px" }} />
            <p style={{ margin: 0, fontSize: "9px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              {title}
            </p>
          </div>
        ))}
      </div>

      <p style={{ marginTop: "10px", fontSize: "8px", color: "#94a3b8", textAlign: "center" }}>
        This is an official receipt issued by {institute?.name ?? "the school"}. Keep this for your records.
      </p>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span style={{ color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.3px", fontSize: "8px" }}>{label}: </span>
      <span style={{ fontWeight: "600", color: "#1e293b" }}>{value}</span>
    </div>
  );
}
