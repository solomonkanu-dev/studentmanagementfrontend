# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server
npm run build     # Production build
npm run start     # Start production server
npm run lint      # Run ESLint
```

### Tests

End-to-end tests run with Playwright. Configuration in `playwright.config.ts`; specs in `e2e/`.

```bash
npx playwright test           # run all e2e specs (chromium)
npx playwright test --headed  # watch them run
npx playwright test e2e/login-page.spec.ts
```

The `e2e/login-page.spec.ts`, `e2e/login-validation.spec.ts`, and `e2e/role-redirect.spec.ts` specs mock `/api/auth/me`, `/api/auth/login` and the backend `/auth/me` via `page.route`, so they run without a live backend. The legacy `e2e/teacher-login.spec.ts` still requires the Express backend with seeded credentials.

No unit-test runner is configured.

## Architecture

### Routing & Role-Based Access

Next.js App Router with two route groups:
- `(auth)/` — public pages (login, admin-request)
- `(dashboard)/` — protected pages, split by role: `admin/`, `lecturer/`, `student/`, `super-admin/`

`app/page.tsx` (root) reads the auth context and redirects to the appropriate role dashboard, or `/login` if unauthenticated. `(dashboard)/layout.tsx` enforces auth on every protected route.

Five roles: `super_admin | admin | lecturer | student | parent`.

### Auth — dual-token (HttpOnly cookie + in-memory store)

The JWT is **not** stored in localStorage. The flow is:

1. `POST /api/auth/login` (Next route handler) calls the Express backend, then sets an HttpOnly `auth_session` cookie *and* returns the token in the JSON response.
2. `context/AuthContext.tsx` puts the token into `lib/api/tokenStore.ts` (a module-scoped variable — survives only the current page session).
3. The Axios request interceptor in `lib/api/client.ts` reads from `tokenStore.get()` and attaches `Authorization: Bearer <token>` to every backend call.
4. On a page refresh, `AuthContext` calls `GET /api/auth/me`, which reads the HttpOnly cookie server-side and returns the token to repopulate `tokenStore`.
5. Logout clears `tokenStore` and deletes the cookie.

`localStorage` only holds a **non-sensitive** snapshot of the user profile for instant UI rendering — never the token. The HttpOnly cookie cannot be read by JS, which closes the XSS-steals-token vector. `lib/api/client.ts` redirects to `/login` on 401 and to `/suspended` on 403 from suspended accounts (auth endpoints are excluded so their errors surface to the form).

Backend base URL: `process.env.NEXT_PUBLIC_API_URL` (defaults to `http://localhost:5000/api/v1`). Set in `.env.local` as `NEXT_PUBLIC_API_URL`. **Note:** in server-only files (route handlers under `app/api/`), prefer `process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL` — the `NEXT_PUBLIC_*` variant is inlined into the client bundle and is the wrong knob for server-side traffic.

### State Management

- **Auth state**: `AuthContext` — user from `localStorage` snapshot + token from in-memory `tokenStore`
- **Theme/dark mode**: `ThemeContext` injects a `<style>` tag with CSS variable overrides; `useColorMode` hook toggles `.dark` on `<body>` and persists to localStorage
- **Server state**: TanStack Query v5 (`context/QueryProvider.tsx`) — 1-minute stale time, 1 retry

### API Layer

All API calls live in `lib/api/`. Each file (`admin.ts`, `attendance.ts`, `fees.ts`, `grading.ts`, `salary.ts`, `class.ts`, `subject.ts`, `assignment.ts`, `superAdmin.ts`, `monitor.ts`, `auditLog.ts`, etc.) exports typed async functions that use the shared `apiClient` from `client.ts`. Types are defined in `lib/types/index.ts`.

### Forms

React Hook Form + Zod. Define a Zod schema, infer the TypeScript type, pass the resolver to `useForm`, use `register`/`handleSubmit`/`formState.errors` as usual.

### Design System

TailAdmin component library — 69+ pre-built components in `components/ui/`. Design tokens (colors, spacing, shadows) are CSS custom properties defined in `app/globals.css`. Key tokens:

- Primary: `--color-primary` (`#3c50e0`)
- Dark card bg: `--color-boxdark` (`#24303f`)
- Body text: `--color-body` (`#64748b`)

Font: Satoshi (local variable font, loaded via `next/font/local`, CSS var `--font-satoshi`).

Dark mode uses Tailwind's class strategy (`.dark` on `<body>`) with `@custom-variant dark` in globals.css.

### Path Aliases

`@/*` maps to the repo root (configured in `tsconfig.json`).
