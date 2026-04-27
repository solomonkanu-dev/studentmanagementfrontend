/**
 * Seed script — creates subjects for each class to reach target totals:
 *   JSS 1: 9, JSS 2: 7, JSS 3: 5, SSS 1: 7, SSS 2: 9, SSS 3: 7
 * Usage: node scripts/seed-subjects.mjs
 */

const API_URL    = "http://localhost:5002/api/v1";
const ADMIN_EMAIL    = "caster@gmail.coom";
const ADMIN_PASSWORD = "king@232";

// Classes
const CLASSES = {
  "JSS 1": "69c314ec756d15f960e78078",
  "JSS 2": "69c78e4b0136980786ad48a9",
  "JSS 3": "69c78e5d0136980786ad48b5",
  "SSS 1": "69c78e680136980786ad48cd",
  "SSS 2": "69c78e740136980786ad48df",
  "SSS 3": "69c78e850136980786ad48f5",
};

// Lecturers (round-robin assigned)
const LECTURERS = [
  "69c3149e756d15f960e7806c",  // Mariama Bangura
  "69c384422c610860173d4994",  // Anakin Skywalker
  "69c78bbed53da6647b18a287",  // Alan Walker
  "69c78d920136980786ad481f",  // Henry Cavil
  "69c78e200136980786ad4874",  // Dwayne Johnson
];

// Target subjects per class — only subjects NOT already in that class will be created
const TARGET_SUBJECTS = {
  "JSS 1": [
    "Mathematics", "English Language", "Social Studies",
    "Integrated Science", "French", "Agricultural Science",
    "Computer Literacy", "Physical Education", "Religious & Moral Education",
  ],
  "JSS 2": [
    "English Language", "Mathematics", "Integrated Science",
    "Social Studies", "French", "Technical Drawing", "Home Economics",
  ],
  "JSS 3": [
    "Mathematics", "English Language", "Integrated Science",
    "Social Studies", "French",
  ],
  "SSS 1": [
    "Mathematics", "English Language", "Biology",
    "Chemistry", "Physics", "Economics", "Geography",
  ],
  "SSS 2": [
    "Mathematics", "English Language", "Biology",
    "Chemistry", "Physics", "Economics",
    "Geography", "History", "Agricultural Science",
  ],
  "SSS 3": [
    "Mathematics", "English Language", "Biology",
    "Chemistry", "Physics", "Literature in English", "Further Mathematics",
  ],
};

function pick(arr, i) { return arr[i % arr.length]; }

async function main() {
  // 1. Login
  console.log("🔐 Logging in…");
  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  if (!loginRes.ok) throw new Error(`Login failed: ${await loginRes.text()}`);
  const { token } = await loginRes.json();
  if (!token) throw new Error("No token in login response");
  console.log("✅ Logged in\n");

  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  // 2. Fetch existing subjects
  console.log("📚 Fetching existing subjects…");
  const subRes = await fetch(`${API_URL}/subject`, { headers });
  const existing = await subRes.json();
  // Build a set of "classId::SubjectName" already present
  const existingSet = new Set(
    (Array.isArray(existing) ? existing : []).map(
      (s) => `${s.class?._id ?? s.class}::${s.name.toLowerCase()}`
    )
  );
  console.log(`✅ Found ${existingSet.size} existing subject(s)\n`);

  // 3. Create missing subjects
  let created = 0;
  let skipped = 0;
  let failed  = 0;
  let lecIdx  = 0;

  for (const [className, classId] of Object.entries(CLASSES)) {
    const targets = TARGET_SUBJECTS[className];
    console.log(`📖 ${className} — targeting ${targets.length} subjects`);

    for (const name of targets) {
      const key = `${classId}::${name.toLowerCase()}`;
      if (existingSet.has(key)) {
        console.log(`   ⏭  Skipped (exists): ${name}`);
        skipped++;
        continue;
      }

      const lecturerId = pick(LECTURERS, lecIdx++);
      const payload    = { name, classId, lecturerId, totalMarks: 100 };

      try {
        const res = await fetch(`${API_URL}/subject/create-subject`, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          console.log(`   ✅ ${name}`);
          created++;
        } else {
          const err = await res.text();
          console.log(`   ❌ ${name}: ${res.status} — ${err}`);
          failed++;
        }
      } catch (e) {
        console.log(`   ❌ ${name}: ${e.message}`);
        failed++;
      }

      await new Promise((r) => setTimeout(r, 60));
    }
    console.log();
  }

  console.log("─".repeat(50));
  console.log(`✅ Created : ${created}`);
  console.log(`⏭  Skipped : ${skipped}`);
  if (failed) console.log(`❌ Failed  : ${failed}`);
  console.log("Done.");
}

main().catch((e) => { console.error("Fatal:", e.message); process.exit(1); });
