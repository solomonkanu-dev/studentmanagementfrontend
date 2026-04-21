import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { fullName, email, password } = body;

  if (!fullName || !email || !password) {
    return NextResponse.json({ message: "Missing required fields." }, { status: 400 });
  }

  // ── 1. Forward to backend ──────────────────────────────────────────────────
  const backendUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1";
  let backendRes: Response;
  try {
    backendRes = await fetch(`${backendUrl}/admin/admin-request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, email, password }),
    });
  } catch {
    return NextResponse.json(
      { message: "Could not reach the server. Please try again." },
      { status: 502 }
    );
  }

  const backendData = await backendRes.json().catch(() => ({}));

  if (!backendRes.ok) {
    return NextResponse.json(backendData, { status: backendRes.status });
  }

  // ── 2. Send email notification to super admin ──────────────────────────────
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
  const smtpConfigured =
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    superAdminEmail;

  if (smtpConfigured) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: {
          user: process.env.SMTP_USER,
          // Gmail App Passwords are displayed with spaces but must be sent without them
          pass: process.env.SMTP_PASS?.replace(/\s/g, ""),
        },
      });

      const submittedAt = new Date().toLocaleString("en-GB", {
        dateStyle: "full",
        timeStyle: "short",
      });

      await transporter.sendMail({
        from: `"EduPulse" <${process.env.SMTP_USER}>`,
        to: superAdminEmail,
        subject: `New Admin Request — ${fullName}`,
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
            <div style="background:#0F6E56;padding:24px 32px;border-radius:8px 8px 0 0">
              <h1 style="margin:0;color:#fff;font-size:20px">EduPulse</h1>
              <p style="margin:4px 0 0;color:#9FE1CB;font-size:13px">School Management System</p>
            </div>
            <div style="border:1px solid #e5e7eb;border-top:none;padding:32px;border-radius:0 0 8px 8px">
              <h2 style="margin:0 0 8px;font-size:18px">New admin request received</h2>
              <p style="margin:0 0 24px;color:#6b7280;font-size:14px">
                A new user has requested admin access to EduPulse.
              </p>
              <table style="width:100%;border-collapse:collapse;font-size:14px">
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;color:#6b7280;width:120px">Full name</td>
                  <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-weight:600">${fullName}</td>
                </tr>
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;color:#6b7280">Email</td>
                  <td style="padding:10px 0;border-bottom:1px solid #f3f4f6">${email}</td>
                </tr>
                <tr>
                  <td style="padding:10px 0;color:#6b7280">Submitted</td>
                  <td style="padding:10px 0">${submittedAt}</td>
                </tr>
              </table>
              <div style="margin-top:28px">
                <a href="${backendUrl.replace("/api/v1", "")}/super-admin/pending-admins"
                   style="display:inline-block;background:#3c50e0;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600">
                  Review in dashboard
                </a>
              </div>
              <p style="margin-top:28px;font-size:12px;color:#9ca3af">
                You are receiving this because you are a super admin on EduPulse.
              </p>
            </div>
          </div>
        `,
      });
    } catch (mailErr) {
      // Email failure must not block the user — log and continue
      console.error("[admin-request] Failed to send notification email:", mailErr);
    }
  } else {
    console.warn(
      "[admin-request] SMTP not configured — skipping super admin notification email."
    );
  }

  return NextResponse.json(backendData, { status: backendRes.status });
}
