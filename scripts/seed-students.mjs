/**
 * Seed script — creates 60 dummy students split evenly across all classes.
 * Usage: node scripts/seed-students.mjs
 */

const API_URL = "http://localhost:5002/api/v1";
const ADMIN_EMAIL = "caster@gmail.coom";
const ADMIN_PASSWORD = "king@232";
const STUDENTS_PER_CLASS = 20;

// ── Dummy data pools ──────────────────────────────────────────────────────────

const FIRST_NAMES = [
  "Aisha", "Mohamed", "Fatima", "Ibrahim", "Mariama",
  "Abdul", "Aminata", "Sorie", "Hawa", "Foday",
  "Isatu", "Alimamy", "Adama", "Sia", "Brima",
  "Kadiatu", "Lansana", "Memunatu", "Osman", "Salamatu",
  "Alpha", "Binta", "Chernor", "Damba", "Efua",
  "Gibrilla", "Hadijatu", "Issa", "Jeneba", "Kemi",
  "Lahai", "Mabinty", "Naomi", "Oumar", "Pita",
  "Ramatu", "Samuel", "Tamba", "Umaru", "Victoire",
  "Wusu", "Yawa", "Zainab", "Abass", "Bockarie",
  "Christiana", "David", "Emmanuel", "Florence", "George",
  "Hannah", "James", "Kadijatu", "Lamin", "Mary",
  "Nathaniel", "Olivia", "Patrick", "Queen", "Richard",
  "Santigie", "Tenneh", "Unisa", "Veronica", "William",
  "Xanthe", "Yankuba", "Zara", "Amara", "Bintu",
  "Coker", "Dauda", "Esther", "Fanta", "Gibril",
  "Haja", "Idrissa", "Jestina", "Komba", "Luseni",
  "Musa", "Nanah", "Oretha", "Pheone", "Rugiatu",
  "Sulaiman", "Tity", "Usman", "Violet", "Wurie",
  "Xenon", "Yusufu", "Zeze", "Alhaji", "Beah",
  "Corine", "Dansoh", "Edna", "Finda", "Gundo",
  "Hindolo", "Ishmael", "Juliet", "Kenei", "Logus",
  "Massa", "Ngolo", "Obai", "Priscilla", "Rashid",
  "Satta", "Torto", "Umu", "Vandi", "Wokie",
];

const LAST_NAMES = [
  "Kamara", "Koroma", "Bangura", "Sesay", "Conteh",
  "Turay", "Mansaray", "Kanu", "Jalloh", "Fofanah",
  "Sankoh", "Barrie", "Dumbuya", "Kallon", "Lahai",
  "Musa", "Ndow", "Osei", "Pessima", "Quee",
];

const GENDERS = ["male", "female"];
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const RELIGIONS = ["Islam", "Christianity"];
const ADDRESSES = [
  "12 Wilberforce St, Freetown",
  "45 Congo Cross, Freetown",
  "8 Murray Town Rd, Freetown",
  "23 Kissy Rd, Freetown",
  "67 Lumley Beach Rd, Freetown",
  "3 Hill Station, Freetown",
  "90 Circular Rd, Freetown",
  "15 Sanders St, Freetown",
  "7 Regent Rd, Freetown",
  "31 Spur Rd, Freetown",
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDOB() {
  // Age roughly 10–18
  const year = 2007 + Math.floor(Math.random() * 8); // 2007–2014
  const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, "0");
  const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function randomPhone() {
  const prefix = pick(["076", "077", "078", "079", "030", "031", "032", "033"]);
  const suffix = String(Math.floor(Math.random() * 9000000) + 1000000);
  return `+232 ${prefix} ${suffix}`;
}

function makeStudent(index, classId, className) {
  const firstName = FIRST_NAMES[index % FIRST_NAMES.length];
  const lastName = pick(LAST_NAMES);
  const fullName = `${firstName} ${lastName}`;
  const slug = fullName.toLowerCase().replace(/\s+/g, ".") + index;
  const email = `${slug}@student.school.edu`;
  const regNum = `STU-${String(index + 1).padStart(4, "0")}`;
  const classSlug = className.replace(/\s+/g, "").toUpperCase().slice(0, 3);

  return {
    fullName,
    email,
    classId,
    studentProfile: {
      registrationNumber: `${classSlug}-${regNum}`,
      dateOfBirth: randomDOB(),
      dateOfAdmission: "2024-09-01",
      gender: pick(GENDERS),
      bloodGroup: pick(BLOOD_GROUPS),
      religion: pick(RELIGIONS),
      mobileNumber: randomPhone(),
      address: pick(ADDRESSES),
      guardian: {
        guardianName: `${pick(LAST_NAMES)} ${pick(LAST_NAMES)}`,
        guardianPhone: randomPhone(),
        guardianRelationship: pick(["Father", "Mother", "Uncle", "Aunt", "Guardian"]),
        guardianOccupation: pick(["Teacher", "Trader", "Driver", "Nurse", "Engineer", "Farmer"]),
      },
    },
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
  if (!loginRes.ok) {
    const err = await loginRes.text();
    throw new Error(`Login failed (${loginRes.status}): ${err}`);
  }
  const loginData = await loginRes.json();
  const token = loginData.token ?? loginData.data?.token ?? loginData.accessToken;
  if (!token) throw new Error("No token in login response: " + JSON.stringify(loginData));
  console.log("✅ Logged in\n");

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  // 2. Fetch classes
  console.log("📚 Fetching classes…");
  const classRes = await fetch(`${API_URL}/class`, { headers });
  if (!classRes.ok) throw new Error(`Failed to fetch classes (${classRes.status})`);
  const classData = await classRes.json();
  const classes = classData.data ?? classData;
  if (!Array.isArray(classes) || classes.length === 0) {
    throw new Error("No classes found. Create some classes first.");
  }
  console.log(`✅ Found ${classes.length} class(es):`);
  classes.forEach((c) => console.log(`   • ${c.name} (${c._id})`));
  console.log();

  // 3. Create students
  let globalIndex = 180; // offset past the first 180 already seeded
  let created = 0;
  let failed = 0;

  for (const cls of classes) {
    console.log(`👥 Creating ${STUDENTS_PER_CLASS} students for "${cls.name}"…`);

    for (let i = 0; i < STUDENTS_PER_CLASS; i++) {
      const payload = makeStudent(globalIndex, cls._id, cls.name);
      globalIndex++;

      try {
        const res = await fetch(`${API_URL}/admin/create-student`, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const d = await res.json();
          const name = (d.data ?? d).fullName ?? payload.fullName;
          console.log(`   ✅ ${name} — ${payload.email}`);
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

      // Small delay to avoid overwhelming the server
      await new Promise((r) => setTimeout(r, 100));
    }
    console.log();
  }

  console.log("─".repeat(50));
  console.log(`✅ Created: ${created}`);
  if (failed > 0) console.log(`❌ Failed:  ${failed}`);
  console.log("Done.");
}

main().catch((e) => {
  console.error("Fatal:", e.message);
  process.exit(1);
});
