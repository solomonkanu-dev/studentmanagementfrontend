# StudentMS — Smart School Management System

A full-featured, AI-powered school management platform built for Sierra Leone educational institutions. Manage students, teachers, classes, fees, results, attendance, assignments, and official documents from one dashboard.

---

## Features

- **Student Management** — Enrolment, profiles, promotions, alumni status, and document generation
- **Results & Grading** — Assign marks, auto-calculate grades, generate report cards with rankings
- **Fee Management** — Assign fee structures, record payments (NLe), issue receipts, track outstanding balances
- **Attendance Tracking** — Mark daily attendance per subject, monitor trends, auto-alert below 75%
- **Teacher Management** — Profiles, class assignments, salary records, and performance tracking
- **Assignments** — Create assignments, set due dates, track submissions, notify students automatically
- **Email Notifications** — Automated emails for receipts, results, assignments, and alerts via your own SMTP
- **Official Documents** — Generate branded PDFs: Admission Letters, Transfer Certificates, Attestation Letters, ID Cards
- **AI Assistant** — Role-aware AI chat powered by Claude; admins query live data, teachers get class insights, students ask about results and fees
- **Role-Based Access** — Super Admin, Admin, Teacher, Student, and Parent each with tailored dashboards
- **Audit Logs** — Full activity trail for admin actions
- **School Type Support** — Primary schools use "Class", secondary schools use "Form" — terminology propagates across the entire app

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 + TailAdmin design system |
| UI Font | Satoshi (variable font) |
| State | TanStack Query v5 |
| Forms | React Hook Form + Zod |
| HTTP | Axios |
| Icons | Lucide React |
| PDF | @react-pdf/renderer |
| AI | Anthropic Claude SDK |
| Charts | ApexCharts |

---

## Roles

| Role | Access |
|---|---|
| `super_admin` | Platform-wide oversight, approve admin accounts, monitor all institutions |
| `admin` | Full institution control — students, teachers, fees, salary, documents, settings |
| `lecturer` | Assigned classes, attendance, results, assignments, salary slips |
| `student` | Results, attendance, fees, documents, notification preferences |
| `parent` | Child's results, attendance, fee balances, announcements |

---

## Getting Started

### Prerequisites

- Node.js 18+
- Backend API running (see backend repo)

### Installation

```bash
git clone <repo-url>
cd studentmanagement
npm install
```

### Environment

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production Build

```bash
npm run build
npm run start
```

### Lint

```bash
npm run lint
```

---

## Project Structure

```
app/
  (auth)/           # Public routes: login, admin-request
  (dashboard)/      # Protected routes, split by role
    admin/          # Admin dashboard and all admin pages
    lecturer/       # Teacher dashboard
    student/        # Student dashboard
    parent/         # Parent dashboard
    super-admin/    # Super Admin dashboard
  home/             # Public landing page
  api/              # Next.js API routes (AI chat endpoints)

components/
  layout/           # Sidebar, Header
  ui/               # TailAdmin component library (69+ components)
  report-card/      # PDF report card template

context/
  AuthContext.tsx   # JWT auth, user state, role helpers
  QueryProvider.tsx # TanStack Query provider

hooks/
  useClassLabel.ts  # Returns "Class/Form" based on school type
  useColorMode.ts   # Dark mode toggle

lib/
  api/              # Typed API clients (admin, student, fees, etc.)
  types/            # Shared TypeScript types
```

---

## Authentication

- JWT stored in `localStorage`
- `AuthContext` provides `user`, `login()`, `logout()`, `isRole()`
- API client automatically attaches `Authorization: Bearer <token>` header
- On 401, auth is cleared and the user is redirected to `/login`

---

## Onboarding

When a new admin account is approved and logs in for the first time, they are guided through a setup wizard:

1. **School Type** — Primary (Class 1–6) or Secondary (Form 1–6 / JSS / SSS)
2. **School Profile** — Name, address, phone, email, website *(skipped if institute already exists)*
3. **First Teacher** — Creates the first teacher account
4. **First Class/Form** — Creates the first class and assigns the teacher
5. **Done** — Quick-action cards to continue setup

---

## Currency & Locale

- Currency: **NLe** (Sierra Leonean New Leone)
- Country code: **+232**
- Default city: **Freetown**

---

## Dark Mode

Toggle via the header sun/moon icon. Uses Tailwind's class strategy (`.dark` on `<body>`), persisted to `localStorage`.

---

## AI Assistant

Each role has a dedicated AI chat widget powered by the Anthropic Claude API:

- **Admin** — Queries live fee, student, attendance, and result data via tool calls
- **Teacher (Lecturer)** — Class-scoped insights: grades, attendance, assignments
- **Student** — Personal data: results, fees, attendance, upcoming deadlines

AI endpoints live in `app/api/ai/`.
