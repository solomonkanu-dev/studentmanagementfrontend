/**
 * API load & stress test — logs in per role, runs autocannon against
 * representative endpoints for each role, then runs a spike scenario.
 *
 * Usage:
 *   node scripts/perf-test.mjs [--role admin|lecturer|student|parent|super-admin|all] [--spike]
 *
 * Env vars (all optional):
 *   PERF_API_URL          default: http://localhost:5002/api/v1
 *   PERF_CONNECTIONS      concurrent connections per endpoint  (default: 10)
 *   PERF_DURATION         seconds per endpoint                 (default: 10)
 *   PERF_SPIKE_CONNECTIONS connections for the spike scenario  (default: 100)
 *   PERF_SPIKE_DURATION   seconds for the spike scenario       (default: 20)
 *
 *   Per-role credentials (override the defaults below):
 *   PERF_ADMIN_EMAIL / PERF_ADMIN_PASSWORD
 *   PERF_LECTURER_EMAIL / PERF_LECTURER_PASSWORD
 *   PERF_STUDENT_EMAIL / PERF_STUDENT_PASSWORD
 *   PERF_PARENT_EMAIL / PERF_PARENT_PASSWORD
 *   PERF_SUPER_ADMIN_EMAIL / PERF_SUPER_ADMIN_PASSWORD
 *
 * Examples:
 *   node scripts/perf-test.mjs
 *   node scripts/perf-test.mjs --role student
 *   node scripts/perf-test.mjs --spike
 *   PERF_CONNECTIONS=50 PERF_DURATION=30 node scripts/perf-test.mjs --role admin
 */

import autocannon from "autocannon";

// ─── Config ───────────────────────────────────────────────────────────────────

const API_URL          = process.env.PERF_API_URL          || "http://localhost:5002/api/v1";
const CONNECTIONS      = Number(process.env.PERF_CONNECTIONS      || 10);
const DURATION         = Number(process.env.PERF_DURATION         || 10);
const SPIKE_CONNS      = Number(process.env.PERF_SPIKE_CONNECTIONS || 100);
const SPIKE_DURATION   = Number(process.env.PERF_SPIKE_DURATION    || 20);
const SUITE_DELAY      = Number(process.env.PERF_SUITE_DELAY       || 5000);

const CREDENTIALS = {
  admin: {
    email:    process.env.PERF_ADMIN_EMAIL    || "caster@gmail.coom",
    password: process.env.PERF_ADMIN_PASSWORD || "king@232",
    loginPath: "/auth/login",
  },
  lecturer: {
    email:    process.env.PERF_LECTURER_EMAIL    || "lecturer@example.com",
    password: process.env.PERF_LECTURER_PASSWORD || "password",
    loginPath: "/auth/login",
  },
  student: {
    email:    process.env.PERF_STUDENT_EMAIL    || "student@example.com",
    password: process.env.PERF_STUDENT_PASSWORD || "password",
    loginPath: "/auth/login",
  },
  parent: {
    email:    process.env.PERF_PARENT_EMAIL    || "parent@example.com",
    password: process.env.PERF_PARENT_PASSWORD || "password",
    loginPath: "/auth/login",
  },
  "super-admin": {
    email:    process.env.PERF_SUPER_ADMIN_EMAIL    || "superadmin@example.com",
    password: process.env.PERF_SUPER_ADMIN_PASSWORD || "password",
    loginPath: "/super-admin/super-admin/login",
  },
};

// ─── Endpoints per role ───────────────────────────────────────────────────────

