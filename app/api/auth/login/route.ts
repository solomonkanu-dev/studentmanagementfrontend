import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

const BACKEND =
  process.env.API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:5000/api/v1";

const COOKIE_NAME = "auth_session";
// Match the JWT expiry on the Express side (default 7 days)
const MAX_AGE = 60 * 60 * 24 * 7;

export async function POST(req: NextRequest) {
  let body: { email: string; password: string; asSuperAdmin?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { email, password, asSuperAdmin } = body;

  const endpoint = asSuperAdmin
    ? `${BACKEND}/super-admin/super-admin/login`
    : `${BACKEND}/auth/login`;

  try {
    const { data } = await axios.post(endpoint, { email, password });
    const { token, user } = data;

    if (!token || !user) {
      return NextResponse.json({ error: "Invalid response from auth server" }, { status: 502 });
    }

    const res = NextResponse.json({ user, token });
    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: MAX_AGE,
      path: "/",
    });

    return res;
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status ?? 500;
    const message =
      (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
      "Login failed";
    return NextResponse.json({ error: message }, { status });
  }
}
