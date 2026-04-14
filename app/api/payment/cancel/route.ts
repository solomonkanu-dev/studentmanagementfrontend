import { NextResponse } from "next/server";

// Monime redirects here via POST after a cancelled payment.
// We redirect the browser to the actual cancel page as a GET.
export async function POST(request: Request) {
  const base = new URL(request.url).origin;
  return NextResponse.redirect(`${base}/admin/plan/cancel`, { status: 303 });
}

export async function GET(request: Request) {
  const base = new URL(request.url).origin;
  return NextResponse.redirect(`${base}/admin/plan/cancel`, { status: 302 });
}