const SUITES = {
  admin: [
    // Core listing endpoints (most-hit in the UI)
    { name: "GET /admin/students",             path: "/admin/students" },
    { name: "GET /admin/parents",              path: "/admin/parents" },
    { name: "GET /admin/lecturers",            path: "/admin/lecturers" },
    { name: "GET /admin/classes",              path: "/admin/classes" },
    { name: "GET /class/admin",               path: "/class/admin" },
    { name: "GET /admin/my-institute",         path: "/admin/my-institute" },
    { name: "GET /admin/modules/me",           path: "/admin/modules/me" },
    // Academic
    { name: "GET /subject",                   path: "/subject" },
    { name: "GET /fees-structure",            path: "/fees-structure" },
    { name: "GET /announcements",             path: "/announcements" },
    { name: "GET /timetable",                 path: "/timetable" },
    // Notifications
    { name: "GET /notifications",             path: "/notifications" },
    { name: "GET /notifications/unread-count",path: "/notifications/unread-count" },
    // Attendance — paths filled in at runtime with a real classId (see bootstrapAdminSuite)
    { name: "GET /attendance/students",       path: "/attendance/students" },
    { name: "GET /attendance/report/class",   path: "/attendance/report/class" },
  ],

  lecturer: [
    { name: "GET /lecturer/my-classes",       path: "/lecturer/my-classes" },
    { name: "GET /class/institute",           path: "/class/institute" },
    { name: "GET /subject/lecturer",          path: "/subject/lecturer" },
    { name: "GET /attendance/get-attendance", path: "/attendance/get-attendance" },
    { name: "GET /attendance/summary/me",     path: "/attendance/summary/me" },
    { name: "GET /assignment/mine",           path: "/assignment/mine" },
    { name: "GET /timetable",                 path: "/timetable" },
    { name: "GET /announcements",             path: "/announcements" },
    { name: "GET /notifications",             path: "/notifications" },
    { name: "GET /notifications/unread-count",path: "/notifications/unread-count" },
  ],

  student: [
    { name: "GET /student/my-fees",           path: "/student/my-fees" },
    { name: "GET /student/my-results",        path: "/student/my-results" },
    { name: "GET /student/my-report-card",    path: "/student/my-report-card" },
    { name: "GET /student/my-ranking",        path: "/student/my-ranking" },
    { name: "GET /student/my-payments",       path: "/student/my-payments" },
    { name: "GET /student/my-promotion-history", path: "/student/my-promotion-history" },
    { name: "GET /submission/me",             path: "/submission/me" },
    { name: "GET /subject/student",           path: "/subject/student" },
    { name: "GET /class/student",             path: "/class/student" },
    { name: "GET /timetable",                 path: "/timetable" },
    { name: "GET /announcements",             path: "/announcements" },
    { name: "GET /notifications",             path: "/notifications" },
    { name: "GET /notifications/unread-count",path: "/notifications/unread-count" },
    { name: "GET /account/active",            path: "/account/active" },
  ],

  parent: [
    { name: "GET /parent/my-children",        path: "/parent/my-children" },
    { name: "GET /announcements",             path: "/announcements" },
    { name: "GET /notifications",             path: "/notifications" },
    { name: "GET /notifications/unread-count",path: "/notifications/unread-count" },
  ],

  "super-admin": [
    { name: "GET /super-admin/stats",         path: "/super-admin/stats" },
    { name: "GET /super-admin/admins",        path: "/super-admin/admins" },
    { name: "GET /super-admin/pending-admins",path: "/super-admin/pending-admins" },
  ],
};

