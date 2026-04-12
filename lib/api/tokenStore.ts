/**
 * In-memory token store.
 * The JWT never touches localStorage — it lives only in module memory
 * (cleared on tab close / hard refresh, restored via the /api/auth/session cookie exchange).
 */
let _token: string | null = null;

export const tokenStore = {
  get: (): string | null => _token,
  set: (t: string | null): void => { _token = t; },
  clear: (): void => { _token = null; },
};
