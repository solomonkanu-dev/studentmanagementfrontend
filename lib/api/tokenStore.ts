// In-memory token store.
// The JWT is NOT written to localStorage. Instead:
//  - On login  : set here + written to an HttpOnly cookie by /api/auth/login
//  - On refresh: /api/auth/me reads the HttpOnly cookie and returns the token,
//                which AuthContext restores here.
//  - On logout : cleared here + cookie deleted by /api/auth/logout
//
// This means XSS cannot steal a persistent token from storage. The only
// remaining client-side exposure is this in-memory reference during the
// current page session, which is the inherent trade-off when the browser
// calls the Express backend directly.

let _token: string | null = null;

export const tokenStore = {
  get: (): string | null => _token,
  set: (token: string): void => { _token = token; },
  clear: (): void => { _token = null; },
};