// The spike test hammers the most-critical cross-role read endpoint
const SPIKE_ENDPOINT = { name: "GET /admin/students (spike)", path: "/admin/students" };

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Fetch the first available classId so attendance endpoints get a valid param.
async function fetchFirstClassId(token) {
  try {
    const res = await fetch(`${API_URL}/admin/classes?limit=1`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const body = await res.json();
    const classes = body.data ?? body;
    return Array.isArray(classes) && classes.length ? classes[0]._id : null;
  } catch {
    return null;
  }
}

// Patch attendance endpoint paths with a real classId before the suite runs.
async function bootstrapAdminSuite(token) {
  const classId = await fetchFirstClassId(token);
  if (!classId) {
    console.warn("  ⚠ Could not resolve a classId — attendance endpoints will be skipped.");
    return;
  }
  const suite = SUITES.admin;
  for (const ep of suite) {
    if (ep.name === "GET /attendance/students")
      ep.path = `/attendance/students?classId=${classId}`;
    if (ep.name === "GET /attendance/report/class")
      ep.path = `/attendance/report/class?classId=${classId}`;
  }
  console.log(`  ✓ Resolved classId ${classId} for attendance endpoints.`);
}

async function login(role) {
  const { email, password, loginPath } = CREDENTIALS[role];
  const res = await fetch(`${API_URL}${loginPath}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Login failed for ${role} (${res.status}): ${text}`);
  const data = JSON.parse(text);
  if (!data.token) throw new Error(`No token in login response for ${role}: ${text}`);
  return data.token;
}

function runOne(ep, token, connections, duration) {
  return new Promise((resolve, reject) => {
    const instance = autocannon(
      {
        url: `${API_URL}${ep.path}`,
        connections,
        duration,
        headers: { Authorization: `Bearer ${token}` },
        title: ep.name,
      },
      (err, result) => {
        if (err) return reject(err);
        resolve(result);
      }
    );
    autocannon.track(instance, { renderProgressBar: true, renderResultsTable: false });
  });
}

function formatRow(ep, r) {
  return {
    endpoint:   ep.name,
    "req/s":    Math.round(r.requests.average),
    "p50 (ms)": r.latency.p50,
    "p97_5 (ms)": r.latency.p97_5,
    "p99 (ms)": r.latency.p99,
    "max (ms)": r.latency.max,
    "non-2xx":  (r["non2xx"] ?? 0) + (r.errors ?? 0),
    total:      r.requests.total,
  };
}

function printBanner(text) {
  const line = "─".repeat(text.length + 4);
  console.log(`\n┌${line}┐`);
  console.log(`│  ${text}  │`);
  console.log(`└${line}┘\n`);
}

// ─── Suite runner ─────────────────────────────────────────────────────────────

async function runSuite(role, token) {
  const endpoints = SUITES[role];
  printBanner(`${role.toUpperCase()} SUITE — ${endpoints.length} endpoints, ${CONNECTIONS} conn × ${DURATION}s`);

  const rows = [];
  for (const ep of endpoints) {
    console.log(`\n→ ${ep.name}`);
    try {
      const r = await runOne(ep, token, CONNECTIONS, DURATION);
      rows.push(formatRow(ep, r));
    } catch (err) {
      console.warn(`  ⚠ skipped (${err.message})`);
      rows.push({ endpoint: ep.name, "req/s": "ERR", "p50 (ms)": "-", "p97_5 (ms)": "-", "p99 (ms)": "-", "max (ms)": "-", "non-2xx": "-", total: 0 });
    }
  }
  return rows;
}

// ─── Spike runner ─────────────────────────────────────────────────────────────

async function runSpike(token) {
  printBanner(`SPIKE TEST — ${SPIKE_CONNS} connections × ${SPIKE_DURATION}s on ${SPIKE_ENDPOINT.path}`);
  console.log("Simulating a sudden surge of concurrent users hitting the busiest read endpoint.\n");
  const r = await runOne(SPIKE_ENDPOINT, token, SPIKE_CONNS, SPIKE_DURATION);
  console.log("\nSpike result:");
  console.table([formatRow(SPIKE_ENDPOINT, r)]);

  const errorRate = ((r["non2xx"] ?? 0) + (r.errors ?? 0)) / Math.max(r.requests.total, 1);
  if (errorRate > 0.01) {
    console.warn(`\n⚠  Error rate ${(errorRate * 100).toFixed(1)}% — server may be struggling under load.`);
  } else {
    console.log(`\n✓  Error rate ${(errorRate * 100).toFixed(2)}% — server held up under spike.`);
  }
  return [formatRow(SPIKE_ENDPOINT, r)];
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args      = process.argv.slice(2);
  const roleArg   = args[args.indexOf("--role") + 1];
  const doSpike   = args.includes("--spike");
  const doAll     = !roleArg && !doSpike;

  const rolesToRun = roleArg
    ? [roleArg]
    : doAll
    ? Object.keys(SUITES)
    : [];

  if (roleArg && !SUITES[roleArg]) {
    console.error(`Unknown role "${roleArg}". Valid: ${Object.keys(SUITES).join(", ")}`);
    process.exit(1);
  }

  console.log(`\nAPI: ${API_URL}`);
  console.log(`Load: ${CONNECTIONS} connections × ${DURATION}s per endpoint`);
  if (doSpike) console.log(`Spike: ${SPIKE_CONNS} connections × ${SPIKE_DURATION}s`);
  if (rolesToRun.length > 1) console.log(`Suite delay: ${SUITE_DELAY / 1000}s between roles (rate-limiter cooldown)`);

  const allRows = {};

  // Run per-role suites
  for (const role of rolesToRun) {
    console.log(`\n→ Logging in as ${role} (${CREDENTIALS[role].email})…`);
    let token;
    try {
      token = await login(role);
      console.log("  ✓ Logged in.");
    } catch (err) {
      console.warn(`  ⚠ Skipping ${role} suite: ${err.message}`);
      continue;
    }
    if (role === "admin") await bootstrapAdminSuite(token);
    allRows[role] = await runSuite(role, token);
    if (role !== rolesToRun[rolesToRun.length - 1]) {
      console.log(`\n  Waiting ${SUITE_DELAY / 1000}s before next suite (rate-limiter cooldown)…`);
      await new Promise((r) => setTimeout(r, SUITE_DELAY));
    }
  }

  // Run spike test (uses admin token)
  if (doSpike || doAll) {
    console.log(`\n→ Logging in as admin for spike test…`);
    try {
      const token = await login("admin");
      console.log("  ✓ Logged in.");
      allRows["spike"] = await runSpike(token);
    } catch (err) {
      console.warn(`  ⚠ Spike test skipped: ${err.message}`);
    }
  }

  // Final consolidated summary
  printBanner("FULL SUMMARY");
  for (const [label, rows] of Object.entries(allRows)) {
    console.log(`\n[ ${label} ]`);
    console.table(rows);
  }
}

main().catch((e) => {
  console.error("\n✗ Perf test failed:", e.message);
  process.exit(1);
});
