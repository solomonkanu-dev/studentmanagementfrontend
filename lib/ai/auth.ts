import { cookies, headers } from "next/headers";

/** HttpOnly cookie that carries the JWT (see CLAUDE.md auth notes). */
export const COOKIE_NAME = "auth_session";

interface TokenPayload {
  role?: string;
  sub?: string;
  id?: string;
  _id?: string;
}

/** Decode a JWT payload without verifying the signature (backend re-verifies). */
export function decodeToken(token: string): TokenPayload | null {
  try {
    return JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
  } catch {
    return null;
  }
}

export function getUserIdFromToken(token: string): string | null {
  const p = decodeToken(token);
  return p?.sub ?? p?.id ?? p?._id ?? null;
}

export function getRoleFromToken(token: string): string | null {
  return decodeToken(token)?.role ?? null;
}

export interface AuthOk {
  token: string;
  userId: string;
  role: string;
}
export interface AuthErr {
  error: { status: number; message: string };
}

/**
 * Read + validate the JWT for an AI route.
 *
 * Accepts the token from either:
 *   1. `Authorization: Bearer <jwt>` — used by the mobile app, and
 *   2. the `auth_session` HttpOnly cookie — used by the Next.js web app.
 *
 * Pass `requiredRole` to enforce a role; pass `null` to skip the role check
 * (the student chat route historically does not enforce one).
 */
export async function authenticate(
  requiredRole: string | null
): Promise<AuthOk | AuthErr> {
  const headerStore = await headers();
  const authHeader = headerStore.get("authorization") ?? headerStore.get("Authorization");
  let token: string | null = null;
  if (authHeader?.toLowerCase().startsWith("bearer ")) {
    token = authHeader.slice(7).trim() || null;
  }
  if (!token) {
    const cookieStore = await cookies();
    token = cookieStore.get(COOKIE_NAME)?.value ?? null;
  }
  if (!token) return { error: { status: 401, message: "Unauthorized" } };

  const role = getRoleFromToken(token);
  if (requiredRole && role !== requiredRole) {
    return { error: { status: 403, message: "Forbidden" } };
  }

  const userId = getUserIdFromToken(token);
  if (!userId) return { error: { status: 401, message: "Unauthorized" } };

  return { token, userId, role: role ?? "" };
}
