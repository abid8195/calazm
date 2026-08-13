// Tests for store-readiness features: PWA assets, privacy, export, deletion, admin gating, ads gating.
const base = "http://localhost:3000";
let cookie = "";
let failures = 0;

function check(name, cond, detail) {
  if (cond) console.log(`PASS  ${name}`);
  else { failures++; console.log(`FAIL  ${name} :: ${JSON.stringify(detail).slice(0, 300)}`); }
}

async function call(method, path, body) {
  const headers = { cookie };
  let payload;
  if (body) { headers["content-type"] = "application/json"; payload = JSON.stringify(body); }
  const res = await fetch(base + path, { method, headers, body: payload });
  const sc = res.headers.get("set-cookie");
  if (sc) cookie = sc.split(";")[0];
  let data = null;
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("json")) { try { data = await res.json(); } catch {} }
  else data = await res.text();
  return { status: res.status, data, headers: res.headers };
}

// PWA assets
let r = await call("GET", "/manifest.webmanifest");
check("manifest served", r.status === 200 && (typeof r.data === "string" ? r.data.includes("Calazm") : r.data.name?.includes("Calazm")), r.status);
r = await call("GET", "/sw.js");
check("service worker served", r.status === 200 && String(r.data).includes("calazm-v1"), r.status);
r = await call("GET", "/icons/icon.svg");
check("PWA icon served", r.status === 200, r.status);

// privacy page
r = await call("GET", "/privacy");
check("privacy policy page", r.status === 200 && String(r.data).includes("Privacy Policy"), r.status);

// user for export/delete
const email = `store${Date.now()}@calazm.dev`;
r = await call("POST", "/api/auth/signup", { email, password: "password123" });
check("signup", r.status === 200, r);
await call("PATCH", "/api/profile", { goal: "maintain", age: 25, heightCm: 170, weightKg: 70, activityLevel: "light", paceKgPerWeek: 0.25, onboarded: true });
const a = await call("POST", "/api/meals/analyze-text", { text: "a banana" });
await call("POST", "/api/meals", { items: a.data.items, source: "text" });

// export
r = await call("GET", "/api/export");
check("data export includes user + meals", r.status === 200 && r.data.user?.email === email && r.data.meals?.length === 1, { status: r.status });
check("export omits password hash", r.data.user?.passwordHash === undefined, r.data.user);
check("export is a download", (r.headers.get("content-disposition") ?? "").includes("calazm-export"), r.headers.get("content-disposition"));

// admin gating: normal user rejected
r = await call("GET", "/api/admin/metrics");
check("admin blocked for normal user", r.status === 403, r.status);

// account deletion
r = await call("DELETE", "/api/account");
check("account deletion", r.status === 200, r);
r = await call("POST", "/api/auth/login", { email, password: "password123" });
check("deleted account cannot log in", r.status === 401 || r.status === 429, r.status);

// admin access with ADMIN_EMAIL account
cookie = "";
const adminEmail = process.env.TEST_ADMIN_EMAIL ?? "abidussobhan@gmail.com";
r = await call("POST", "/api/auth/login", { email: adminEmail, password: "admin-test-123" });
if (r.status !== 200) r = await call("POST", "/api/auth/signup", { email: adminEmail, password: "admin-test-123" });
if (r.status === 200) {
  r = await call("GET", "/api/admin/metrics");
  check("admin metrics for ADMIN_EMAIL", r.status === 200 && typeof r.data.totalUsers === "number" && typeof r.data.mrr === "number", r);
  if (r.status === 200) console.log(`      metrics: users=${r.data.totalUsers} plus=${r.data.plusSubs} mrr=$${r.data.mrr} scans=${r.data.scansThisMonth} aiCost=$${r.data.estAiCost}`);
} else {
  check("admin metrics for ADMIN_EMAIL", false, r);
}

console.log(failures === 0 ? "\nALL STORE-PREP TESTS PASSED" : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
