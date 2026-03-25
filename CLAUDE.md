# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server
npm run build     # Production build
npm run start     # Start production server
npm run lint      # Run ESLint
```

No test runner is configured in this project.

## Architecture

### Routing & Role-Based Access

Next.js App Router with two route groups:
- `(auth)/` — public pages (login, admin-request)
- `(dashboard)/` — protected pages, split by role: `admin/`, `lecturer/`, `student/`, `super-admin/`

`app/page.tsx` (root) reads the auth context and redirects to the appropriate role dashboard, or `/login` if unauthenticated. `(dashboard)/layout.tsx` enforces auth on every protected route.

Four roles: `super_admin | admin | lecturer | student`.

### Auth

`context/AuthContext.tsx` — JWT stored in localStorage. Provides `user`, `login()`, `logout()`, and `isRole(...roles)`.

`lib/api/client.ts` — Axios instance with two interceptors:
1. **Request**: attaches `Authorization: Bearer <token>`
2. **Response**: on 401, clears auth and redirects to `/login` (skips this for auth endpoints so login errors surface normally)

Backend base URL: `process.env.NEXT_PUBLIC_API_URL` (defaults to `http://localhost:5000/api/v1`). Set in `.env.local` as `NEXT_PUBLIC_API_URL`.

### State Management

- **Auth state**: `AuthContext` + localStorage
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
