"use client";

import type { SubscriptionReceiptData } from "@/lib/types";
import { Building2 } from "lucide-react";

// Printable receipt for an institute's subscription payment.
// Modelled on ReceiptView.tsx — inline styles + an A5 @media print block.

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  bank_transfer: "Bank Transfer",
  card: "Card",
  mobile_money: "Mobile Money",
};

const thL: React.CSSProperties = {
  padding: "5px 8px", textAlign: "left", fontWeight: "bold",
  color: "#64748b", fontSize: "9px", textTransform: "uppercase",
};
const thR: React.CSSProperties = { ...thL, textAlign: "right" };
const tdL: React.CSSProperties = { padding: "5px 8px" };
const tdR: React.CSSProperties = { padding: "5px 8px", textAlign: "right" };

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span style={{ color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.3px", fontSize: "8px" }}>
        {label}:{" "}
      </span>
      <span style={{ fontWeight: 600, color: "#1e293b" }}>{value}</span>
    </div>
  );
}

export function SubscriptionReceiptView({ data }: { data: SubscriptionReceiptData }) {
  const { payment, institute, plan, term } = data;

  const paidAt = payment.paidAt || payment.createdAt;
  const paidDate = new Date(paidAt).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
  const paidTime = new Date(paidAt).toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit",
  });

  const planLabel = plan?.displayName || plan?.name || "Subscription";
  const methodLabel =
    payment.channel === "online"
      ? "Online — Card / Mobile Money"
      : METHOD_LABELS[payment.method] ?? payment.method;
  const recordedBy =
    payment.recordedBy && typeof payment.recordedBy === "object"
      ? payment.recordedBy.fullName
      : null;

  return (
    <div
      id="receipt"
      style={{
        width: "148mm", minHeight: "210mm", margin: "0 auto", background: "#fff",
        color: "#1e293b", fontFamily: "'Arial', sans-serif", fontSize: "11px",
        padding: "10mm 12mm", boxSizing: "border-box",
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
            {institute?.name ?? "Institute"}
          </h1>
          {institute?.address && (
            <p style={{ margin: "2px 0 0", fontSize: "9px", color: "#64748b" }}>
              {[institute.address, institute.country].filter(Boolean).join(", ")}
            </p>
          )}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ background: "#3c50e0", color: "#fff", padding: "3px 8px", borderRadius: 4, fontSize: "9px", fontWeight: "bold", textTransform: "uppercase" }}>
            Subscription Receipt
          </div>
          <p style={{ margin: "4px 0 0", fontSize: "11px", fontWeight: "bold", color: "#3c50e0" }}>
            {payment.receiptNumber ?? "—"}
          </p>
        </div>
      </div>

      {/* ── Meta ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6, padding: "10px 12px", marginBottom: "12px", fontSize: "10px" }}>
        <MetaRow label="Date" value={paidDate} />
        <MetaRow label="Time" value={paidTime} />
        <MetaRow label="Plan" value={planLabel} />
        <MetaRow label="Payment Method" value={methodLabel} />
        {term && (
          <MetaRow label="Term" value={[term.name, term.academicYear].filter(Boolean).join(" · ")} />
        )}
        {payment.reference && <MetaRow label="Reference No." value={payment.reference} />}
        {recordedBy && <MetaRow label="Recorded By" value={recordedBy} />}
        <MetaRow label="Status" value={payment.status === "completed" ? "Paid" : payment.status} />
      </div>

      {/* ── Charges ── */}
      <h3 style={{ margin: "0 0 6px", fontSize: "9px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px", color: "#64748b" }}>
        Subscription Charges
      </h3>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "12px", fontSize: "10px" }}>
        <thead>
          <tr style={{ background: "#f1f5f9" }}>
            <th style={thL}>Description</th>
            <th style={thR}>Students</th>
            <th style={thR}>Rate (NLe)</th>
            <th style={thR}>Amount (NLe)</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
            <td style={tdL}>
              {planLabel} plan{term ? ` — ${term.name}` : ""}
            </td>
            <td style={tdR}>{payment.studentCount.toLocaleString()}</td>
            <td style={tdR}>{payment.pricePerStudent.toLocaleString()}</td>
            <td style={{ ...tdR, fontWeight: 600 }}>{payment.amount.toLocaleString()}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr style={{ fontWeight: "bold", borderTop: "1.5px solid #e2e8f0" }}>
            <td colSpan={3} style={{ padding: "6px 8px" }}>TOTAL</td>
            <td style={{ ...tdR, padding: "6px 8px" }}>NLe {payment.amount.toLocaleString()}</td>
          </tr>
        </tfoot>
      </table>

      {/* ── Amount highlight ── */}
      <div style={{ background: "#3c50e0", color: "#fff", borderRadius: 8, padding: "12px 16px", marginBottom: "12px", textAlign: "center" }}>
        <p style={{ margin: 0, fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.5px", opacity: 0.8 }}>
          Amount Paid
        </p>
        <p style={{ margin: "4px 0 0", fontSize: "28px", fontWeight: "bold", letterSpacing: "-0.5px" }}>
          NLe {payment.amount.toLocaleString()}
        </p>
      </div>

      {payment.note && (
        <p style={{ margin: "0 0 12px", fontSize: "10px", color: "#64748b", fontStyle: "italic" }}>
          Note: {payment.note}
        </p>
      )}

      {/* ── Footer ── */}
      <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "12px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginTop: "8px" }}>
        {["Issued By", "Received By"].map((title) => (
          <div key={title} style={{ textAlign: "center" }}>
            <div style={{ borderBottom: "1px solid #1e293b", marginBottom: "4px", paddingBottom: "24px" }} />
            <p style={{ margin: 0, fontSize: "9px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              {title}
            </p>
          </div>
        ))}
      </div>

      <p style={{ marginTop: "10px", fontSize: "8px", color: "#94a3b8", textAlign: "center" }}>
        Official subscription receipt issued by {institute?.name ?? "the platform"}. Keep this for your records.
      </p>
    </div>
  );
}
