/**
 * Seed script — creates parents for the 120 students seeded in batch 3 (indices 180-299).
 * Distribution: 20 parents × 3 children, 15 parents × 2 children, 30 parents × 1 child = 120 students, 65 parents.
 * Usage: node scripts/seed-parents.mjs
 */

const API_URL = "http://localhost:5002/api/v1";
const ADMIN_EMAIL = "caster@gmail.coom";
const ADMIN_PASSWORD = "king@232";
const PARENT_PASSWORD = "Parent@2024";

// ── Data pools ────────────────────────────────────────────────────────────────

const MALE_FIRST = [
  "Foday", "Ibrahim", "Alimamy", "Brima", "Lansana", "Osman", "Alpha", "Chernor",
  "Gibrilla", "Issa", "Lahai", "Oumar", "Samuel", "Tamba", "Umaru", "Sulaiman",
  "Alhaji", "Hindolo", "Ishmael", "Rashid", "Vandi", "Mohamed", "Abdul", "Sorie",
  "Dauda", "Emmanuel", "George", "James", "Nathaniel", "Patrick",
];
const FEMALE_FIRST = [
  "Mariama", "Fatima", "Aminata", "Hawa", "Isatu", "Kadiatu", "Memunatu", "Salamatu",
  "Binta", "Hadijatu", "Jeneba", "Mabinty", "Naomi", "Ramatu", "Yawa", "Zainab",
  "Adama", "Sia", "Efua", "Oretha", "Priscilla", "Satta", "Umu", "Wokie",
  "Christiana", "Florence", "Hannah", "Juliet", "Kadijatu", "Mary",
];
const LAST_NAMES = [
  "Kamara", "Koroma", "Bangura", "Sesay", "Conteh",
  "Turay", "Mansaray", "Kanu", "Jalloh", "Fofanah",
  "Sankoh", "Barrie", "Dumbuya", "Kallon", "Lahai",
  "Musa", "Ndow", "Osei", "Pessima", "Quee",
];
const PHONES = ["076", "077", "078", "079", "030", "031", "032", "033"];
const ADDRESSES = [
  "12 Wilberforce St, Freetown", "45 Congo Cross, Freetown",
  "8 Murray Town Rd, Freetown", "23 Kissy Rd, Freetown",
  "67 Lumley Beach Rd, Freetown", "3 Hill Station, Freetown",
  "90 Circular Rd, Freetown", "15 Sanders St, Freetown",
  "7 Regent Rd, Freetown", "31 Spur Rd, Freetown",
];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function phone() {
  const prefix = pick(PHONES);
  const num = String(Math.floor(Math.random() * 9000000) + 1000000);
  return `+232 ${prefix} ${num}`;
}

function makeParent(idx, isMale) {
  const firstName = isMale ? MALE_FIRST[idx % MALE_FIRST.length] : FEMALE_FIRST[idx % FEMALE_FIRST.length];
  const lastName = pick(LAST_NAMES);
  const fullName = `${isMale ? "Mr" : "Mrs"} ${firstName} ${lastName}`;
  const slug = `${firstName}.${lastName}`.toLowerCase().replace(/\s+/g, "");
  return {
    fullName,
    email: `parent.${slug}${idx}@parent.school.edu`,
    password: PARENT_PASSWORD,
    phoneNumber: phone(),
    address: pick(ADDRESSES),
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  // 1. Login
  console.log("🔐 Logging in…");
  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  if (!loginRes.ok) throw new Error(`Login failed: ${await loginRes.text()}`);
  const loginData = await loginRes.json();
  const token = loginData.token ?? loginData.data?.token ?? loginData.accessToken;
  if (!token) throw new Error("No token: " + JSON.stringify(loginData));
  console.log("✅ Logged in\n");

  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  // 2. Fetch all students (paginate — backend caps at 100/page)
  console.log("📋 Fetching all students…");
  let allStudents = [];
  let pg = 1;
  while (true) {
    const res = await fetch(`${API_URL}/admin/students?page=${pg}&limit=100`, { headers });
    if (!res.ok) throw new Error(`Failed to fetch students (page ${pg})`);
    const d = await res.json();
    allStudents = allStudents.concat(d.data ?? []);
    if (pg >= (d.pagination?.pages ?? 1)) break;
    pg++;
  }
  console.log(`✅ Fetched ${allStudents.length} students total\n`);

  // 3. Filter to batch-3 students (email index 180–299)
  const batch3 = allStudents.filter((s) => {
    const m = s.email.match(/(\d+)@student\.school\.edu$/);
    if (!m) return false;
    const n = parseInt(m[1], 10);
    return n >= 180 && n <= 299;
  });
  console.log(`🎯 Batch-3 students identified: ${batch3.length}\n`);
  if (batch3.length === 0) throw new Error("No batch-3 students found. Check email pattern.");

  // Shuffle so children are mixed across classes
  batch3.sort(() => Math.random() - 0.5);

  // 4. Build family groups: 20×3 children, 15×2 children, 30×1 child = 120
  const groups = [];
  let cursor = 0;

  // 20 families of 3
  for (let i = 0; i < 20; i++) {
    groups.push(batch3.slice(cursor, cursor + 3).map((s) => s._id));
    cursor += 3;
  }
  // 15 families of 2
  for (let i = 0; i < 15; i++) {
    groups.push(batch3.slice(cursor, cursor + 2).map((s) => s._id));
    cursor += 2;
  }
  // 30 families of 1
  for (let i = 0; i < 30; i++) {
    groups.push([batch3[cursor]._id]);
    cursor += 1;
  }

  console.log(`👨‍👩‍👧 Family plan: ${groups.filter((g) => g.length === 3).length}×3 children, ` +
    `${groups.filter((g) => g.length === 2).length}×2 children, ` +
    `${groups.filter((g) => g.length === 1).length}×1 child\n`);

  // 5. Create parents
  let created = 0;
  let failed = 0;

  for (let i = 0; i < groups.length; i++) {
    const childIds = groups[i];
    const isMale = i % 2 === 0;
    const payload = { ...makeParent(i, isMale), linkedStudents: childIds };

    try {
      const res = await fetch(`${API_URL}/admin/parents`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const d = await res.json();
        const parent = d.data ?? d;
        const childCount = childIds.length;
        const icon = childCount === 3 ? "👨‍👩‍👧‍👦" : childCount === 2 ? "👨‍👩‍👦" : "👤";
        console.log(`${icon} [${childCount} child${childCount > 1 ? "ren" : ""}] ${payload.fullName} — ${payload.email}`);
        created++;
      } else {
        const err = await res.text();
        console.log(`   ❌ Failed for ${payload.fullName}: ${res.status} — ${err}`);
        failed++;
      }
    } catch (e) {
      console.log(`   ❌ Error for ${payload.fullName}: ${e.message}`);
      failed++;
    }

    await new Promise((r) => setTimeout(r, 80));
  }

  console.log("\n" + "─".repeat(50));
  console.log(`✅ Parents created: ${created}`);
  if (failed > 0) console.log(`❌ Failed: ${failed}`);
  console.log(`👶 Students covered: ${cursor}`);
  console.log("Done.");
}

main().catch((e) => { console.error("Fatal:", e.message); process.exit(1); });
