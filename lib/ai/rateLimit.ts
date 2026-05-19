/**
 * In-memory sliding-window rate limiter, shared by every AI route.
 *
 * Keys are namespaced by caller (e.g. `admin-chat:<userId>`) so chat,
 * insights and write-execution budgets stay independent.
 *
 * NOTE: per-process only — counts reset on deploy/restart. A Redis-backed
 * store is the future upgrade if the app scales horizontally.
 */
const store = new Map<string, { count: number; resetAt: number }>();

const DEFAULT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export function isRateLimited(
  key: string,
  max: number,
  windowMs: number = DEFAULT_WINDOW_MS
): boolean {
  const now = Date.now();
  const entry = store.get(key);
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  if (entry.count >= max) return true;
  entry.count++;
  return false;
}
