# API Spec — Super-Admin Academic Oversight

**Status:** proposed — not yet implemented on the Express backend.
**Consumer:** a new "Academic Activity" section of the super-admin dashboard
(`app/(dashboard)/super-admin/page.tsx`).

## Why this is needed

The super-admin dashboard measures accounts, fees, salaries, and system health
— but almost nothing about **teaching and learning**, which is the actual
product of an education management system. There is no platform-level view of
attendance, results, exam performance, or assignment activity.

The backend already computes per-institute academic counts — `InstituteDeepReport`
returns `academics: { classes, subjects, assignments, results, attendanceRecords }`
— but there is no endpoint that **aggregates academics across all institutes**,
and the per-institute deep report would require N calls to assemble. This spec
adds a single aggregated endpoint.

## Endpoint

```
GET /api/v1/super-admin/monitor/academics
```

- **Auth:** super-admin JWT (`Authorization: Bearer <token>`), same guard as the
  other `/super-admin/monitor/*` routes.
- **Query params:**
  - `months` (optional, integer, default `6`) — trend/window length. Attendance,
    results, and pass-rate aggregates are computed over **the last `months`
    months**, and `attendanceTrend` returns one point per month in that window.
- **Response envelope:** `{ "data": <payload> }` — matches the existing
  `/super-admin/monitor/*` convention (the frontend api layer unwraps via
  `data.data ?? data`).

## Conventions

- All rates (`attendanceRate`, `passRate`, `submissionRate`, `examsPassRate`) are
  **integer percentages 0–100** — consistent with `FeeRevenueReport.summary.collectionRate`
  and the dashboard's `pct()` helper.
- A rate is **`null`** when there is no underlying data (e.g. an institute with
  zero attendance records). `null` ≠ `0` — the frontend renders `null` as "—".
- **Attendance rate** = `present / (present + absent + late)`. "Late" is counted
  as *not* present. (Flag for the team — change if late should count as present.)
- **Pass rate** uses each institute's **own configured pass mark** from its
  grading settings. An institute with no pass mark configured is excluded from
  pass-rate aggregation (and noted in `inactiveInstitutes` if it has no results).
- **Grade distribution** is merged by grade **label** (`A`, `B`, `C`, …).
  Different institutes may use different scales; the backend normalizes by label.

## Response payload

```ts
interface AcademicReport {
  summary: {
    classes: number;             // total classes, all institutes
    subjects: number;            // total subjects, all institutes
    assignments: number;         // assignments created in the window
    assignmentsGraded: number;   // submissions graded in the window
    assignmentsPending: number;  // submissions made but not yet graded
    submissionRate: number | null;  // % graded of all submissions in window
    attendanceRate: number | null;  // platform-wide, over the window
    resultsPublished: number;    // results / report cards published in window
    examsPassRate: number | null;   // % of results at/above each institute's pass mark
  };

  // One point per month in the window, oldest first.
  attendanceTrend: Array<{
    year: number;
    month: number;               // 1-indexed
    rate: number | null;         // attendance rate for that month
  }>;

  // Platform-wide grade buckets, merged by label.
  gradeDistribution: Array<{
    grade: string;               // "A", "B", "C", ...
    count: number;
  }>;

  // Per-institute academic performance. One row per institute.
  byInstitute: Array<{
    instituteId: string;
    instituteName: string;
    students: number;
    attendanceRate: number | null;
    passRate: number | null;
    assignmentsGraded: number;
    assignmentsPending: number;
  }>;

  // Onboarded institutes with no academic activity in the window — i.e. no
  // classes/subjects set up, or no attendance/results recorded.
  inactiveInstitutes: Array<{
    instituteId: string;
    instituteName: string;
    reason: string;              // e.g. "No classes created", "No attendance recorded"
  }>;
}
```

When implemented, add `AcademicReport` to `lib/types/index.ts` and a
`monitorApi.getAcademics(months?)` function to `lib/api/monitor.ts`.

## Field semantics & edge cases

| Situation | Expected handling |
|-----------|-------------------|
| Institute with no attendance records | `attendanceRate: null`; excluded from the platform `summary.attendanceRate` average. |
| Institute with no results | `passRate: null`; excluded from `summary.examsPassRate`. |
| Institute with no configured pass mark | Excluded from pass-rate aggregation; if it also has no results, list it in `inactiveInstitutes`. |
| Institute onboarded but no classes/subjects | Listed in `inactiveInstitutes` with an explanatory `reason`. |
| Suspended institute | Include in the response; the frontend may dim it. Deleted institutes: exclude. |
| `months` ≤ 0 | Treat as `1`. |
| Window contains no academic data at all | `summary` rates `null`, count fields `0`, arrays empty. |
| Month within the window with no records | An `attendanceTrend` entry with `rate: null` (do not omit the month). |

Platform `summary.attendanceRate` / `examsPassRate` should be computed from the
**raw underlying records** (records-weighted), not as an unweighted average of
per-institute rates — so a large institute is not outweighed by a tiny one.

## Sample response

```json
{
  "data": {
    "summary": {
      "classes": 142,
      "subjects": 731,
      "assignments": 388,
      "assignmentsGraded": 301,
      "assignmentsPending": 54,
      "submissionRate": 78,
      "attendanceRate": 91,
      "resultsPublished": 1240,
      "examsPassRate": 84
    },
    "attendanceTrend": [
      { "year": 2025, "month": 12, "rate": 89 },
      { "year": 2026, "month": 1,  "rate": 92 },
      { "year": 2026, "month": 2,  "rate": 90 },
      { "year": 2026, "month": 3,  "rate": 93 },
      { "year": 2026, "month": 4,  "rate": 91 },
      { "year": 2026, "month": 5,  "rate": null }
    ],
    "gradeDistribution": [
      { "grade": "A", "count": 412 },
      { "grade": "B", "count": 530 },
      { "grade": "C", "count": 198 },
      { "grade": "D", "count": 70 },
      { "grade": "F", "count": 30 }
    ],
    "byInstitute": [
      { "instituteId": "i1", "instituteName": "Hill View Academy", "students": 320,
        "attendanceRate": 94, "passRate": 88, "assignmentsGraded": 110, "assignmentsPending": 8 },
      { "instituteId": "i2", "instituteName": "Sunrise School", "students": 145,
        "attendanceRate": 81, "passRate": 67, "assignmentsGraded": 40, "assignmentsPending": 22 }
    ],
    "inactiveInstitutes": [
      { "instituteId": "i7", "instituteName": "New Hope College", "reason": "No classes created" }
    ]
  }
}
```

## How the dashboard will use each field

| Payload | Dashboard widget |
|---------|------------------|
| `summary.*` | KPI cards in a new "Academic Activity" row |
| `attendanceTrend` | Attendance-rate line chart |
| `gradeDistribution` | Grade-distribution donut/bar chart |
| `byInstitute` | Ranked table — sortable by attendance / pass rate |
| `inactiveInstitutes` | Feeds the existing **Attention Required** panel as a new alert row |

## Error responses

Follow the existing backend convention:

- `401` — missing/invalid token.
- `403 { "message": "..." }` — token is not a super-admin.
- `500 { "message": "..." }` — unexpected failure.

## Performance note

This aggregates attendance, result, and assignment collections across every
institute. Prefer MongoDB aggregation pipelines with `$match` on the date window
before `$group`, and ensure the attendance/result collections are indexed on
`institute` + date. The payload is small and changes slowly — a short server-side
cache (e.g. 60s) is reasonable.
