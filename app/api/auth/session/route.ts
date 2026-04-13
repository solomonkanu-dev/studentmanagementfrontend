import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const TOKEN_COOKIE = "auth-token";
const USER_COOKIE = "auth-user";

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 7, // 7 days
};

/** POST /api/auth/session — called after Express login; sets HttpOnly cookies */
export async function POST(req: Request) {
  let body: { token?: string; user?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { token, user } = body;
  if (!token || !user) {
    return NextResponse.json({ error: "token and user are required" }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(TOKEN_COOKIE, token, COOKIE_OPTS);
  res.cookies.set(USER_COOKIE, JSON.stringify(user), COOKIE_OPTS);
  return res;
}

/** GET /api/auth/session — restores session from HttpOnly cookies on page refresh */
export async function GET() {
  const jar = await cookies();
  const token = jar.get(TOKEN_COOKIE)?.value ?? null;
  const rawUser = jar.get(USER_COOKIE)?.value ?? null;

  if (!token || !rawUser) {
    return NextResponse.json({ token: null, user: null });
  }

  try {
    const user = JSON.parse(rawUser);
    return NextResponse.json({ token, user });
  } catch {
    return NextResponse.json({ token: null, user: null });
  }
}

/** PATCH /api/auth/session — updates the stored user data (e.g. after profile edit) */
export async function PATCH(req: Request) {
  let user: unknown;
  try {
    user = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const jar = await cookies();
  if (!jar.get(TOKEN_COOKIE)?.value) {
    return NextResponse.json({ error: "No active session" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(USER_COOKIE, JSON.stringify(user), COOKIE_OPTS);
  return res;
}

/** DELETE /api/auth/session — clears session cookies on logout */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(TOKEN_COOKIE);
  res.cookies.delete(USER_COOKIE);
  return res;
}
