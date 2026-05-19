import axios, { type Method } from "axios";

/** Express backend base URL — server-side, so prefer API_URL over the public var. */
export const BACKEND =
  process.env.API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:5000/api/v1";

export interface CallBackendOpts {
  path: string;
  token: string;
  method?: Method;
  params?: Record<string, unknown>;
  body?: unknown;
  timeout?: number;
  /** Return `data.data ?? data` when true (default); raw `data` when false. */
  unwrap?: boolean;
}

/**
 * Unified backend caller for AI tools. Forwards the user's Bearer token, so
 * the backend remains the real authorization boundary for every read & write.
 * On failure returns `{ error }` rather than throwing, so the agent can react.
 */
export async function callBackend(opts: CallBackendOpts): Promise<unknown> {
  const {
    path,
    token,
    method = "GET",
    params,
    body,
    timeout = 10000,
    unwrap = true,
  } = opts;
  try {
    const { data } = await axios.request({
      url: `${BACKEND}${path}`,
      method,
      headers: { Authorization: `Bearer ${token}` },
      params,
      data: body,
      timeout,
    });
    return unwrap ? data?.data ?? data : data;
  } catch (err: unknown) {
    const msg =
      (err as { response?: { data?: { message?: string } } })?.response?.data
        ?.message ?? "Failed to fetch data";
    return { error: msg };
  }
}
