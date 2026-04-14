import { NextResponse } from "next/server";

// Monime redirects here via POST after a successful payment.
// We redirect the browser to the actual success page as a GET.
export async function POST(request: Request) {
  const base = new URL(request.url).origin;
  return NextResponse.redirect(`${base}/admin/plan/success`, { status: 303 });
}

export async function GET(request: Request) {
  const base = new URL(request.url).origin;
  return NextResponse.redirect(`${base}/admin/plan/success`, { status: 302 });
}
