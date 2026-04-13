import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const COOKIE_NAME = "auth_session";

function isExpired(token: string): boolean {
  try {
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString()
    );
    const exp: number = payload.exp ?? 0;
    return Date.now() / 1000 > exp;
  } catch {
    return true;
  }
}

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token || isExpired(token)) {
    const res = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (token) {
      // Clear the stale cookie
      res.cookies.set(COOKIE_NAME, "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 0,
        path: "/",
      });
    }
    return res;
  }

  // Return the token so AuthContext can restore the in-memory tokenStore.
  // The cookie is HttpOnly so this is the only server-gated path to obtain it.
  return NextResponse.json({ token });
}
