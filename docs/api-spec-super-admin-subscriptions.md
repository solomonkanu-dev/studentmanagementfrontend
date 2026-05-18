# API Spec — Super-Admin Subscriptions / Revenue

**Status:** proposed — not yet implemented on the Express backend.
**Consumer:** the Subscription/Revenue section of the super-admin dashboard
(`app/(dashboard)/super-admin/page.tsx`).

## Why this is needed

The dashboard currently has no platform-business metrics. Every "fee" figure it
shows is the *schools'* student-fee revenue — not what institutes pay the
platform for their subscription plans. The data to compute MRR/ARR,
institutes-per-plan, and expiring subscriptions does not exist in any endpoint
the frontend can call today:

- `GET /super-admin/stats` → totals only (`SuperAdminStats`).
- `GET /plans` → plan **definitions** only — no per-institute assignment.
- `GET /plans/my-plan` → institute-scoped; returns the *current admin's* plan.
  A super-admin has no institute, and there is no "all institute plans" route.
- `InstituteHealthReport` / `Institute` carry no plan field.

The institute↔plan relationship already exists in the database (it is written
by `PATCH /plans/assign`, and `InstitutePlan` already carries `planExpiry` and
`assignedAt`). This spec adds the missing **read** endpoint to surface it.

## Endpoint

```
GET /api/v1/super-admin/monitor/subscriptions
```

- **Auth:** super-admin JWT (`Authorization: Bearer <token>`), same guard as the
  other `/super-admin/monitor/*` routes.
- **Query params:**
  - `expiringDays` (optional, integer, default `30`) — the window, in days, that
    defines the `expiring` bucket.
- **Response envelope:** `{ "data": <payload> }` — matches the existing
  `/super-admin/monitor/*` convention (the frontend api layer unwraps via
  `data.data ?? data`).

## Pricing convention

`Plan.price` is the **annual** price in NLe (Sierra Leonean Leone). This is the
existing convention — the dashboard already renders it as `NLe {price}/yr`.
Therefore:

- **ARR contribution** of a subscription = `plan.price`
- **MRR contribution** of a subscription = `plan.price / 12`
- A plan with `price` of `0`, `null`, or `undefined` is treated as **free** and
  contributes `0` to MRR/ARR.

Only **active, non-expired** subscriptions count toward MRR/ARR.

## Response payload

```ts
interface SubscriptionReport {
  summary: {
    mrr: number;                 // monthly recurring revenue, NLe
    arr: number;                 // annual recurring revenue, NLe
    activeSubscriptions: number; // institutes with a plan, not expired
    paidSubscriptions: number;   // active subscriptions on a plan with price > 0
    freeSubscriptions: number;   // active subscriptions on a free plan
    expiringSoon: number;        // active, planExpiry within `expiringDays`
    expired: number;             // planExpiry in the past
    unassigned: number;          // institutes with no plan assigned
  };

  byPlan: Array<{
    planId: string;
    name: string;                // Plan.name
    displayName: string | null;  // Plan.displayName
    price: number;               // annual price, NLe (0 for free plans)
    instituteCount: number;      // active subscriptions on this plan
    mrr: number;                 // this plan's contribution to summary.mrr
  }>;

  // Active subscriptions expiring within `expiringDays`. Soonest first.
  expiring: Array<{
    instituteId: string;
    instituteName: string;
    planName: string;            // Plan.displayName ?? Plan.name
    planExpiry: string;          // ISO 8601
    daysUntilExpiry: number;     // >= 0
  }>;

  // Subscriptions whose planExpiry is in the past. Most recently expired first.
  expired: Array<{
    instituteId: string;
    instituteName: string;
    planName: string;
    planExpiry: string;          // ISO 8601
    daysSinceExpiry: number;     // >= 0
  }>;
}
```

When implemented, this interface should be added to `lib/types/index.ts` and a
`monitorApi.getSubscriptions()` function to `lib/api/monitor.ts`.

## Field semantics & edge cases

| Situation | Expected handling |
|-----------|-------------------|
| Institute with no plan assigned | Counted in `summary.unassigned`; excluded from `byPlan`, `mrr`, `arr`. |
| `planExpiry` is `null`/absent | Treated as **no expiry** (lifetime). Counts as active; never in `expiring`/`expired`. |
| `planExpiry` in the past | Institute is in `expired`; **not** counted in `activeSubscriptions` or MRR/ARR. |
| Free plan (`price` 0/null) | Active → counted in `freeSubscriptions` and `activeSubscriptions`; `mrr`/`arr` contribution `0`. |
| Plan with `isActive: false` still assigned | Still counted (the institute is genuinely subscribed); optionally flag later. |
| Institute deleted/suspended | Suspended institutes: include but the frontend may dim them — keep them in the response. Deleted: exclude. |
| `expiringDays` ≤ 0 | Treat as `0` → `expiring` is empty. |

`mrr` and `arr` should be returned rounded to **2 decimal places** (or whole
NLe — confirm with the team; the dashboard's `currency()` helper rounds for
display either way).

## Sample response

```json
{
  "data": {
    "summary": {
      "mrr": 4583.33,
      "arr": 55000,
      "activeSubscriptions": 18,
      "paidSubscriptions": 11,
      "freeSubscriptions": 7,
      "expiringSoon": 3,
      "expired": 2,
      "unassigned": 4
    },
    "byPlan": [
      { "planId": "p1", "name": "free",    "displayName": "Free",    "price": 0,    "instituteCount": 7, "mrr": 0 },
      { "planId": "p2", "name": "standard","displayName": "Standard","price": 3000, "instituteCount": 8, "mrr": 2000 },
      { "planId": "p3", "name": "premium", "displayName": "Premium", "price": 9000, "instituteCount": 3, "mrr": 2250 }
    ],
    "expiring": [
      { "instituteId": "i9", "instituteName": "Hill View Academy", "planName": "Standard",
        "planExpiry": "2026-05-25T00:00:00.000Z", "daysUntilExpiry": 7 }
    ],
    "expired": [
      { "instituteId": "i4", "instituteName": "Sunrise School", "planName": "Premium",
        "planExpiry": "2026-05-02T00:00:00.000Z", "daysSinceExpiry": 16 }
    ]
  }
}
```

## How the dashboard will use each field

| Payload | Dashboard widget |
|---------|------------------|
| `summary.mrr` / `summary.arr` | KPI cards in a new "Subscription Revenue" row |
| `summary.activeSubscriptions` / `paid` / `free` / `unassigned` | KPI cards + a donut |
| `byPlan` | "Institutes per Plan" bar chart (replaces today's plan-catalogue-only card) |
| `expiring` | "Expiring Subscriptions" actionable list (soonest first) |
| `expired` | "Expired Subscriptions" actionable list |

## Error responses

Follow the existing backend convention:

- `401` — missing/invalid token.
- `403 { "message": "..." }` — token is not a super-admin.
- `500 { "message": "..." }` — unexpected failure.

## Performance note

Expect this to aggregate across all institutes. Prefer a single MongoDB
aggregation pipeline (`$lookup` institute → plan, `$group` by plan) over N+1
queries. The result is small and changes slowly — a short server-side cache
(e.g. 60s) is reasonable.

## Optional extension (not required for the first cut)

The same join already has each institute's plan limits and current usage
(`InstitutePlan.usage`). A future `nearLimit` array — institutes at ≥ 90% of
`maxStudents`/`maxLecturers`/`maxClasses` — would feed the planned
"Attention Required" panel and is cheap to add to this endpoint later.
```
