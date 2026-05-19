import { cookies } from "next/headers";

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
 * Read + validate the auth cookie for an AI route.
 * Pass `requiredRole` to enforce a role; pass `null` to skip the role check
 * (the student chat route historically does not enforce one).
 */
export async function authenticate(
  requiredRole: string | null
): Promise<AuthOk | AuthErr> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value ?? null;
  if (!token) return { error: { status: 401, message: "Unauthorized" } };

  const role = getRoleFromToken(token);
  if (requiredRole && role !== requiredRole) {
    return { error: { status: 403, message: "Forbidden" } };
  }

  const userId = getUserIdFromToken(token);
  if (!userId) return { error: { status: 401, message: "Unauthorized" } };

  return { token, userId, role: role ?? "" };
}
